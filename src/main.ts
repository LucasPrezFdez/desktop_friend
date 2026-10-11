import * as THREE from 'three';
import { ClickThrough } from './clickThrough';
import { createDesktop } from './desktop';
import { Stage } from './scene';

// Prototipo del hito 2: una esfera en lugar del perro, para validar la ventana
// transparente y los clics que atraviesan antes de construir el resto.
async function main(): Promise<void> {
  const desktop = createDesktop();
  const stage = new Stage(document.querySelector<HTMLCanvasElement>('#stage')!);

  stage.scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 2.5));
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 32, 16),
    new THREE.MeshStandardMaterial({ color: 0x2a2a33 }),
  );
  ball.position.y = 0.55;
  stage.scene.add(ball);

  const clickThrough = new ClickThrough(desktop, stage, () => false);
  let clicks = 0;
  stage.canvas.addEventListener('pointerdown', () => {
    clicks += 1;
    ball.material.color.setHSL((clicks * 0.17) % 1, 0.7, 0.5);
    document.title = `DesktopFriend clics=${clicks}`;
  });

  stage.onUpdate = (delta) => {
    ball.rotation.y += delta;
  };
  stage.start();

  // La ventana nace oculta y se muestra tras el primer frame: evita el destello blanco.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      void desktop.show();
      void clickThrough.start();
    });
  });
}

void main();
