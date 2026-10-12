// Acaricia la cara del perro con un cursor virtual y mide si la cabeza se deforma.
// Solo vale con el perro en el escritorio: también mide su cola.
//
// No mueve el ratón real: los movimientos se inyectan en la página por el protocolo DevTools
// y el punto de sondeo de la app (el que decide si el cursor está sobre el perro) se sustituye
// por el del cursor virtual mientras dura la prueba.
//
// Mide cuánto se aparta el giro de la cabeza del que tenía antes de empezar. Una caricia la
// levanta y la ladea unos 15 grados como mucho; si el giro crece sin parar, se está acumulando.
//
// Requiere la app en modo desarrollo con --remote-debugging-port=9223 (ver cdp.mjs).
// Uso: node tools/verify/pet-face.mjs [--activity sit] [--seconds 4] [--shots prefijo]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { connect } from './cdp-client.mjs';

const options = { activity: 'sit', seconds: '4', shots: '' };
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) options[args[i].replace(/^--/, '')] = args[i + 1];

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const degrees = (radians) => (radians * 180) / Math.PI;
/** Ángulo entre dos giros dados como cuaterniones [x, y, z, w]. */
const angleBetween = (a, b) => {
  const dot = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]);
  return 2 * Math.acos(Math.min(1, dot));
};

const app = await connect();
const shot = async (name) => {
  if (!options.shots) return;
  const { data } = await app.send('Page.captureScreenshot', { format: 'png' });
  const file = resolve(`${options.shots}-${name}.png`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, Buffer.from(data, 'base64'));
};
const sample = () =>
  app.evaluate(`(() => {
    const head = pet.behavior.headOnScreen();
    return { x: head.x, y: head.y, q: pet.animal.head.quaternion.toArray(), tail: pet.animal.tail[2].quaternion.toArray(), wag: pet.animal.wag, pet: pet.behavior.petLevel, clip: pet.animal.clip };
  })()`);

try {
  // El sondeo real (cursor del sistema) se desconecta: lo fija el cursor virtual.
  await app.evaluate(`(() => {
    const stage = pet.stage;
    window.virtualProbe = stage.setProbe.bind(stage);
    stage.setProbe = () => {};
    document.documentElement.style.background = '#c9ced6';
  })()`);

  await app.evaluate(`pet.behavior.force('${options.activity}')`);
  await sleep(options.activity === 'idle' ? 1200 : 3200);

  const start = await sample();
  const happinessBefore = await app.evaluate('pet.behavior.needs.happiness');
  await shot('antes');

  const duration = Number(options.seconds) * 1000;
  const began = Date.now();
  const deviations = [];
  let strokes = 0;
  while (Date.now() - began < duration) {
    const now = await sample();
    const t = (Date.now() - began) / 1000;
    // Frotar la cara: vaivén de unos 28 px alrededor de la cabeza.
    const x = now.x + 14 * Math.sin(t * 9);
    const y = now.y + 5 * Math.cos(t * 7);
    await app.evaluate(`virtualProbe({ x: ${x}, y: ${y} })`);
    await app.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 0, pointerType: 'mouse' });
    deviations.push(degrees(angleBetween(start.q, now.q)));
    if (now.pet > 0.5) strokes += 1;
    await sleep(25);
  }
  await shot('acariciando');

  // Se retira el cursor y se espera a que se le pase.
  await app.evaluate('virtualProbe(null)');
  await sleep(2500);
  // La cola nunca para del todo: se muestrea un rato y se mira alrededor de qué giro oscila.
  const tailSwing = [];
  for (let i = 0; i < 30; i++) {
    tailSwing.push(degrees(angleBetween(start.tail, (await sample()).tail)));
    await sleep(40);
  }
  const rest = await sample();
  await shot('despues');
  const happinessAfter = await app.evaluate('pet.behavior.needs.happiness');

  const residual = degrees(angleBetween(start.q, rest.q));
  const peak = Math.max(...deviations);
  const steps = 8;
  const profile = Array.from({ length: steps }, (_, i) => {
    const slice = deviations.slice(Math.floor((i * deviations.length) / steps), Math.floor(((i + 1) * deviations.length) / steps));
    return Math.round(Math.max(...slice));
  });

  console.log(`actividad ${options.activity} (clip ${start.clip} -> ${rest.clip}), ${options.seconds} s de caricias en la cara`);
  console.log(`  muestras con la caricia activa: ${strokes} de ${deviations.length}; felicidad ${happinessBefore.toFixed(1)} -> ${happinessAfter.toFixed(1)}`);
  console.log(`  giro de la cabeza respecto al inicio, máximo por tramo (grados): ${profile.join(' ')}`);
  console.log(`  máximo ${peak.toFixed(1)} grados; al dejar de acariciar quedan ${residual.toFixed(1)} grados`);
  console.log(`  cola (tercer hueso) tras la caricia: entre ${Math.min(...tailSwing).toFixed(1)} y ${Math.max(...tailSwing).toFixed(1)} grados de su giro inicial (meneo ${rest.wag.toFixed(2)})`);
} finally {
  await app.evaluate(`(() => {
    delete pet.stage.setProbe;
    delete window.virtualProbe;
    document.documentElement.style.background = '';
  })()`);
  app.close();
}
