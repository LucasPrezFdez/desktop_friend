// Ventana de la cama. Mientras se lleva al perro, su ventana va detrás del cursor; la cama tiene
// que quedarse quieta en el escritorio, así que se dibuja aquí, en una ventana aparte que nunca
// recibe el ratón. Usa la misma escena y la misma cámara que la del perro.
import { createLights } from './blackFur';
import { onBedOrder } from './desktop';
import { Bed } from './props';
import { Stage } from './scene';

const MAX_DELTA = 0.1;

async function main(): Promise<void> {
  const stage = new Stage(document.querySelector<HTMLCanvasElement>('#stage')!);
  const bed = await Bed.load();
  stage.scene.add(createLights(), bed.group);

  let serial = 0;
  let animating = false;
  let lastTime = 0;

  // La cama casi siempre está quieta: solo se dibuja mientras aparece o desaparece.
  const frame = (time: number): void => {
    bed.update(Math.min((time - lastTime) / 1000, MAX_DELTA));
    lastTime = time;
    stage.draw();
    if (bed.settled) {
      animating = false;
      done(serial);
    } else {
      requestAnimationFrame(frame);
    }
  };

  const done = onBedOrder((order) => {
    serial = order.serial;
    if (order.visible) bed.show(order.instant);
    else bed.hide(order.instant);
    // El primer fotograma se dibuja aquí mismo, sin esperar al navegador: un relevo instantáneo
    // queda hecho en esta misma llamada, aunque la ventana se acabe de mostrar.
    stage.draw();
    if (bed.settled) {
      done(serial);
    } else if (!animating) {
      animating = true;
      lastTime = performance.now();
      requestAnimationFrame(frame);
    }
  });

  if (import.meta.env.DEV) {
    // Acceso desde las herramientas de verificación (tools/verify/cdp.mjs --page bed).
    Object.assign(window, { bedWindow: { bed, stage } });
  }
}

main().catch((error: unknown) => console.error(error));
