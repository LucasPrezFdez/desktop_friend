import { Vector3 } from 'three';
import { Behavior } from './behavior';
import { createLights } from './blackFur';
import { ClickThrough } from './clickThrough';
import { createDesktop } from './desktop';
import { Dog } from './dog';
import { Interaction } from './interaction';
import { advance, canEat, catchUp, initialState, parseState, type PetState } from './needs';
import { Bed, Bowl, createShadow, Hand } from './props';
import { Stage } from './scene';
import { Hud } from './ui';

const STATE_KEY = 'pet';
const WINDOW_KEY = 'windowX';
const SAVE_EVERY_MS = 20_000;
// Por encima de esta opacidad el píxel bajo el cursor es perro (o cuenco, o cama), no sombra ni borde.
const SOLID_ALPHA = 128;
// Centro del cuerpo del perro en la escena: de ahí salen los círculos de estado.
const BODY_CENTER = new Vector3(0, 0.62, 0);

async function main(): Promise<void> {
  const desktop = createDesktop();
  const stage = new Stage(document.querySelector<HTMLCanvasElement>('#stage')!);
  stage.scene.add(createLights(), createShadow());

  const [dog, bed] = await Promise.all([Dog.load(), Bed.load()]);
  const bowl = new Bowl();
  const hand = new Hand();
  stage.scene.add(dog.root, bowl.group, hand.group, bed.group);

  // Lo primero es ponerse al día con el tiempo que la app ha estado cerrada.
  const saved = parseState(await desktop.loadState<unknown>(STATE_KEY));
  const start = saved ? catchUp(saved, Date.now()) : initialState(Date.now());

  const hud = new Hud(
    document.querySelector<HTMLElement>('#ui')!,
    () => {
      if (behavior.feed()) void save();
    },
    () => stage.project(BODY_CENTER),
  );
  const behavior = new Behavior(dog, desktop, stage, bowl, hand, bed, hud, start.needs);
  window.addEventListener('resize', () => void behavior.relayout());
  await behavior.init(await desktop.loadState<number>(WINDOW_KEY));

  const save = async (): Promise<void> => {
    const state: PetState = { version: 1, needs: behavior.needs, lastSeen: Date.now() };
    await desktop.saveState(STATE_KEY, state);
    await desktop.saveState(WINDOW_KEY, behavior.windowX);
  };

  const clickThrough = new ClickThrough(desktop, stage, (point) => hud.isUiAt(point));
  new Interaction(
    stage.canvas,
    desktop,
    clickThrough,
    {
      onStroke: (pixels, point) => behavior.stroke(pixels, point),
      onClick: () => hud.togglePanel(),
      onGrab: () => behavior.grab(),
      onDrag: (position) => behavior.drag(position),
      onDrop: () => void behavior.drop().then(save),
    },
    () => stage.alphaUnderProbe > SOLID_ALPHA,
  );

  desktop.onCommand((command) => {
    if (command === 'feed') {
      if (behavior.feed()) void save();
    } else if (command === 'come') {
      void behavior.come().then(save);
    } else {
      void save().finally(() => desktop.quit());
    }
  });

  // Las necesidades avanzan según el reloj, no según los fotogramas dibujados.
  let lastTick = Date.now();
  const tick = (): void => {
    const now = Date.now();
    behavior.needs = advance(behavior.needs, lastTick, now, behavior.rest);
    lastTick = now;
    hud.setNeeds(behavior.needs, canEat(behavior.needs));
  };
  tick();
  window.setInterval(tick, 1000);
  window.setInterval(() => void save(), SAVE_EVERY_MS);

  stage.onUpdate = (delta) => {
    behavior.update(delta);
    dog.update(delta);
    bowl.update(delta);
    bed.update(delta);
  };
  stage.start();

  // La ventana nace oculta y se muestra tras los primeros fotogramas: evita el destello blanco.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      // Al mostrarse la ventana ya tiene su tamaño definitivo: se vuelve a apoyar en el suelo.
      void desktop.show().then(() => behavior.relayout());
      void clickThrough.start();
    });
  });

  if (import.meta.env.DEV) {
    // Acceso desde las herramientas de verificación (tools/verify/cdp.mjs).
    Object.assign(window, { pet: { behavior, dog, bed, hud, stage, save } });
  }
}

main().catch((error: unknown) => {
  console.error(error);
  if (import.meta.env.DEV) {
    const message = document.createElement('pre');
    message.style.cssText = 'position:fixed;inset:0;margin:0;padding:8px;background:#400;color:#fff;font-size:11px;white-space:pre-wrap';
    message.textContent = String(error instanceof Error ? (error.stack ?? error.message) : error);
    document.body.append(message);
  }
});
