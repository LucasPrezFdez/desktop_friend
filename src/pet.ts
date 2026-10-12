import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Clips que trae el GLB de cualquier mascota, con los mismos nombres en todas: quien decide qué
 * hace (src/behavior.ts) no sabe cuál tiene delante. Ver docs/decisiones/0010-construccion-del-modelo.md
 * y 0021-mascota-wingman.md.
 */
export type ClipName =
  | 'Idle' | 'IdleLook' | 'Sniff' | 'Walk' | 'Run' | 'Eat'
  | 'SitDown' | 'Sit' | 'LieDown' | 'Lie' | 'Sleep' | 'Nap' | 'Happy' | 'Sad' | 'Carry';

export interface PlayOptions {
  /** Segundos de fundido con el clip anterior. */
  fade?: number;
  /** Reproduce una vez y se queda en el último fotograma. */
  once?: boolean;
  /** Reproduce hacia atrás (para levantarse con los clips de sentarse y tumbarse). */
  reverse?: boolean;
  speed?: number;
}

/** Lo que cambia de una mascota a otra para quien la coloca en la escena, todo en unidades de la escena. */
export interface PetShape {
  /** Centro del cuerpo: de ahí salen los círculos de estado y el menú. */
  bodyCenter: THREE.Vector3;
  /** Ancho y fondo de la sombra de contacto. */
  shadow: { width: number; depth: number };
  /** A qué distancia por delante se le pone el cuenco. */
  bowlX: number;
  /** Giro, en radianes, con el que se tumba en el suelo, mirando a su lado. */
  lyingFacing: number;
  /** Giro con el que duerme en la cama. El clip `Nap` está hecho para verse desde su derecha. */
  napFacing: number;
  /** Cuánto retrocede dentro de la cama para quedar centrada en ella. */
  napBack: number;
  /** Dónde quedan las puntas de los dedos de la mano que la lleva respecto a la nuca, vistas desde la cámara. */
  handGrip: THREE.Vector3;
  /** Inclinación de esa mano, en radianes: los dedos apuntan hacia donde agarra. */
  handTilt: number;
  /** Retrato del menú: a qué distancia de la cabeza se pone la cámara y cuánto por encima apunta. */
  portrait: { distance: number; aimUp: number };
}

/** Lo que el modelo de cada mascota le dice a la clase común. */
export interface PetRig {
  /** Altura del modelo en sus propias unidades. */
  modelHeight: number;
  /** Altura de la mascota en la escena. */
  height: number;
  /** Hueso que se gira al acariciarla. */
  head: string;
  /** Hueso que marca dónde está la cabeza, si no es el anterior. */
  face?: string;
  /** Hueso de la nuca: de ahí la coge la mano. */
  nape: string;
  /** Otros huesos que la app gira encima del clip. */
  layered: string[];
}

export const UP = new THREE.Vector3(0, 1, 0);
const parentRotation = new THREE.Quaternion();
const delta = new THREE.Quaternion();
const axis = new THREE.Vector3();

/** Gira un hueso alrededor de un eje de mundo, encima de lo que ya haya puesto el clip. */
export function rotateInWorld(bone: THREE.Object3D, worldAxis: THREE.Vector3, angle: number): void {
  bone.parent!.getWorldQuaternion(parentRotation);
  delta.setFromAxisAngle(worldAxis, angle);
  // local' = padre⁻¹ · giro · padre · local
  bone.quaternion.premultiply(parentRotation).premultiply(delta).premultiply(parentRotation.invert());
}

export function loadModel(url: string): Promise<GLTF> {
  return new GLTFLoader().loadAsync(url);
}

/** Una mascota en la escena: su modelo, sus clips y lo que la app le mueve por encima de ellos. */
export abstract class Pet {
  /** Nodo que se coloca y se gira en la escena. La mascota mira hacia +Z cuando no está girada. */
  readonly root = new THREE.Group();
  /** 0 a 1: cuánto se le nota la alegría (el perro mueve la cola). */
  wag = 0.25;
  /** 0 a 1: cuánto está disfrutando de una caricia (levanta y ladea la cabeza). */
  petting = 0;
  eyesClosed = false;
  /** true cuando ha terminado el clip reproducido con `once`. */
  finished = false;
  abstract readonly shape: PetShape;

  protected readonly head: THREE.Object3D;
  protected time = 0;

  private readonly mixer: THREE.AnimationMixer;
  private readonly actions = new Map<ClipName, THREE.AnimationAction>();
  private readonly face: THREE.Object3D;
  private readonly nape: THREE.Object3D;
  /** Huesos que la app gira encima del clip, con el giro que les dejó el clip en el último fotograma. */
  private readonly layered: { bone: THREE.Object3D; fromClip: THREE.Quaternion }[];
  private current: ClipName | null = null;
  private blinkIn = 2;
  private blinkLeft = 0;
  private eyesShut = false;

  protected constructor(
    protected readonly model: THREE.Object3D,
    clips: THREE.AnimationClip[],
    rig: PetRig,
  ) {
    model.scale.setScalar(rig.height / rig.modelHeight);
    this.root.add(model);
    model.traverse((node) => {
      // La esfera envolvente de una malla con esqueleto no sigue a la pose: mejor no descartarla nunca.
      if (node instanceof THREE.Mesh) node.frustumCulled = false;
    });

    this.head = this.bone(rig.head);
    this.face = rig.face ? this.bone(rig.face) : this.head;
    this.nape = this.bone(rig.nape);
    this.layered = [...rig.layered.map((name) => this.bone(name)), this.head].map((layeredBone) => ({
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

  protected bone(name: string): THREE.Object3D {
    // GLTFLoader quita los puntos de los nombres de nodo.
    const found = this.model.getObjectByName(name) ?? this.model.getObjectByName(name.replace(/\./g, ''));
    if (!found) throw new Error(`El modelo no tiene el hueso ${name}`);
    return found;
  }

  get clip(): ClipName | null {
    return this.current;
  }

  /** Solo el perro tiene lengua que enseñar. */
  set tongueOut(_visible: boolean) {}

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
    this.showJoy();
    this.enjoyPetting();
    this.blink(deltaSeconds);
  }

  /** Posición de la cabeza en la escena, para colocar corazones y bocadillos. */
  headPosition(target: THREE.Vector3): THREE.Vector3 {
    return this.face.getWorldPosition(target);
  }

  /** Posición de la nuca: de ahí la coge la mano. */
  napePosition(target: THREE.Vector3): THREE.Vector3 {
    return this.nape.getWorldPosition(target);
  }

  /** Libera la memoria de la tarjeta gráfica. Para los modelos que se cargan solo para retratarlos. */
  dispose(): void {
    this.mixer.stopAllAction();
    this.model.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      node.geometry.dispose();
      for (const material of [node.material].flat() as THREE.MeshToonMaterial[]) {
        material.map?.dispose();
        material.dispose();
      }
    });
  }

  /** Lo que hace con el cuerpo según `wag`, encima del clip activo. */
  protected abstract showJoy(): void;

  /** Cierra o abre los ojos. Solo se llama cuando cambian. */
  protected abstract shutEyes(shut: boolean): void;

  private enjoyPetting(): void {
    if (this.petting < 0.01) return;
    // El eje lateral de la mascota: levantar la cara es girar alrededor de él en sentido negativo.
    axis.set(1, 0, 0).applyQuaternion(this.root.quaternion);
    rotateInWorld(this.head, axis, -0.2 * this.petting);
    axis.set(0, 0, 1).applyQuaternion(this.root.quaternion);
    rotateInWorld(this.head, axis, Math.sin(this.time * 4.5) * 0.13 * this.petting);
  }

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
    this.shutEyes(shut);
  }
}
