// Puente con el escritorio. Es el ÚNICO módulo que importa @tauri-apps/*.
// Fuera de Tauri (navegador) ofrece una simulación para poder desarrollar y verificar el frontend.
import { invoke } from '@tauri-apps/api/core';
import { emitTo, listen } from '@tauri-apps/api/event';
import { currentMonitor, cursorPosition, getCurrentWindow, PhysicalPosition } from '@tauri-apps/api/window';
import { load, type Store } from '@tauri-apps/plugin-store';

export interface Point {
  x: number;
  y: number;
}

export interface Rect extends Point {
  width: number;
  height: number;
}

/** Órdenes que llegan desde la bandeja del sistema (ver src-tauri/src/lib.rs). */
export type PetCommand = 'feed' | 'come' | 'pets' | 'quit';

/** Lo que la ventana del perro le pide a la de la cama (ver src/bedWindow.ts). */
export interface BedOrder {
  /** Número de orden: la ventana de la cama lo devuelve cuando ya la ha cumplido. */
  serial: number;
  visible: boolean;
  /** Sin animación: para relevar a la cama que se dibuja en la ventana del perro, o al revés. */
  instant: boolean;
}

const MAIN_WINDOW = 'main';
const BED_WINDOW = 'bed';
const BED_ORDER_EVENT = 'bed-order';
const BED_DONE_EVENT = 'bed-done';
const BED_READY_EVENT = 'bed-ready';
// Si la ventana de la cama no contesta en este tiempo se sigue sin ella.
const BED_TIMEOUT_MS = 1000;

export interface Desktop {
  /** true dentro de la app real, false en el navegador. */
  readonly native: boolean;
  show(): Promise<void>;
  /** Con `true`, los clics atraviesan la ventana hacia lo que haya debajo. */
  setClickThrough(on: boolean): Promise<void>;
  /** Cursor en píxeles CSS relativos a la ventana. Funciona aunque la ventana ignore el ratón. */
  cursor(): Promise<Point>;
  /** Cursor en píxeles físicos de escritorio. */
  cursorOnScreen(): Promise<Point>;
  /** Posición de la ventana en píxeles físicos de escritorio. */
  windowPosition(): Promise<Point>;
  moveWindow(position: Point): Promise<void>;
  /** Tamaño de la ventana en píxeles físicos. */
  windowSize(): Point;
  /** Zona útil del monitor actual (sin la barra de tareas), en píxeles físicos. */
  workArea(): Promise<Rect>;
  /**
   * Saca la cama al escritorio en su propia ventana, que no se mueve mientras se lleva al perro.
   * `position` es la de esa ventana, igual de grande que la del perro. Termina cuando ya está dibujada.
   */
  showBed(position: Point, instant: boolean): Promise<void>;
  /** Retira la cama del escritorio. Termina cuando ya no se ve. */
  hideBed(instant: boolean): Promise<void>;
  loadState<T>(key: string): Promise<T | undefined>;
  saveState(key: string, value: unknown): Promise<void>;
  onCommand(handler: (command: PetCommand) => void): void;
  quit(): Promise<void>;
}

class TauriDesktop implements Desktop {
  readonly native = true;
  private readonly window = getCurrentWindow();
  private origin: Point | null = null;
  private store: Store | null = null;
  private bedSerial = 0;
  private lastBedOrder: BedOrder | null = null;
  private readonly bedWaiters = new Map<number, () => void>();

  constructor() {
    void this.window.onMoved(({ payload }) => {
      this.origin = { x: payload.x, y: payload.y };
    });
    void listen<number>(BED_DONE_EVENT, ({ payload }) => {
      // Una orden posterior ya cumplida da por cumplidas las anteriores.
      for (const [serial, done] of [...this.bedWaiters]) {
        if (serial <= payload) done();
      }
    });
    // Si la ventana de la cama se carga tarde (o se recarga), se le repite la última orden.
    void listen(BED_READY_EVENT, () => {
      if (this.lastBedOrder) void emitTo(BED_WINDOW, BED_ORDER_EVENT, this.lastBedOrder);
    });
  }

  show(): Promise<void> {
    return this.window.show();
  }

  setClickThrough(on: boolean): Promise<void> {
    return this.window.setIgnoreCursorEvents(on);
  }

  async cursor(): Promise<Point> {
    const [cursor, origin] = await Promise.all([cursorPosition(), this.windowPosition()]);
    return {
      x: (cursor.x - origin.x) / window.devicePixelRatio,
      y: (cursor.y - origin.y) / window.devicePixelRatio,
    };
  }

  async cursorOnScreen(): Promise<Point> {
    const cursor = await cursorPosition();
    return { x: cursor.x, y: cursor.y };
  }

  async windowPosition(): Promise<Point> {
    if (!this.origin) {
      const position = await this.window.innerPosition();
      this.origin = { x: position.x, y: position.y };
    }
    return this.origin;
  }

  async moveWindow(position: Point): Promise<void> {
    const x = Math.round(position.x);
    const y = Math.round(position.y);
    this.origin = { x, y };
    await this.window.setPosition(new PhysicalPosition(x, y));
  }

  windowSize(): Point {
    return {
      x: Math.round(window.innerWidth * window.devicePixelRatio),
      y: Math.round(window.innerHeight * window.devicePixelRatio),
    };
  }

  async workArea(): Promise<Rect> {
    const monitor = await currentMonitor();
    if (!monitor) {
      return { x: 0, y: 0, width: screen.availWidth, height: screen.availHeight };
    }
    const area = monitor.workArea ?? monitor;
    return { x: area.position.x, y: area.position.y, width: area.size.width, height: area.size.height };
  }

  async showBed(position: Point, instant: boolean): Promise<void> {
    const serial = ++this.bedSerial;
    // La muestra el lado nativo: sin activarla y justo debajo de esta ventana (ver src-tauri/src/lib.rs).
    await invoke('place_bed', { x: Math.round(position.x), y: Math.round(position.y) });
    await this.orderBed({ serial, visible: true, instant });
  }

  async hideBed(instant: boolean): Promise<void> {
    const serial = ++this.bedSerial;
    await this.orderBed({ serial, visible: false, instant });
    // Si mientras tanto se ha vuelto a pedir la cama, su ventana tiene que seguir a la vista.
    if (serial === this.bedSerial) await invoke('stow_bed');
  }

  /** Envía una orden a la ventana de la cama y espera a que la cumpla. */
  private async orderBed(order: BedOrder): Promise<void> {
    this.lastBedOrder = order;
    const done = new Promise<void>((resolve) => {
      const finish = (): void => {
        this.bedWaiters.delete(order.serial);
        resolve();
      };
      this.bedWaiters.set(order.serial, finish);
      window.setTimeout(finish, BED_TIMEOUT_MS);
    });
    await emitTo(BED_WINDOW, BED_ORDER_EVENT, order);
    await done;
  }

  private async openStore(): Promise<Store> {
    this.store ??= await load('pet.json');
    return this.store;
  }

  async loadState<T>(key: string): Promise<T | undefined> {
    return (await this.openStore()).get<T>(key);
  }

  async saveState(key: string, value: unknown): Promise<void> {
    const store = await this.openStore();
    await store.set(key, value);
    await store.save();
  }

  onCommand(handler: (command: PetCommand) => void): void {
    void listen<PetCommand>('pet-command', (event) => handler(event.payload));
  }

  quit(): Promise<void> {
    return invoke('quit_app');
  }
}

/** Simulación para el navegador: el cursor sale de los eventos del ratón y el estado va a localStorage. */
class BrowserDesktop implements Desktop {
  readonly native = false;
  private pointer: Point = { x: -1, y: -1 };
  private screenPointer: Point = { x: 0, y: 0 };
  private position: Point = { x: 0, y: 0 };

  constructor() {
    document.body.classList.add('browser');
    window.addEventListener('pointermove', (event) => {
      this.pointer = { x: event.clientX, y: event.clientY };
      this.screenPointer = { x: event.screenX, y: event.screenY };
    });
    document.addEventListener('pointerleave', () => {
      this.pointer = { x: -1, y: -1 };
    });
  }

  async show(): Promise<void> {}

  async setClickThrough(on: boolean): Promise<void> {
    document.body.dataset.clickThrough = String(on);
  }

  async cursor(): Promise<Point> {
    return this.pointer;
  }

  async cursorOnScreen(): Promise<Point> {
    return this.screenPointer;
  }

  async windowPosition(): Promise<Point> {
    return this.position;
  }

  async moveWindow(position: Point): Promise<void> {
    this.position = { x: Math.round(position.x), y: Math.round(position.y) };
  }

  windowSize(): Point {
    return { x: window.innerWidth, y: window.innerHeight };
  }

  async workArea(): Promise<Rect> {
    // Un escritorio ficticio tres veces más ancho que la ventana, para poder probar el paseo.
    return { x: 0, y: 0, width: window.innerWidth * 3, height: window.innerHeight };
  }

  // En el navegador no hay segunda ventana: la cama solo se ve cuando el perro está dentro.
  async showBed(): Promise<void> {}

  async hideBed(): Promise<void> {}

  async loadState<T>(key: string): Promise<T | undefined> {
    try {
      const raw = localStorage.getItem(`desktopfriend:${key}`);
      return raw === null ? undefined : (JSON.parse(raw) as T);
    } catch {
      return undefined;
    }
  }

  async saveState(key: string, value: unknown): Promise<void> {
    try {
      localStorage.setItem(`desktopfriend:${key}`, JSON.stringify(value));
    } catch {
      // Sin almacenamiento (ventana privada): la mascota simplemente no recuerda.
    }
  }

  onCommand(handler: (command: PetCommand) => void): void {
    // En el navegador las órdenes de la bandeja se simulan con el teclado.
    window.addEventListener('keydown', (event) => {
      if (event.key === 'f') handler('feed');
      if (event.key === 'c') handler('come');
      if (event.key === 'm') handler('pets');
    });
  }

  async quit(): Promise<void> {}
}

/**
 * El otro extremo de `showBed` y `hideBed`, para la ventana de la cama: recibe las órdenes y
 * devuelve la función con la que avisar de que una ya está cumplida. Fuera de Tauri no llega ninguna.
 */
export function onBedOrder(handler: (order: BedOrder) => void): (serial: number) => void {
  if (!('__TAURI_INTERNALS__' in window)) return () => {};
  void listen<BedOrder>(BED_ORDER_EVENT, ({ payload }) => handler(payload)).then(() =>
    emitTo(MAIN_WINDOW, BED_READY_EVENT),
  );
  return (serial) => void emitTo(MAIN_WINDOW, BED_DONE_EVENT, serial);
}

export function createDesktop(): Desktop {
  return '__TAURI_INTERNALS__' in window ? new TauriDesktop() : new BrowserDesktop();
}
