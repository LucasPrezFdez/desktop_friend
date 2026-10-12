import * as THREE from 'three';
import type { Point } from './desktop';

const MAX_DELTA = 0.1;

/** Renderer transparente, cámara y bucle de render con límite de FPS. */
export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  /** Se llama una vez por frame, antes de dibujar. */
  onUpdate: (delta: number) => void = () => {};

  private readonly pixel = new Uint8Array(4);
  private probe: Point | null = null;
  private probeAlpha = 0;
  private frameInterval = 1 / 30;
  private elapsedSinceFrame = 0;
  private lastTime = 0;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setClearColor(0x000000, 0);
    // Encuadre: el suelo queda casi en el borde inferior, para que el perro pise la barra de tareas,
    // y sobra sitio arriba para el panel y los corazones.
    this.camera.position.set(0, 1.5, 5.4);
    this.camera.lookAt(0, 1.2, 0);
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  /** Al cambiar de monitor cambia la escala: hay que reaplicar el pixel ratio. */
  private resize(): void {
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  setFps(fps: number): void {
    this.frameInterval = 1 / fps;
  }

  /** Punto (en píxeles CSS) cuya opacidad se mide en cada frame; null para no medir. */
  setProbe(point: Point | null): void {
    this.probe = point;
    if (!point) this.probeAlpha = 0;
  }

  /** Opacidad (0-255) de lo dibujado bajo el punto de sondeo en el último frame. */
  get alphaUnderProbe(): number {
    return this.probeAlpha;
  }

  /** Rayo desde la cámara que pasa por un punto de la ventana (píxeles CSS). */
  rayAt(point: Point, raycaster: THREE.Raycaster): void {
    const ndc = new THREE.Vector2(
      (point.x / window.innerWidth) * 2 - 1,
      -(point.y / window.innerHeight) * 2 + 1,
    );
    raycaster.setFromCamera(ndc, this.camera);
  }

  /** Posición en la ventana (píxeles CSS) de un punto del mundo. */
  project(world: THREE.Vector3): Point {
    const ndc = world.clone().project(this.camera);
    return {
      x: ((ndc.x + 1) / 2) * window.innerWidth,
      y: ((1 - ndc.y) / 2) * window.innerHeight,
    };
  }

  start(): void {
    this.renderer.setAnimationLoop((time) => {
      const seconds = time / 1000;
      this.elapsedSinceFrame += seconds - this.lastTime;
      this.lastTime = seconds;
      // Pequeño margen para no saltarse frames por el redondeo del temporizador.
      if (this.elapsedSinceFrame < this.frameInterval - 0.002) return;
      const delta = Math.min(this.elapsedSinceFrame, MAX_DELTA);
      this.elapsedSinceFrame = 0;
      this.onUpdate(delta);
      this.draw();
      this.sampleProbe();
    });
  }

  /** Dibuja un fotograma suelto, para quien no necesita el bucle (la ventana de la cama). */
  draw(): void {
    this.renderer.render(this.scene, this.camera);
  }

  /** Tiene que ejecutarse justo después de dibujar: el buffer no se conserva entre frames. */
  private sampleProbe(): void {
    const probe = this.probe;
    if (!probe) return;
    const gl = this.renderer.getContext();
    const ratio = this.renderer.getPixelRatio();
    const x = Math.floor(probe.x * ratio);
    const y = gl.drawingBufferHeight - 1 - Math.floor(probe.y * ratio);
    if (x < 0 || y < 0 || x >= gl.drawingBufferWidth || y >= gl.drawingBufferHeight) {
      this.probeAlpha = 0;
      return;
    }
    gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, this.pixel);
    this.probeAlpha = this.pixel[3];
  }
}
