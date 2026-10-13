import * as THREE from 'three';
import { toonRamp } from './blackFur';
import { loadModel, Pet, rotateInWorld, type PetShape } from './pet';

const MODEL_URL = '/models/wingman.glb';
/** Altura del modelo en sus propias unidades, hasta la punta de las orejas. */
const MODEL_HEIGHT = 1.076;
/** Altura de Wingman en la escena. Es más alto que el perro, pero mucho más estrecho: abulta parecido. */
export const WINGMAN_HEIGHT = 1.3;

/** Material de las lentes blancas de los ojos (ver tools/model/build_wingman.py). */
const EYE_MATERIAL = 'WingmanEye';
const FOREARMS = ['L_Elbow', 'R_Elbow'];

const SHAPE: PetShape = {
  bodyCenter: new THREE.Vector3(0, 0.65, 0),
  shadow: { width: 1.15, depth: 0.7 },
  // Come doblado sobre el cuenco: tiene que quedarle a mano.
  bowlX: 0.72,
  lyingFacing: 1.0,
  napFacing: 1.4,
  // Tumbado boca abajo, casi todo el cuerpo queda por delante de los pies: van a la izquierda de la cama.
  napSpot: { x: -0.572, z: -0.099 },
  // La mano lo coge por lo alto del casco, como un gancho de feria.
  handGrip: new THREE.Vector3(0.12, 0.02, 0),
  handTilt: -0.5,
  // Más lejos que al perro: con las orejas, la cabeza es bastante más ancha.
  portrait: { distance: 3.7, aimUp: 0 },
};

const forward = new THREE.Vector3();

/** Wingman, de public/models/wingman.glb (ver tools/model/build_wingman.py). */
export class Wingman extends Pet {
  readonly shape = SHAPE;

  private readonly forearms: THREE.Object3D[];
  private readonly lenses: THREE.Object3D[] = [];

  private constructor(model: THREE.Object3D, clips: THREE.AnimationClip[]) {
    super(model, clips, {
      modelHeight: MODEL_HEIGHT,
      height: WINGMAN_HEIGHT,
      head: 'Head',
      face: 'Face',
      nape: 'Nape',
      layered: FOREARMS,
    });

    // El GLB trae la textura de color; el sombreado es el mismo de dibujos que el del perro.
    let skin: THREE.MeshToonMaterial | undefined;
    model.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      const original = node.material as THREE.MeshStandardMaterial;
      if (original.name === EYE_MATERIAL) this.lenses.push(node);
      skin ??= new THREE.MeshToonMaterial({ map: original.map, gradientMap: toonRamp() });
      node.material = skin;
      original.dispose();
    });
    this.forearms = FOREARMS.map((name) => this.bone(name));
  }

  static async load(): Promise<Wingman> {
    const gltf = await loadModel(MODEL_URL);
    return new Wingman(gltf.scene, gltf.animations);
  }

  /** No tiene cola: cuando está muy contento aletea con los brazos. Se aplica encima del clip activo. */
  protected showJoy(): void {
    // Solo cuando la alegría es mucha (una caricia, comida, en brazos): con la de un día normal,
    // un aleteo pequeño y constante parecería un temblor.
    const strength = THREE.MathUtils.smoothstep(this.wag, 0.55, 0.9);
    if (strength < 0.01) return;
    forward.set(0, 0, 1).applyQuaternion(this.root.quaternion);
    const angle = Math.sin(this.time * (9 + 6 * this.wag)) * 0.3 * strength;
    rotateInWorld(this.forearms[0], forward, angle);
    rotateInWorld(this.forearms[1], forward, -angle);
  }

  /** Los ojos son dos lentes blancas sobre el antifaz: quitarlas deja ver el antifaz, como un párpado. */
  protected shutEyes(shut: boolean): void {
    for (const lens of this.lenses) lens.visible = !shut;
  }
}
