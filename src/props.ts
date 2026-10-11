import * as THREE from 'three';

/** Sombra de contacto bajo el perro. Es tan tenue que no cuenta como "mascota" para los clics. */
export function createShadow(): THREE.Mesh {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d')!;
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.34)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.004;
  shadow.scale.set(1.7, 0.75, 1);
  return shadow;
}

const BOWL_HEIGHT = 0.13;

/** Cuenco de comida que aparece junto al perro y se va vaciando. */
export class Bowl {
  readonly group = new THREE.Group();
  private readonly food: THREE.Mesh;
  private target = 0;
  private shown = 0;

  constructor() {
    const profile = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.26, 0),
      new THREE.Vector2(0.2, BOWL_HEIGHT),
      new THREE.Vector2(0.16, BOWL_HEIGHT),
      new THREE.Vector2(0.14, 0.035),
      new THREE.Vector2(0, 0.035),
    ];
    const bowl = new THREE.Mesh(
      new THREE.LatheGeometry(profile, 20),
      new THREE.MeshToonMaterial({ color: 0x2aa7b8, side: THREE.DoubleSide }),
    );
    this.food = new THREE.Mesh(
      new THREE.CylinderGeometry(0.155, 0.14, 0.07, 16),
      new THREE.MeshToonMaterial({ color: 0x8a5a2b }),
    );
    this.group.add(bowl, this.food);
    this.group.visible = false;
    this.setLevel(1);
  }

  show(x: number): void {
    this.group.position.set(x, 0, 0.1);
    this.setLevel(1);
    this.target = 1;
  }

  hide(): void {
    this.target = 0;
  }

  /** 1 es lleno, 0 es vacío. */
  setLevel(level: number): void {
    this.food.visible = level > 0.03;
    this.food.scale.y = Math.max(level, 0.05);
    this.food.position.y = 0.04 + 0.035 * level;
  }

  /** Aparece y desaparece creciendo, con un pequeño rebote. */
  update(deltaSeconds: number): void {
    this.shown += (this.target - this.shown) * Math.min(1, deltaSeconds * 10);
    this.group.visible = this.shown > 0.02;
    const bounce = 1 + 0.15 * Math.sin(Math.min(this.shown, 1) * Math.PI);
    this.group.scale.setScalar(this.shown * bounce);
  }
}
