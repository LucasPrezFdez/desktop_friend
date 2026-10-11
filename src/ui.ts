import type { Point } from './desktop';
import type { Needs } from './needs';

interface StatSpec {
  key: keyof Needs;
  icon: string;
  label: string;
  /** Dónde queda el círculo respecto al centro del perro, en píxeles. */
  offset: Point;
}

// Los tres círculos se abren en arco por encima del perro.
const STATS: StatSpec[] = [
  { key: 'fullness', icon: '🍖', label: 'Saciedad', offset: { x: -100, y: -112 } },
  { key: 'happiness', icon: '❤️', label: 'Felicidad', offset: { x: 0, y: -152 } },
  { key: 'energy', icon: '⚡', label: 'Energía', offset: { x: 100, y: -112 } },
];

const SVG = 'http://www.w3.org/2000/svg';
const RING_RADIUS = 26;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
// Cada círculo sale un poco después que el anterior.
const STAGGER_MS = 70;
const AUTO_CLOSE_MS = 6000;

interface Stat {
  spec: StatSpec;
  element: HTMLElement;
  level: SVGCircleElement;
  value: number;
}

/** Interfaz dibujada con HTML encima del canvas: círculos de estado, bocadillo y corazones. */
export class Hud {
  private readonly stats = document.createElement('div');
  private readonly items: Stat[] = [];
  private readonly bubble = document.createElement('div');
  private readonly toast = document.createElement('div');
  private canEat = true;
  private toastTimer = 0;
  private closeTimer = 0;

  /**
   * @param origin Centro del perro en la ventana: de ahí salen los círculos.
   */
  constructor(
    private readonly container: HTMLElement,
    onFeed: () => void,
    private readonly origin: () => Point,
  ) {
    this.stats.className = 'stats';
    STATS.forEach((spec, index) => {
      // El de la comida es un botón: pulsarlo da de comer.
      const element = document.createElement(spec.key === 'fullness' ? 'button' : 'div');
      element.className = `stat ${spec.key}`;
      // data-hit marca lo que debe capturar clics aunque debajo no haya perro.
      element.dataset.hit = '';
      element.style.setProperty('--dx', `${spec.offset.x}px`);
      element.style.setProperty('--dy', `${spec.offset.y}px`);
      element.style.setProperty('--delay', `${index * STAGGER_MS}ms`);

      const ring = document.createElementNS(SVG, 'svg');
      ring.setAttribute('viewBox', '0 0 60 60');
      const circle = (name: string): SVGCircleElement => {
        const shape = document.createElementNS(SVG, 'circle');
        shape.setAttribute('class', name);
        shape.setAttribute('cx', '30');
        shape.setAttribute('cy', '30');
        shape.setAttribute('r', String(RING_RADIUS));
        ring.append(shape);
        return shape;
      };
      circle('track');
      const level = circle('level');
      level.style.strokeDasharray = String(RING_LENGTH);
      level.style.strokeDashoffset = String(RING_LENGTH);

      const icon = document.createElement('span');
      icon.className = 'icon';
      icon.textContent = spec.icon;

      element.append(ring, icon);
      element.addEventListener('pointerenter', () => window.clearTimeout(this.closeTimer));
      element.addEventListener('pointerleave', () => this.scheduleClose(2500));
      this.stats.append(element);
      this.items.push({ spec, element, level, value: 0 });
    });

    this.items[0].element.addEventListener('click', () => {
      if (!this.canEat) {
        this.say('Está lleno');
        return;
      }
      onFeed();
      this.closePanel();
    });

    this.bubble.className = 'bubble';
    this.bubble.hidden = true;
    this.toast.className = 'toast';
    this.toast.hidden = true;
    container.append(this.stats, this.bubble, this.toast);
  }

  get panelOpen(): boolean {
    return this.stats.classList.contains('open');
  }

  togglePanel(): void {
    if (this.panelOpen) this.closePanel();
    else this.openPanel();
  }

  /** Los círculos salen del perro hacia fuera y sus anillos se llenan hasta el nivel actual. */
  openPanel(): void {
    const origin = this.origin();
    this.stats.style.left = `${origin.x}px`;
    this.stats.style.top = `${origin.y}px`;
    this.stats.classList.add('open');
    this.drawLevels();
    this.scheduleClose(AUTO_CLOSE_MS);
  }

  /** Los círculos vuelven al perro y los anillos se vacían, listos para la próxima vez. */
  closePanel(): void {
    this.stats.classList.remove('open');
    this.drawLevels();
    window.clearTimeout(this.closeTimer);
  }

  private scheduleClose(milliseconds: number): void {
    window.clearTimeout(this.closeTimer);
    this.closeTimer = window.setTimeout(() => this.closePanel(), milliseconds);
  }

  setNeeds(needs: Needs, canEat: boolean): void {
    this.canEat = canEat;
    for (const item of this.items) {
      item.value = needs[item.spec.key];
      item.element.classList.toggle('low', item.value < 25);
      const percent = `${item.spec.label}: ${Math.round(item.value)} %`;
      item.element.title =
        item.spec.key === 'fullness' ? `${percent} · ${canEat ? 'pulsa para dar de comer' : 'está lleno'}` : percent;
    }
    this.items[0].element.classList.toggle('full', !canEat);
    if (this.panelOpen) this.drawLevels();
  }

  /** El anillo es un trazo discontinuo: cuanto menos desplazado, más lleno. */
  private drawLevels(): void {
    const open = this.panelOpen;
    for (const item of this.items) {
      const filled = open ? Math.min(Math.max(item.value, 0), 100) / 100 : 0;
      item.level.style.strokeDashoffset = String(RING_LENGTH * (1 - filled));
    }
  }

  /** Bocadillo de pensamiento junto a la cabeza; null lo quita. */
  setBubble(symbol: string | null, head: Point): void {
    this.bubble.hidden = symbol === null;
    if (symbol === null) return;
    this.bubble.textContent = symbol;
    this.bubble.style.left = `${head.x + 26}px`;
    this.bubble.style.top = `${head.y - 58}px`;
  }

  /** Símbolo que sube y se desvanece (corazones, zetas). */
  emote(symbol: string, origin: Point): void {
    const element = document.createElement('span');
    element.className = 'emote';
    element.textContent = symbol;
    element.style.left = `${origin.x + (Math.random() - 0.5) * 50}px`;
    element.style.top = `${origin.y - 24}px`;
    element.addEventListener('animationend', () => element.remove());
    this.container.append(element);
  }

  /** Mensaje breve en la parte alta de la ventana. */
  say(text: string): void {
    this.toast.textContent = text;
    this.toast.hidden = false;
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.toast.hidden = true;
    }, 2200);
  }

  /** true si en ese punto hay interfaz que debe recibir el clic. */
  isUiAt(point: Point): boolean {
    const hit = document.elementFromPoint(point.x, point.y)?.closest('[data-hit]');
    if (!hit) return false;
    // Para el navegador cada círculo es una caja cuadrada: en sus esquinas el clic debe atravesar.
    const box = hit.getBoundingClientRect();
    const fromCentre = Math.hypot(point.x - (box.x + box.width / 2), point.y - (box.y + box.height / 2));
    return fromCentre <= box.width / 2;
  }
}
