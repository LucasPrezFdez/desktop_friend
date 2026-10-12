import * as THREE from 'three';
import type { Dog } from './dog';
import type { Stage } from './scene';

/** Lado del retrato en píxeles: de sobra para un círculo de 56 px en una pantalla al 250 %. */
const SIZE = 160;
/** Giro del perro para el retrato, en radianes: de tres cuartos. */
const YAW = -0.5;
const FIELD_OF_VIEW = 20;
/** A qué distancia se pone la cámara de la cabeza, en unidades de la escena. */
const DISTANCE = 2.1;
/** Cuánto por encima del hueso de la cabeza queda el centro del encuadre. */
const AIM_UP = 0.03;

const head = new THREE.Vector3();

/**
 * Retrato de la mascota para el menú: su cabeza, dibujada con el mismo modelo y los mismos
 * materiales que se ven en el escritorio. Se saca al arrancar, así que siempre corresponde al
 * modelo actual. Devuelve un PNG con el fondo transparente, como dirección `data:`.
 */
export function takePortrait(stage: Stage, dog: Dog): string {
  const { renderer, scene, canvas } = stage;
  dog.root.position.set(0, 0, 0);
  dog.root.rotation.set(0, YAW, 0);
  dog.play('Idle');
  dog.update(0);

  dog.headPosition(head).y += AIM_UP;
  const camera = new THREE.PerspectiveCamera(FIELD_OF_VIEW, canvas.width / canvas.height, 0.1, 50);
  camera.position.set(head.x, head.y + 0.12, head.z + DISTANCE);
  camera.lookAt(head);
  renderer.render(scene, camera);

  // Hay que copiarlo ahora mismo: el canvas de WebGL no conserva lo dibujado entre fotogramas.
  // Se recorta el cuadrado central, que es lo que abarca la cámara de arriba abajo.
  const side = Math.min(canvas.width, canvas.height);
  const portrait = document.createElement('canvas');
  portrait.width = SIZE;
  portrait.height = SIZE;
  portrait
    .getContext('2d')!
    .drawImage(canvas, (canvas.width - side) / 2, (canvas.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  dog.root.rotation.set(0, 0, 0);
  return portrait.toDataURL('image/png');
}
