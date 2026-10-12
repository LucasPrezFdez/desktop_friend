import { Behavior } from './behavior';
import { createLights } from './blackFur';
import { ClickThrough } from './clickThrough';
import { createDesktop, type Point } from './desktop';
import { Interaction } from './interaction';
import { loadPet } from './loadPet';
import { advance, canEat, catchUp, initialState, parseState, type PetState } from './needs';
import type { Pet } from './pet';
import { PetMenu } from './petMenu';
import { PETS, resolvePet, type PetSpec } from './pets';
import { takePortrait } from './portrait';
import { Bed, Bowl, createShadow, Hand } from './props';
import { Stage } from './scene';
import { Hud } from './ui';

const STATE_KEY = 'pet';
const WINDOW_KEY = 'windowX';
const CHOICE_KEY = 'chosenPet';
const SAVE_EVERY_MS = 20_000;
// Por encima de esta opacidad el píxel bajo el cursor es mascota (o cuenco, o cama), no sombra ni borde.
const SOLID_ALPHA = 128;

/** Carga la mascota elegida. Si su modelo falta o no se puede leer, sale la primera de la lista. */
async function loadChosen(chosen: PetSpec): Promise<{ chosen: PetSpec; pet: Pet }> {
  try {
    return { chosen, pet: await loadPet(chosen.id) };
  } catch (error) {
    if (chosen === PETS[0]) throw error;
    console.error(error);
    return { chosen: PETS[0], pet: await loadPet(PETS[0].id) };
  }
}

async function main(): Promise<void> {
  const desktop = createDesktop();
  const stage = new Stage(document.querySelector<HTMLCanvasElement>('#stage')!);

  const saved = resolvePet(await desktop.loadState<unknown>(CHOICE_KEY));
  const [{ chosen, pet }, bed] = await Promise.all([loadChosen(saved), Bed.load()]);
  const shadow = createShadow();
  shadow.scale.set(pet.shape.shadow.width, pet.shape.shadow.depth, 1);
  stage.scene.add(createLights(), shadow, pet.root);
  // El retrato se saca ahora, antes de que empiece a moverse.
  const portrait = takePortrait(stage, pet);
  const bowl = new Bowl();
  const hand = new Hand();
  stage.scene.add(bowl.group, hand.group, bed.group);

  // Lo primero es ponerse al día con el tiempo que la app ha estado cerrada.
  const state = parseState(await desktop.loadState<unknown>(STATE_KEY));
  const start = state ? catchUp(state, Date.now()) : initialState(Date.now());

  const ui = document.querySelector<HTMLElement>('#ui')!;
  const bodyOnScreen = (): Point => stage.project(pet.shape.bodyCenter);
  const hud = new Hud(
    ui,
    () => {
      if (behavior.feed()) void save();
    },
    bodyOnScreen,
  );
  const petMenu = new PetMenu(
    ui,
    PETS,
    chosen.id,
    bodyOnScreen,
    (picked) => {
      if (picked.id === chosen.id) return;
      // Cambiar de mascota es arrancar de nuevo con la otra: se guarda todo y se recarga la ventana.
      void save()
        .then(() => desktop.saveState(CHOICE_KEY, picked.id))
        .then(() => location.reload());
    },
    () => {
      // Para retratar a las demás hay que cargar su modelo: se hace solo si el menú llega a abrirse.
      for (const other of PETS) {
        if (other.id === chosen.id) continue;
        void loadPet(other.id)
          .then((model) => {
            petMenu.setPortrait(other.id, takePortrait(stage, model));
            model.dispose();
          })
          .catch((error: unknown) => console.error(error));
      }
    },
  );
  petMenu.setPortrait(chosen.id, portrait);
  const behavior = new Behavior(pet, desktop, stage, bowl, hand, bed, hud, start.needs);
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
      // Los círculos de estado y el menú salen del mismo sitio: abrir uno cierra el otro.
      onClick: () => {
        petMenu.close();
        hud.togglePanel();
      },
      onMenu: () => {
        hud.closePanel();
        petMenu.toggle();
      },
      onGrab: () => {
        petMenu.close();
        behavior.grab();
      },
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
    } else if (command === 'pets') {
      hud.closePanel();
      petMenu.open();
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
    pet.update(delta);
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
    Object.assign(window, { pet: { behavior, animal: pet, bed, hud, petMenu, stage, save } });
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
