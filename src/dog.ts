import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createDogMaterials, PALETTE } from './blackFur';

/** Clips que trae public/models/dog.glb (ver docs/decisiones/0010-construccion-del-modelo.md). */
export type ClipName =
  | 'Idle' | 'IdleLook' | 'Sniff' | 'Walk' | 'Run' | 'Eat'
  | 'SitDown' | 'Sit' | 'LieDown' | 'Lie' | 'Sleep' | 'Happy' | 'Sad' | 'Carry';

export interface PlayOptions {
  /** Segundos de fundido con el clip anterior. */
  fade?: number;
  /** Reproduce una vez y se queda en el último fotograma. */
  once?: boolean;
  /** Reproduce hacia atrás (para levantarse con los clips de sentarse y tumbarse). */
  reverse?: boolean;
  speed?: number;
}

const MODEL_URL = '/models/dog.glb';
/** Altura del modelo en sus propias unidades, hasta lo alto de la cabeza. */
const MODEL_HEIGHT = 2.67;
/** Altura del perro en la escena. */
export const DOG_HEIGHT = 1.12;

const TAIL_BONES = ['Tail1', 'Tail2', 'Tail3', 'Tail4', 'Tail5', 'Tail6'];
const UP = new THREE.Vector3(0, 1, 0);

const parentRotation = new THREE.Quaternion();
const delta = new THREE.Quaternion();
const axis = new THREE.Vector3();

/** Gira un hueso alrededor de un eje de mundo, encima de lo que ya haya puesto el clip. */
function rotateInWorld(bone: THREE.Object3D, worldAxis: THREE.Vector3, angle: number): void {
  bone.parent!.getWorldQuaternion(parentRotation);
  delta.setFromAxisAngle(worldAxis, angle);
  // local' = padre⁻¹ · giro · padre · local
  bone.quaternion.premultiply(parentRotation).premultiply(delta).premultiply(parentRotation.invert());
}

export class Dog {
  /** Nodo que se coloca y se gira en la escena. El perro mira hacia +Z cuando no está girado. */
  readonly root = new THREE.Group();
  /** 0 a 1: cuánto mueve la cola. */
  wag = 0.25;
  /** 0 a 1: cuánto está disfrutando de una caricia (levanta y ladea la cabeza). */
  petting = 0;
  eyesClosed = false;
  /** true cuando ha terminado el clip reproducido con `once`. */
  finished = false;

  private readonly mixer: THREE.AnimationMixer;
  private readonly actions = new Map<ClipName, THREE.AnimationAction>();
  private readonly tail: THREE.Object3D[];
  private readonly head: THREE.Object3D;
  private readonly nape: THREE.Object3D;
  /** Huesos que la app gira encima del clip, con el giro que les dejó el clip en el último fotograma. */
  private readonly layered: { bone: THREE.Object3D; fromClip: THREE.Quaternion }[];
  private readonly eyes: { material: THREE.MeshToonMaterial; open: THREE.Color }[];
  private readonly tongue: THREE.Object3D | undefined;
  private readonly furColor = new THREE.Color(PALETTE.Fur);
  private current: ClipName | null = null;
  private time = 0;
  private blinkIn = 2;
  private blinkLeft = 0;
  private eyesShut = false;

  private constructor(model: THREE.Object3D, clips: THREE.AnimationClip[]) {
    model.scale.setScalar(DOG_HEIGHT / MODEL_HEIGHT);
    this.root.add(model);

    const materials = createDogMaterials();
    let tongue: THREE.Object3D | undefined;
    model.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      const material = materials.get((node.material as THREE.Material).name);
      if (material) node.material = material;
      if (material?.name === 'Tongue') tongue = node;
      // La esfera envolvente de una malla con esqueleto no sigue a la pose: mejor no descartarla nunca.
      node.frustumCulled = false;
    });
    this.tongue = tongue;
    this.tongueOut = false;
    this.eyes = ['EyeIris', 'EyePupil', 'EyeWhite', 'EyeShine'].map((name) => {
      const material = materials.get(name)!;
      return { material, open: material.color.clone() };
    });

    const bone = (name: string): THREE.Object3D => {
      // GLTFLoader quita los puntos de los nombres de nodo.
      const found = model.getObjectByName(name) ?? model.getObjectByName(name.replace(/\./g, ''));
      if (!found) throw new Error(`El modelo no tiene el hueso ${name}`);
      return found;
    };
    this.tail = TAIL_BONES.map(bone);
    this.head = bone('Head');
    this.nape = bone('Nape');
    this.layered = [...this.tail, this.head].map((layeredBone) => ({
      bone: layeredBone,
      fromClip: layeredBone.quaternion.clone(),
    }));

    this.mixer = new THREE.AnimationMixer(model);
    for (const clip of clips) {
      this.actions.set(clip.name as ClipName, this.mixer.clipAction(clip));
    }
    this.mixer.addEventListener('finished', () => {
      this.finished = true;
    });
  }

  static async load(): Promise<Dog> {
    const gltf = await new GLTFLoader().loadAsync(MODEL_URL);
    return new Dog(gltf.scene, gltf.animations);
  }

  get clip(): ClipName | null {
    return this.current;
  }

  set tongueOut(visible: boolean) {
    if (this.tongue) this.tongue.visible = visible;
  }

  play(name: ClipName, options: PlayOptions = {}): void {
    const next = this.actions.get(name);
    if (!next) throw new Error(`El modelo no tiene el clip ${name}`);
    const speed = options.speed ?? 1;
    const previous = this.current ? this.actions.get(this.current) : undefined;
    if (previous === next && !options.once && !options.reverse && next.loop === THREE.LoopRepeat) {
      next.timeScale = speed;
      return;
    }

    this.finished = false;
    next.reset();
    next.setLoop(options.once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    next.clampWhenFinished = true;
    next.timeScale = options.reverse ? -speed : speed;
    if (options.reverse) next.time = next.getClip().duration;
    next.play();
    if (previous && previous !== next) {
      next.crossFadeFrom(previous, options.fade ?? 0.3, false);
    }
    this.current = name;
  }

  update(deltaSeconds: number): void {
    this.time += deltaSeconds;
    // El mezclador solo reescribe un hueso cuando su valor cambia. Si el clip lo deja quieto (la cabeza
    // en Sit o Lie, por ejemplo), el hueso conservaría el giro añadido en el fotograma anterior y el de
    // este se sumaría encima, deformando la cabeza y la cola. Por eso antes se devuelve al giro del clip.
    for (const layer of this.layered) layer.bone.quaternion.copy(layer.fromClip);
    this.mixer.update(deltaSeconds);
    for (const layer of this.layered) layer.fromClip.copy(layer.bone.quaternion);
    this.root.updateMatrixWorld(true);
    this.wagTail();
    this.enjoyPetting();
    this.blink(deltaSeconds);
  }

  /** Posición de la cabeza en la escena, para colocar corazones y bocadillos. */
  headPosition(target: THREE.Vector3): THREE.Vector3 {
    return this.head.getWorldPosition(target);
  }

  /** Posición de la nuca, sobre el collar: de ahí lo coge la mano. */
  napePosition(target: THREE.Vector3): THREE.Vector3 {
    return this.nape.getWorldPosition(target);
  }

  /** Onda que recorre la cola de la base a la punta. Se aplica encima del clip activo. */
  private wagTail(): void {
    if (this.wag < 0.01) return;
    const speed = 7 + 9 * this.wag;
    this.tail.forEach((bone, index) => {
      const weight = index === 0 ? 0.5 : 1;
      rotateInWorld(bone, UP, Math.sin(this.time * speed - index * 0.55) * 0.17 * this.wag * weight);
    });
  }

  private enjoyPetting(): void {
    if (this.petting < 0.01) return;
    // El eje lateral del perro: levantar el morro es girar alrededor de él en sentido negativo.
    axis.set(1, 0, 0).applyQuaternion(this.root.quaternion);
    rotateInWorld(this.head, axis, -0.2 * this.petting);
    axis.set(0, 0, 1).applyQuaternion(this.root.quaternion);
    rotateInWorld(this.head, axis, Math.sin(this.time * 4.5) * 0.13 * this.petting);
  }

  /** El modelo no tiene párpados: cerrar los ojos es pintarlos del color del pelaje. */
  private blink(deltaSeconds: number): void {
    this.blinkIn -= deltaSeconds;
    this.blinkLeft -= deltaSeconds;
    if (this.blinkIn <= 0) {
      this.blinkLeft = 0.13;
      this.blinkIn = 2.5 + Math.random() * 3.5;
    }
    const shut = this.eyesClosed || this.blinkLeft > 0;
    if (shut === this.eyesShut) return;
    this.eyesShut = shut;
    for (const eye of this.eyes) eye.material.color.copy(shut ? this.furColor : eye.open);
  }
}
