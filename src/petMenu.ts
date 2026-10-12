import type { Point } from './desktop';
import type { PetSpec } from './pets';

const SVG = 'http://www.w3.org/2000/svg';
const RING_RADIUS = 27;
// A la misma distancia de la mascota que los círculos de estado (ver src/ui.ts).
const FAN_RADIUS = 150;
/** Separación entre un círculo y el siguiente, en radianes. */
const FAN_STEP = 0.68;
// Cada círculo sale un poco después que el anterior.
const STAGGER_MS = 70;
// Más que los círculos de estado: desde la bandeja hay que llegar hasta la mascota con el ratón.
const AUTO_CLOSE_MS = 10_000;

/**
 * Dónde queda cada uno de los `count` círculos respecto al centro de la mascota, en píxeles:
 * repartidos en un arco por encima de ella, centrado.
 */
export function fanOffsets(count: number, radius = FAN_RADIUS, step = FAN_STEP): Point[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index - (count - 1) / 2) * step;
    return { x: Math.round(Math.sin(angle) * radius), y: -Math.round(Math.cos(angle) * radius) };
  });
}

/**
 * Menú para cambiar de mascota: un círculo por cada una, con su retrato, que sale de la mascota
 * igual que los círculos de estado. La que está en el escritorio lleva el anillo lleno.
 */
export class PetMenu {
  private readonly fan = document.createElement('div');
  private readonly portraits = new Map<string, HTMLElement>();
  private closeTimer = 0;
  private opened = false;

  /**
   * @param active La mascota que está ahora en el escritorio.
   * @param origin Centro de la mascota en la ventana: de ahí salen los círculos.
   * @param onFirstOpen Se llama la primera vez que se abre: para lo que solo hace falta si se usa.
   */
  constructor(
    container: HTMLElement,
    pets: readonly PetSpec[],
    active: string,
    private readonly origin: () => Point,
    onPick: (pet: PetSpec) => void,
    private readonly onFirstOpen: () => void = () => {},
  ) {
    this.fan.className = 'pets';
    // El último hueco no es una mascota: avisa de que vendrán más.
    const offsets = fanOffsets(pets.length + 1);
    const place = (element: HTMLElement, index: number): void => {
      element.style.setProperty('--dx', `${offsets[index].x}px`);
      element.style.setProperty('--dy', `${offsets[index].y}px`);
      element.style.setProperty('--delay', `${index * STAGGER_MS}ms`);
      this.fan.append(element);
    };

    pets.forEach((pet, index) => {
      const option = document.createElement('button');
      option.className = pet.id === active ? 'pet option active' : 'pet option';
      // data-hit marca lo que debe capturar clics aunque debajo no haya mascota.
      option.dataset.hit = '';
      option.title = pet.id === active ? `${pet.name} · es la que tienes ahora` : `Cambiar a ${pet.name}`;

      const portrait = document.createElement('span');
      portrait.className = 'portrait';
      this.portraits.set(pet.id, portrait);

      option.append(ring(), portrait, caption(pet.name));
      option.addEventListener('pointerenter', () => window.clearTimeout(this.closeTimer));
      option.addEventListener('pointerleave', () => this.scheduleClose(2500));
      option.addEventListener('click', () => {
        this.close();
        onPick(pet);
      });
      place(option, index);
    });

    const soon = document.createElement('div');
    soon.className = 'pet soon';
    const plus = document.createElement('span');
    plus.className = 'plus';
    soon.append(ring(), plus, caption('Pronto'));
    place(soon, pets.length);

    // Sin esto, el botón derecho sobre un círculo sacaría el menú del navegador.
    this.fan.addEventListener('contextmenu', (event) => event.preventDefault());
    container.append(this.fan);
  }

  /** Pone el retrato de una mascota en su círculo (ver src/portrait.ts). */
  setPortrait(id: string, url: string): void {
    const portrait = this.portraits.get(id);
    if (portrait) portrait.style.backgroundImage = `url(${url})`;
  }

  get isOpen(): boolean {
    return this.fan.classList.contains('open');
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  open(): void {
    const origin = this.origin();
    this.fan.style.left = `${origin.x}px`;
    this.fan.style.top = `${origin.y}px`;
    this.fan.classList.add('open');
    this.scheduleClose(AUTO_CLOSE_MS);
    if (!this.opened) {
      this.opened = true;
      this.onFirstOpen();
    }
  }

  close(): void {
    this.fan.classList.remove('open');
    window.clearTimeout(this.closeTimer);
  }

  private scheduleClose(milliseconds: number): void {
    window.clearTimeout(this.closeTimer);
    this.closeTimer = window.setTimeout(() => this.close(), milliseconds);
  }
}

function ring(): SVGSVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 60 60');
  for (const name of ['track', 'level']) {
    const shape = document.createElementNS(SVG, 'circle');
    shape.setAttribute('class', name);
    shape.setAttribute('cx', '30');
    shape.setAttribute('cy', '30');
    shape.setAttribute('r', String(RING_RADIUS));
    svg.append(shape);
  }
  return svg;
}

function caption(text: string): HTMLElement {
  const element = document.createElement('span');
  element.className = 'name';
  element.textContent = text;
  return element;
}
