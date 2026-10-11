import type { Desktop, Point } from './desktop';
import type { Stage } from './scene';

// Por encima de este valor el píxel cuenta como "mascota"; así los bordes suavizados no capturan clics.
const SOLID_ALPHA = 128;
const POLL_NEAR_MS = 30;
const POLL_FAR_MS = 120;
// Margen alrededor de la ventana en el que ya se sondea rápido, para llegar a tiempo al primer clic.
const NEAR_MARGIN = 80;

/**
 * Hace que los clics atraviesen la ventana donde no hay nada dibujado.
 *
 * Tauri solo permite ignorar el ratón en la ventana entera, y una ventana que lo ignora
 * no recibe eventos. Por eso se sondea la posición del cursor y se decide en cada paso
 * si bajo él hay mascota (por la opacidad del píxel) o interfaz.
 */
export class ClickThrough {
  private capturing = false;
  private held = false;
  private cursor: Point = { x: -1, y: -1 };

  constructor(
    private readonly desktop: Desktop,
    private readonly stage: Stage,
    private readonly isUiAt: (point: Point) => boolean,
  ) {}

  /** Mantiene la captura aunque el cursor salga de la mascota (arrastres, menús abiertos). */
  hold(on: boolean): void {
    this.held = on;
  }

  get isCapturing(): boolean {
    return this.capturing;
  }

  /** Última posición conocida del cursor, en píxeles CSS de la ventana. */
  get lastCursor(): Point {
    return this.cursor;
  }

  async start(): Promise<void> {
    await this.desktop.setClickThrough(true);
    void this.poll();
  }

  private async poll(): Promise<void> {
    let delay = POLL_FAR_MS;
    try {
      const cursor = await this.desktop.cursor();
      this.cursor = cursor;
      const inside =
        cursor.x >= 0 && cursor.y >= 0 && cursor.x < window.innerWidth && cursor.y < window.innerHeight;
      this.stage.setProbe(inside ? cursor : null);

      const solid = inside && (this.stage.alphaUnderProbe > SOLID_ALPHA || this.isUiAt(cursor));
      const capture = solid || this.held;
      if (capture !== this.capturing) {
        this.capturing = capture;
        await this.desktop.setClickThrough(!capture);
      }

      const near =
        cursor.x >= -NEAR_MARGIN &&
        cursor.y >= -NEAR_MARGIN &&
        cursor.x < window.innerWidth + NEAR_MARGIN &&
        cursor.y < window.innerHeight + NEAR_MARGIN;
      if (near || this.held) delay = POLL_NEAR_MS;
    } catch (error) {
      console.error('Fallo en el sondeo del cursor', error);
    }
    setTimeout(() => void this.poll(), delay);
  }
}
