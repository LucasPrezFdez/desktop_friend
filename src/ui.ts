import type { Point } from './desktop';
import type { Mood, Needs } from './needs';

const MOOD_TEXT: Record<Mood, string> = {
  sleepy: 'Tiene sueño',
  hungry: 'Tiene hambre',
  sad: 'Está triste',
  content: 'Está tranquilo',
  happy: 'Está feliz',
};

const BARS: { key: keyof Needs; icon: string; label: string }[] = [
  { key: 'fullness', icon: '🍖', label: 'Saciedad' },
  { key: 'happiness', icon: '❤️', label: 'Felicidad' },
  { key: 'energy', icon: '⚡', label: 'Energía' },
];

/** Interfaz dibujada con HTML encima del canvas: panel de estado, bocadillo y corazones. */
export class Hud {
  private readonly panel = document.createElement('div');
  private readonly moodLine = document.createElement('div');
  private readonly fills = new Map<keyof Needs, HTMLElement>();
  private readonly feedButton = document.createElement('button');
  private readonly bubble = document.createElement('div');
  private readonly toast = document.createElement('div');
  private toastTimer = 0;
  private closeTimer = 0;

  constructor(
    private readonly container: HTMLElement,
    onFeed: () => void,
  ) {
    this.panel.className = 'panel';
    // data-hit marca lo que debe capturar clics aunque debajo no haya perro.
    this.panel.dataset.hit = '';
    this.panel.hidden = true;
    this.moodLine.className = 'mood';
    this.panel.append(this.moodLine);

    for (const { key, icon, label } of BARS) {
      const row = document.createElement('div');
      row.className = 'bar';
      row.title = label;
      const symbol = document.createElement('span');
      symbol.textContent = icon;
      const track = document.createElement('div');
      track.className = 'track';
      const fill = document.createElement('div');
      fill.className = `fill ${key}`;
      track.append(fill);
      row.append(symbol, track);
      this.panel.append(row);
      this.fills.set(key, fill);
    }

    this.feedButton.type = 'button';
    this.feedButton.textContent = 'Dar de comer';
    this.feedButton.addEventListener('click', () => {
      onFeed();
      this.closePanel();
    });
    this.panel.append(this.feedButton);
    this.panel.addEventListener('pointerenter', () => window.clearTimeout(this.closeTimer));
    this.panel.addEventListener('pointerleave', () => this.scheduleClose(2500));

    this.bubble.className = 'bubble';
    this.bubble.hidden = true;
    this.toast.className = 'toast';
    this.toast.hidden = true;
    container.append(this.panel, this.bubble, this.toast);
  }

  get panelOpen(): boolean {
    return !this.panel.hidden;
  }

  togglePanel(): void {
    if (this.panelOpen) this.closePanel();
    else this.openPanel();
  }

  openPanel(): void {
    this.panel.hidden = false;
    this.scheduleClose(6000);
  }

  closePanel(): void {
    this.panel.hidden = true;
    window.clearTimeout(this.closeTimer);
  }

  private scheduleClose(milliseconds: number): void {
    window.clearTimeout(this.closeTimer);
    this.closeTimer = window.setTimeout(() => this.closePanel(), milliseconds);
  }

  setNeeds(needs: Needs, mood: Mood, canEat: boolean): void {
    this.moodLine.textContent = MOOD_TEXT[mood];
    for (const { key } of BARS) {
      const fill = this.fills.get(key)!;
      fill.style.width = `${Math.round(needs[key])}%`;
      fill.classList.toggle('low', needs[key] < 25);
    }
    this.feedButton.disabled = !canEat;
    this.feedButton.textContent = canEat ? 'Dar de comer' : 'Está lleno';
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
    return document.elementFromPoint(point.x, point.y)?.closest('[data-hit]') != null;
  }
}
