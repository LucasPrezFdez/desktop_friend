// Coge al perro, lo mueve de lado a lado y lo suelta, todo con órdenes inyectadas (sin tocar el
// ratón real), y captura la secuencia. Mide además el ángulo del balanceo.
//
// Requiere la app en modo desarrollo con --remote-debugging-port=9223 (ver cdp.mjs).
// Uso: node tools/verify/carry.mjs [--shots prefijo] [--speed 500]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { connect } from './cdp-client.mjs';

const options = { shots: '', speed: '500' };
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) options[args[i].replace(/^--/, '')] = args[i + 1];

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const degrees = (radians) => ((radians * 180) / Math.PI).toFixed(1);
const app = await connect();
const shot = async (name) => {
  if (!options.shots) return;
  const { data } = await app.send('Page.captureScreenshot', { format: 'png' });
  const file = resolve(`${options.shots}-${name}.png`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, Buffer.from(data, 'base64'));
};
const state = () =>
  app.evaluate(`({ sway: pet.behavior.sway, carry: pet.behavior.carry, y: pet.animal.root.position.y, clip: pet.animal.clip, activity: pet.behavior.activity, wag: pet.animal.wag })`);

/** Arrastra la ventana a velocidad constante durante un rato y devuelve el balanceo máximo. */
async function drag(from, pixelsPerSecond, seconds, y) {
  const began = Date.now();
  let peak = 0;
  let x = from;
  while (Date.now() - began < seconds * 1000) {
    x = from + (pixelsPerSecond * (Date.now() - began)) / 1000;
    await app.evaluate(`pet.behavior.drag({ x: ${x}, y: ${y} })`);
    const now = await state();
    if (Math.abs(now.sway) > Math.abs(peak)) peak = now.sway;
    await sleep(20);
  }
  return { x, peak };
}

try {
  await app.evaluate(`document.documentElement.style.background = '#c9ced6'; pet.behavior.force('idle')`);
  await sleep(1500);
  const start = await app.evaluate('({ ...pet.behavior.windowPosition })');
  await shot('1-antes');

  await app.evaluate('pet.behavior.grab()');
  await sleep(110);
  await shot('2-baja-la-mano');
  await sleep(220);
  await shot('3-lo-levanta');
  await sleep(900);
  await shot('4-en-brazos');
  const held = await state();
  console.log(`en brazos: clip ${held.clip}, subido ${held.y.toFixed(2)}, cola ${held.wag.toFixed(2)}, balanceo en reposo ${degrees(held.sway)} grados`);

  const speed = Number(options.speed);
  const y = start.y - 160;
  const right = await drag(start.x, speed, 0.7, y);
  await shot('5-moviendo-a-la-derecha');
  const left = await drag(right.x, -speed, 0.7, y);
  await shot('6-moviendo-a-la-izquierda');
  console.log(`arrastrando a ${speed} px/s: balanceo máximo ${degrees(right.peak)} grados hacia un lado y ${degrees(left.peak)} hacia el otro`);

  // Quieto en el aire: el balanceo tiene que amortiguarse.
  const settle = [];
  for (let i = 0; i < 40; i++) {
    settle.push(Math.abs((await state()).sway));
    await sleep(40);
  }
  console.log(`quieto en el aire: balanceo máximo ${degrees(Math.max(...settle.slice(0, 10)))} grados al principio y ${degrees(Math.max(...settle.slice(-10)))} al final`);
  await shot('7-quieto-en-el-aire');

  await app.evaluate('pet.behavior.drop()');
  await sleep(180);
  await shot('8-lo-suelta');
  await sleep(1300);
  const end = await state();
  await shot('9-en-el-suelo');
  console.log(`tras soltarlo: actividad ${end.activity}, subido ${end.y.toFixed(2)}, balanceo ${degrees(end.sway)} grados`);
} finally {
  await app.evaluate(`document.documentElement.style.background = ''`);
  app.close();
}
