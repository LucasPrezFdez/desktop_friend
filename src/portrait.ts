import * as THREE from 'three';
import { createLights } from './blackFur';
import type { Pet } from './pet';
import type { Stage } from './scene';

/** Lado del retrato en píxeles: de sobra para un círculo de 56 px en una pantalla al 250 %. */
const SIZE = 160;
/** Giro de la mascota para el retrato, en radianes: de tres cuartos. */
const YAW = -0.5;
const FIELD_OF_VIEW = 20;

const head = new THREE.Vector3();
/** Escena aparte, solo con las luces: en la del escritorio puede haber un cuenco, una cama u otra mascota. */
let studio: THREE.Scene | undefined;

/**
 * Retrato de una mascota para el menú: su cabeza, dibujada con el mismo modelo y los mismos
 * materiales que se ven en el escritorio. Se saca del modelo recién cargado, así que siempre
 * corresponde al actual. Devuelve un PNG con el fondo transparente, como dirección `data:`.
 */
export function takePortrait(stage: Stage, pet: Pet): string {
  const { renderer, canvas } = stage;
  if (!studio) {
    studio = new THREE.Scene();
    studio.add(createLights());
  }
  const home = pet.root.parent;
  studio.add(pet.root);
  pet.root.position.set(0, 0, 0);
  pet.root.rotation.set(0, YAW, 0);
  pet.play('Idle');
  pet.update(0);

  const { distance, aimUp } = pet.shape.portrait;
  pet.headPosition(head).y += aimUp;
  const camera = new THREE.PerspectiveCamera(FIELD_OF_VIEW, canvas.width / canvas.height, 0.1, 50);
  camera.position.set(head.x, head.y + 0.12, head.z + distance);
  camera.lookAt(head);
  renderer.render(studio, camera);

  // Hay que copiarlo ahora mismo: el canvas de WebGL no conserva lo dibujado entre fotogramas.
  // Se recorta el cuadrado central, que es lo que abarca la cámara de arriba abajo.
  const side = Math.min(canvas.width, canvas.height);
  const portrait = document.createElement('canvas');
  portrait.width = SIZE;
  portrait.height = SIZE;
  portrait
    .getContext('2d')!
    .drawImage(canvas, (canvas.width - side) / 2, (canvas.height - side) / 2, side, side, 0, 0, SIZE, SIZE);

  pet.root.rotation.set(0, 0, 0);
  if (home) home.add(pet.root);
  else studio.remove(pet.root);
  // En el canvas ha quedado el retrato: se vuelve a dibujar el escritorio antes de que llegue a verse.
  stage.draw();
  return portrait.toDataURL('image/png');
}
