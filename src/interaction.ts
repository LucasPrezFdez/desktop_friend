import type { ClickThrough } from './clickThrough';
import type { Desktop, Point } from './desktop';

export interface InteractionHandlers {
  /** El cursor ha frotado al perro `pixels` píxeles sin pulsar ningún botón, y está en `point`. */
  onStroke(pixels: number, point: Point): void;
  onClick(): void;
  onGrab(): void;
  /** Posición a la que hay que llevar la ventana mientras se arrastra al perro (píxeles físicos). */
  onDrag(windowPosition: Point): void;
  onDrop(): void;
}

const DRAG_THRESHOLD = 6;
// Cada cuántos píxeles frotados se avisa de una caricia.
const STROKE_STEP = 24;
// Si el cursor se para más de esto, la caricia se da por terminada.
const STROKE_PAUSE_MS = 250;

/**
 * Traduce el ratón en gestos sobre la mascota:
 * frotar sin pulsar es acariciar, pulsar y mover es cogerla, y un clic abre el panel.
 */
export class Interaction {
  private pressedAt: Point | null = null;
  private dragging = false;
  private grabOffset: Point | null = null;
  private moving = false;
  private lastMove: (Point & { time: number }) | null = null;
  private rubbed = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly desktop: Desktop,
    private readonly clickThrough: ClickThrough,
    private readonly handlers: InteractionHandlers,
    private readonly isOverPet: () => boolean,
  ) {
    canvas.addEventListener('pointerdown', (event) => this.press(event));
    canvas.addEventListener('pointermove', (event) => (this.pressedAt ? this.drag(event) : this.rub(event)));
    canvas.addEventListener('pointerup', (event) => this.release(event));
    canvas.addEventListener('pointercancel', (event) => this.release(event));
    canvas.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      if (this.isOverPet()) this.handlers.onClick();
    });
  }

  private press(event: PointerEvent): void {
    if (event.button !== 0 || !this.isOverPet()) return;
    this.pressedAt = { x: event.clientX, y: event.clientY };
    this.canvas.setPointerCapture(event.pointerId);
    // Sin esto, al mover rápido el cursor saldría del perro y la ventana dejaría de recibir el arrastre.
    this.clickThrough.hold(true);
  }

  private rub(event: PointerEvent): void {
    const now = performance.now();
    const previous = this.lastMove;
    this.lastMove = { x: event.clientX, y: event.clientY, time: now };
    if (!this.isOverPet() || !previous || now - previous.time > STROKE_PAUSE_MS) {
      this.rubbed = 0;
      return;
    }
    this.rubbed += Math.hypot(event.clientX - previous.x, event.clientY - previous.y);
    if (this.rubbed >= STROKE_STEP) {
      this.handlers.onStroke(this.rubbed, { x: event.clientX, y: event.clientY });
      this.rubbed = 0;
    }
  }

  private drag(event: PointerEvent): void {
    const start = this.pressedAt!;
    if (!this.dragging) {
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) < DRAG_THRESHOLD) return;
      this.dragging = true;
      this.handlers.onGrab();
      void this.rememberGrabPoint();
      return;
    }
    // Mover la ventana es asíncrono: si aún no ha terminado el movimiento anterior, este se salta.
    if (!this.grabOffset || this.moving) return;
    this.moving = true;
    const offset = this.grabOffset;
    void this.desktop
      .cursorOnScreen()
      .then((cursor) => {
        if (this.dragging) this.handlers.onDrag({ x: cursor.x - offset.x, y: cursor.y - offset.y });
      })
      .finally(() => {
        this.moving = false;
      });
  }

  private async rememberGrabPoint(): Promise<void> {
    const [cursor, origin] = await Promise.all([this.desktop.cursorOnScreen(), this.desktop.windowPosition()]);
    this.grabOffset = { x: cursor.x - origin.x, y: cursor.y - origin.y };
  }

  private release(event: PointerEvent): void {
    if (!this.pressedAt) return;
    if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
    this.clickThrough.hold(false);
    const wasDragging = this.dragging;
    this.pressedAt = null;
    this.dragging = false;
    this.grabOffset = null;
    this.lastMove = null;
    if (wasDragging) this.handlers.onDrop();
    else if (event.type === 'pointerup') this.handlers.onClick();
  }
}
