// Recorre el menú para cambiar de mascota con un cursor virtual (sin tocar el ratón real):
// se abre con el botón derecho sobre el perro y con la orden de la bandeja, convive con los círculos
// de estado, solo sus círculos capturan clics, y se cierra al elegir, al coger al perro y solo.
//
// Requiere la app en modo desarrollo con --remote-debugging-port=9223 (ver cdp.mjs).
// Uso: node tools/verify/menu.mjs [--shots prefijo]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { connect } from './cdp-client.mjs';

const options = { shots: '' };
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) options[args[i].replace(/^--/, '')] = args[i + 1];

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const app = await connect();
let failures = 0;
const check = (what, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'bien ' : 'FALLO'}  ${what}${detail ? `: ${detail}` : ''}`);
};
const shot = async (name) => {
  if (!options.shots) return;
  const { data } = await app.send('Page.captureScreenshot', { format: 'png' });
  const file = resolve(`${options.shots}-${name}.png`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, Buffer.from(data, 'base64'));
};
const state = () =>
  app.evaluate(`({ menu: pet.petMenu.isOpen, stats: pet.hud.panelOpen, activity: pet.behavior.activity, alive: window.menuTest === true })`);
/** Centro y tamaño de cada círculo del menú, tal como están en pantalla. */
const circles = () =>
  app.evaluate(`[...document.querySelectorAll('.pet')].map((element) => {
    const box = element.getBoundingClientRect();
    return {
      name: element.querySelector('.name').textContent,
      option: element.classList.contains('option'),
      active: element.classList.contains('active'),
      x: box.x + box.width / 2, y: box.y + box.height / 2, size: box.width,
      opacity: Number(getComputedStyle(element).opacity),
      ring: parseFloat(getComputedStyle(element.querySelector('.level')).strokeDashoffset),
      portrait: getComputedStyle(element.querySelector('.portrait') ?? element).backgroundImage.startsWith('url("data:image/png'),
    };
  })`);
const uiAt = (x, y) => app.evaluate(`pet.hud.isUiAt({ x: ${x}, y: ${y} })`);
/** Pulsa con el cursor virtual. El punto de sondeo le dice a la app qué hay debajo de él. */
const press = async (point, button) => {
  await app.evaluate(`virtualProbe({ x: ${point.x}, y: ${point.y} })`);
  await app.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y, button: 'none', buttons: 0 });
  await sleep(150);
  const event = { x: point.x, y: point.y, button, clickCount: 1, pointerType: 'mouse' };
  await app.send('Input.dispatchMouseEvent', { ...event, type: 'mousePressed', buttons: button === 'left' ? 1 : 2 });
  return event;
};
const click = async (point, button = 'left') => {
  const event = await press(point, button);
  await app.send('Input.dispatchMouseEvent', { ...event, type: 'mouseReleased', buttons: 0 });
  await sleep(700);
};
/** Un punto del perro: la cabeza, que cambia de sitio con la postura. */
const head = () => app.evaluate('pet.behavior.headOnScreen()');
/** Lanza la orden de la bandeja igual que el lado nativo: con un evento de Tauri. */
const trayCommand = (command) =>
  app.evaluate(`(async () => {
    const url = performance.getEntriesByType('resource').map((entry) => entry.name).find((name) => name.includes('tauri-apps_api_event'));
    await (await import(url)).emit('pet-command', '${command}');
  })()`);

try {
  // El sondeo real (cursor del sistema) se desconecta: lo fija el cursor virtual.
  await app.evaluate(`(() => {
    const stage = pet.stage;
    window.virtualProbe = stage.setProbe.bind(stage);
    stage.setProbe = () => {};
    window.menuTest = true;
    document.documentElement.style.background = '#c9ced6';
    pet.hud.closePanel();
    pet.petMenu.close();
    pet.behavior.force('sit');
  })()`);
  await sleep(3200);
  const view = await app.evaluate('({ width: innerWidth, height: innerHeight })');
  check('al empezar el menú está cerrado', !(await state()).menu);

  // 1. Botón derecho sobre el perro.
  await click(await head(), 'right');
  let now = await state();
  check('el botón derecho sobre el perro abre el menú', now.menu && !now.stats);
  // El anillo termina de llenarse algo después de que el círculo llegue a su sitio.
  await sleep(500);
  await shot('1-abierto');
  const all = await circles();
  // Las mascotas que hay las dice la propia app (src/pets.ts).
  const pets = await app.evaluate(`import('/src/pets.ts').then((module) => module.PETS.length)`);
  const dog = all.find((circle) => circle.active);
  const soon = all.find((circle) => !circle.option);
  check('hay un círculo por mascota y un hueco para las que vendrán', all.length === pets + 1 && all.filter((circle) => circle.option).length === pets, all.map((circle) => circle.name).join(', '));
  check('la mascota actual lleva el anillo lleno y su retrato', dog && dog.ring === 0 && dog.portrait && dog.opacity === 1, dog && `${dog.name}, ${dog.size} px`);
  check('el hueco va atenuado y sin anillo', soon && soon.ring > 100 && soon.opacity < 1);
  check('los círculos caben en la ventana', all.every((circle) => circle.x - circle.size / 2 >= 0 && circle.x + circle.size / 2 <= view.width && circle.y - circle.size / 2 >= 0), all.map((circle) => `(${Math.round(circle.x)}, ${Math.round(circle.y)})`).join(' '));

  // 2. Solo los círculos de mascota capturan el clic.
  const corner = dog.size / 2 - 3;
  check('el círculo de la mascota actual captura el clic', await uiAt(dog.x, dog.y));
  check('la esquina de su caja no', !(await uiAt(dog.x - corner, dog.y - corner)));
  check('su nombre tampoco', !(await uiAt(dog.x, dog.y + dog.size / 2 + 14)));
  check('el hueco de "Pronto" deja pasar el clic', !(await uiAt(soon.x, soon.y)));
  // Los retratos de las demás llegan algo después que el menú: antes hay que cargar su modelo.
  await sleep(1500);
  const others = (await circles()).filter((circle) => circle.option && !circle.active);
  check('las demás llevan el anillo vacío y su retrato', others.every((circle) => circle.ring > 100 && circle.portrait), others.map((circle) => circle.name).join(', '));

  // 3. Convive con los círculos de estado: abrir unos cierra el otro.
  await click(await head(), 'left');
  now = await state();
  check('un clic normal abre los círculos de estado y cierra el menú', now.stats && !now.menu);
  await shot('2-estado');
  await click(await head(), 'right');
  now = await state();
  check('y el botón derecho vuelve al menú y cierra los de estado', now.menu && !now.stats);
  await click(await head(), 'right');
  check('otra vez el botón derecho lo cierra', !(await state()).menu);
  check('cerrado, su círculo ya no captura el clic', !(await uiAt(dog.x, dog.y)));

  // 4. Elegir la mascota que ya está: se cierra y no pasa nada más.
  await click(await head(), 'right');
  await click(dog);
  now = await state();
  check('elegir la mascota actual cierra el menú sin recargar la app', !now.menu && now.alive);

  // 5. Coger al perro lo cierra.
  await click(await head(), 'right');
  const from = await head();
  const held = await press(from, 'left');
  await app.send('Input.dispatchMouseEvent', { ...held, type: 'mouseMoved', x: from.x + 14, y: from.y - 10, buttons: 1 });
  await sleep(400);
  now = await state();
  check('al coger al perro el menú se cierra', !now.menu && now.activity === 'held', now.activity);
  await app.send('Input.dispatchMouseEvent', { ...held, type: 'mouseReleased', x: from.x + 14, y: from.y - 10, buttons: 0 });
  await sleep(2500);

  // 6. La orden de la bandeja.
  await app.evaluate('pet.hud.openPanel()');
  await trayCommand('pets');
  await sleep(700);
  now = await state();
  check('"Cambiar de mascota" en la bandeja abre el menú y cierra los círculos de estado', now.menu && !now.stats);

  // 7. Se cierra solo.
  await sleep(8500);
  check('a los 9 segundos sigue abierto', (await state()).menu);
  await sleep(2000);
  check('a los 11 ya se ha cerrado solo', !(await state()).menu);
} finally {
  await app.evaluate(`(() => {
    delete pet.stage.setProbe;
    delete window.virtualProbe;
    delete window.menuTest;
    document.documentElement.style.background = '';
    pet.petMenu.close();
    pet.hud.closePanel();
  })()`);
  app.close();
}
console.log(failures ? `${failures} comprobaciones han fallado` : 'todo correcto');
process.exitCode = failures ? 1 : 0;
