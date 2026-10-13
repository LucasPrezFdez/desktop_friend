import * as THREE from 'three';
import { createDogMaterials, PALETTE } from './blackFur';
import { loadModel, Pet, rotateInWorld, UP, type PetShape } from './pet';

const MODEL_URL = '/models/dog.glb';
/** Altura del modelo en sus propias unidades, hasta lo alto de la cabeza. */
const MODEL_HEIGHT = 2.67;
/** Altura del perro en la escena. */
export const DOG_HEIGHT = 1.12;

const TAIL_BONES = ['Tail1', 'Tail2', 'Tail3', 'Tail4', 'Tail5', 'Tail6'];

const SHAPE: PetShape = {
  bodyCenter: new THREE.Vector3(0, 0.62, 0),
  shadow: { width: 1.7, depth: 0.75 },
  bowlX: 0.98,
  // Tumbado se le ve más de perfil: de frente, las patas estiradas se salían por debajo de la ventana.
  lyingFacing: 1.0,
  // En la cama va de perfil, a lo largo de ella, con la cabeza vuelta hacia quien mira. Cabe justo:
  // el giro y el sitio salen de medir con tools/verify/nap.mjs que no toca el reborde (decisión 0023).
  napFacing: 1.62,
  napSpot: { x: -0.25, z: -0.02 },
  // La mano entra en diagonal desde un lado y agarra el collar por detrás del cuello. Encima de la
  // cabeza parecía un gorro; así se ve la palma junto al cuello, a la altura del collar.
  handGrip: new THREE.Vector3(0.2, 0.03, -0.05),
  handTilt: -0.8,
  portrait: { distance: 2.1, aimUp: 0.03 },
};

/** El perro negro de public/models/dog.glb (ver tools/model/build_dog.py). */
export class Dog extends Pet {
  readonly shape = SHAPE;

  private readonly tail: THREE.Object3D[];
  private readonly eyes: { material: THREE.MeshToonMaterial; open: THREE.Color }[];
  private readonly tongue: THREE.Object3D | undefined;
  private readonly furColor = new THREE.Color(PALETTE.Fur);

  private constructor(model: THREE.Object3D, clips: THREE.AnimationClip[]) {
    super(model, clips, { modelHeight: MODEL_HEIGHT, height: DOG_HEIGHT, head: 'Head', nape: 'Nape', layered: TAIL_BONES });

    const materials = createDogMaterials();
    let tongue: THREE.Object3D | undefined;
    model.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      const material = materials.get((node.material as THREE.Material).name);
      if (material) node.material = material;
      if (material?.name === 'Tongue') tongue = node;
    });
    this.tongue = tongue;
    this.tongueOut = false;
    this.eyes = ['EyeIris', 'EyePupil', 'EyeWhite', 'EyeShine'].map((name) => {
      const material = materials.get(name)!;
      return { material, open: material.color.clone() };
    });
    this.tail = TAIL_BONES.map((name) => this.bone(name));
  }

  static async load(): Promise<Dog> {
    const gltf = await loadModel(MODEL_URL);
    return new Dog(gltf.scene, gltf.animations);
  }

  override set tongueOut(visible: boolean) {
    if (this.tongue) this.tongue.visible = visible;
  }

  /** Onda que recorre la cola de la base a la punta. Se aplica encima del clip activo. */
  protected showJoy(): void {
    if (this.wag < 0.01) return;
    const speed = 7 + 9 * this.wag;
    this.tail.forEach((bone, index) => {
      const weight = index === 0 ? 0.5 : 1;
      rotateInWorld(bone, UP, Math.sin(this.time * speed - index * 0.55) * 0.17 * this.wag * weight);
    });
  }

  /** El modelo no tiene párpados: cerrar los ojos es pintarlos del color del pelaje. */
  protected shutEyes(shut: boolean): void {
    for (const eye of this.eyes) eye.material.color.copy(shut ? this.furColor : eye.open);
  }
}
