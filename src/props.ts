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

/**
 * Mano que coge al perro por el collar para llevarlo. Es un guante de dibujos animados que flota,
 * sin brazo: tiene que verse como un juego, no como alguien agarrando a un animal.
 * El origen del grupo son las puntas de los dedos; la mano queda por encima.
 */
/** Tamaño del guante respecto a como está modelado. */
const HAND_SCALE = 0.85;

export class Hand {
  readonly group = new THREE.Group();

  constructor() {
    const glove = new THREE.MeshToonMaterial({ color: 0xfbfaf5 });
    const stitch = new THREE.MeshToonMaterial({ color: 0x4a4a55 });
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material = glove): THREE.Mesh => {
      const mesh = new THREE.Mesh(geometry, material);
      this.group.add(mesh);
      return mesh;
    };

    const palm = add(new THREE.SphereGeometry(1, 20, 14));
    palm.scale.set(0.15, 0.125, 0.09);
    palm.position.set(0, 0.16, 0.02);

    // Tres dedos gordos que bajan por delante del collar y se cierran por debajo.
    for (const x of [-0.09, 0, 0.09]) {
      const knuckle = add(new THREE.CapsuleGeometry(0.044, 0.06, 6, 12));
      knuckle.position.set(x, 0.05, 0.075);
      knuckle.rotation.x = -0.3;
      const tip = add(new THREE.CapsuleGeometry(0.04, 0.045, 6, 12));
      tip.position.set(x, -0.025, 0.06);
      tip.rotation.x = 0.9;
    }

    // El pulgar asoma por un lado.
    const thumb = add(new THREE.CapsuleGeometry(0.046, 0.07, 6, 12));
    thumb.position.set(-0.165, 0.09, 0.03);
    thumb.rotation.z = -0.75;

    // Puño abullonado, como el de un guante de dibujos.
    const cuff = add(new THREE.TorusGeometry(0.1, 0.05, 10, 22));
    cuff.rotation.x = Math.PI / 2;
    cuff.position.set(0, 0.31, 0.01);

    // Los tres pespuntes del dorso.
    for (const x of [-0.055, 0, 0.055]) {
      const dart = add(new THREE.CapsuleGeometry(0.008, 0.055, 4, 8), stitch);
      dart.position.set(x, 0.2, 0.108);
    }

    this.group.visible = false;
  }

  /**
   * Coloca la mano.
   * @param fingertips Dónde quedan las puntas de los dedos.
   * @param angle Inclinación de la mano, en radianes (0 es con los dedos hacia abajo).
   * @param presence 0 a 1: aparece desde arriba mientras crece.
   */
  place(fingertips: THREE.Vector3, angle: number, presence: number): void {
    this.group.visible = presence > 0.02;
    if (!this.group.visible) return;
    this.group.position.set(fingertips.x, fingertips.y + (1 - presence) * 0.32, fingertips.z);
    this.group.rotation.z = angle;
    this.group.scale.setScalar(presence * HAND_SCALE);
  }
}