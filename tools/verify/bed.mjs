// Recorre todo lo que pasa con la cama, con órdenes inyectadas (sin tocar el ratón real):
// sale al coger al perro, se guarda si se le suelta fuera, el perro duerme en ella si se le suelta
// encima, recupera energía, la cama se queda en su sitio si se le vuelve a coger y se guarda al despertar.
//
// Requiere la app en modo desarrollo con --remote-debugging-port=9223 (ver cdp.mjs).
// Uso: node tools/verify/bed.mjs [--shots prefijo]
// Deja la energía del perro como estaba; el rato que duerme durante la prueba sí cuenta.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { connect } from './cdp-client.mjs';

const options = { shots: '' };
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) options[args[i].replace(/^--/, '')] = args[i + 1];

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const dog = await connect(9223, 'main');
const bed = await connect(9223, 'bed');
let failures = 0;
const check = (what, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'bien ' : 'FALLO'}  ${what}${detail ? `: ${detail}` : ''}`);
};
const shot = async (page, name) => {
  if (!options.shots) return;
  const { data } = await page.send('Page.captureScreenshot', { format: 'png' });
  const file = resolve(`${options.shots}-${name}.png`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, Buffer.from(data, 'base64'));
};
const state = () =>
  dog.evaluate(`({
    activity: pet.behavior.activity, phase: pet.behavior.phase, rest: pet.behavior.rest, clip: pet.dog.clip,
    inBed: pet.behavior.inBed, spot: pet.behavior.bedSpot, position: { ...pet.behavior.windowPosition },
    bedHere: pet.bed.shown, energy: pet.behavior.needs.energy, eyesClosed: pet.dog.eyesClosed,
  })`);
/** Lo que dibuja la ventana de la cama y dónde está, en píxeles físicos. */
const bedWindow = () =>
  bed.evaluate(`({
    shown: bedWindow.bed.shown,
    x: Math.round(screenX * devicePixelRatio), y: Math.round(screenY * devicePixelRatio),
    hidden: document.visibilityState === 'hidden',
  })`);
const near = (a, b) => Math.abs(a - b) <= 1;

const saved = await dog.evaluate('pet.behavior.needs.energy');
try {
  const background = `document.documentElement.style.background = '#c9ced6'`;
  await dog.evaluate(`${background}; pet.behavior.needs = { ...pet.behavior.needs, energy: 50 }; pet.behavior.force('idle')`);
  await bed.evaluate(background);
  await sleep(1500);
  const start = await state();
  check('antes de cogerlo no hay cama', (await bedWindow()).shown === 0 && start.bedHere === 0);

  // 1. Al cogerlo sale la cama, a un lado.
  await dog.evaluate('pet.behavior.grab()');
  await sleep(900);
  let now = await state();
  let out = await bedWindow();
  const spot = now.spot;
  check('al cogerlo sale la cama en su ventana', out.shown === 1 && spot !== null, `a ${spot && Math.round(spot.x - start.position.x)} px del perro`);
  check('la ventana de la cama está donde se pidió', spot && near(out.x, spot.x) && near(out.y, spot.y), `(${out.x}, ${out.y})`);
  await shot(dog, '1-cogido');
  await shot(bed, '2-la-cama-fuera');

  // 2. Si se le suelta lejos, cae al suelo y la cama se guarda.
  await dog.evaluate(`pet.behavior.drag({ x: ${start.position.x}, y: ${start.position.y - 180} })`);
  await sleep(300);
  await dog.evaluate('pet.behavior.drop()');
  await sleep(1400);
  now = await state();
  out = await bedWindow();
  check('soltado lejos de la cama, no duerme', now.activity !== 'nap' && !now.inBed, now.activity);
  check('y la cama se guarda', out.shown === 0 && now.spot === null);

  // 3. Si se le suelta encima, cae dentro y se duerme.
  await dog.evaluate(`pet.behavior.force('idle')`);
  await sleep(500);
  await dog.evaluate('pet.behavior.grab()');
  await sleep(700);
  const second = (await state()).spot;
  await dog.evaluate(`pet.behavior.drag({ x: ${second.x + 60}, y: ${second.y - 220} })`);
  await sleep(500);
  await shot(dog, '3-encima-de-la-cama');
  await dog.evaluate('pet.behavior.drop()');
  await sleep(700);
  await shot(dog, '4-cae-dentro');
  await sleep(2600);
  now = await state();
  out = await bedWindow();
  check('soltado encima, duerme en la cama', now.activity === 'nap' && now.phase === 1 && now.inBed, `clip ${now.clip}, descanso ${now.rest}`);
  check('con los ojos cerrados', now.eyesClosed);
  check('su ventana queda justo donde estaba la cama', near(now.position.x, second.x) && near(now.position.y, second.y));
  check('la cama pasa a dibujarse en su ventana', now.bedHere === 1 && out.shown === 0);
  await shot(dog, '5-dormido');

  // 4. Dormido en la cama recupera energía.
  const before = now.energy;
  await sleep(8000);
  now = await state();
  check('en la cama recupera energía', now.energy > before, `${before.toFixed(3)} a ${now.energy.toFixed(3)} en 8 s (${(((now.energy - before) / 8) * 3600).toFixed(0)} puntos por hora)`);

  // 5. Las caricias no lo despiertan.
  await dog.evaluate('pet.behavior.stroke(200)');
  await sleep(300);
  check('las caricias no lo despiertan', (await state()).activity === 'nap');

  // 6. Si se le coge de la cama, la cama se queda donde estaba.
  await dog.evaluate('pet.behavior.grab()');
  await sleep(600);
  now = await state();
  out = await bedWindow();
  check('al cogerlo de la cama, esta se queda en su sitio', out.shown === 1 && near(out.x, second.x) && near(out.y, second.y) && now.bedHere === 0);
  await dog.evaluate(`pet.behavior.drag({ x: ${second.x - 30}, y: ${second.y - 200} })`);
  await sleep(500);
  await dog.evaluate('pet.behavior.drop()');
  await sleep(3400);
  now = await state();
  check('y se le puede volver a dejar en ella', now.activity === 'nap' && now.phase === 1 && now.inBed);

  // 7. Descansado del todo, se levanta y la cama se guarda.
  await dog.evaluate('pet.behavior.needs = { ...pet.behavior.needs, energy: 100 }; pet.behavior.clock = 60');
  await sleep(1200);
  await shot(dog, '6-se-levanta');
  await sleep(2600);
  now = await state();
  check('descansado del todo, se levanta', now.activity !== 'nap' && !now.inBed, now.activity);
  check('y la cama se guarda', now.bedHere === 0 && (await bedWindow()).shown === 0);
  await shot(dog, '7-fuera-de-la-cama');
} finally {
  await dog.evaluate(`document.documentElement.style.background = ''; pet.behavior.needs = { ...pet.behavior.needs, energy: ${saved} }`);
  await bed.evaluate(`document.documentElement.style.background = ''`);
  dog.close();
  bed.close();
}
console.log(failures ? `${failures} comprobaciones han fallado` : 'todo correcto');
process.exitCode = failures ? 1 : 0;
