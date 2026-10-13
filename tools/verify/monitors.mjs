// Recorre el cambio de pantalla con órdenes inyectadas (sin tocar el ratón real): la orden de la
// bandeja lleva a la mascota a la otra pantalla y la deja junto a su esquina, la pantalla queda
// guardada, elegir la que ya tiene no hace nada, y si la ventana aparece en otra pantalla sin que
// la app la haya movido (es lo que hace Windows al desconectar una) se vuelve a apoyar en ella.
//
// Requiere dos pantallas y la app en modo desarrollo con --remote-debugging-port=9223 (ver cdp.mjs).
// Uso: node tools/verify/monitors.mjs
// Deja a la mascota en la pantalla en la que estaba, junto a su esquina.
import { connect } from './cdp-client.mjs';

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const app = await connect();
let failures = 0;
const check = (what, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'bien ' : 'FALLO'}  ${what}${detail ? `: ${detail}` : ''}`);
};
const state = () =>
  app.evaluate(`(async () => ({
    monitor: (await pet.desktop.monitor())?.name,
    saved: await pet.desktop.loadState('monitor'),
    activity: pet.behavior.activity,
    position: { ...pet.behavior.windowPosition },
    real: { x: Math.round(screenX * devicePixelRatio), y: Math.round(screenY * devicePixelRatio) },
    size: pet.desktop.windowSize(),
    scale: devicePixelRatio,
  }))()`);
/** Elige pantalla igual que el lado nativo: con un evento de Tauri que lleva su nombre. */
const pick = async (name) => {
  await app.evaluate(`(async () => {
    const url = performance.getEntriesByType('resource').map((entry) => entry.name).find((name) => name.includes('tauri-apps_api_event'));
    await (await import(url)).emit('pet-monitor', ${JSON.stringify(name)});
  })()`);
  await sleep(1200);
};
/** Lo deja sentado, que es quedarse quieto al menos diez segundos. */
const settle = async () => {
  await app.evaluate(`pet.behavior.force('sit')`);
  await sleep(300);
};
const describe = ({ x, y }) => `(${x}, ${y})`;
const same = (a, b) => Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1;
/** Dónde tiene que quedar la ventana al llegar a una pantalla: junto a la esquina de la bandeja. */
const corner = (area, now) => ({
  x: area.x + area.width - now.size.x - 80 * now.scale,
  y: area.y + area.height - now.size.y,
});
const inside = (area, now) =>
  now.real.x >= area.x && now.real.x + now.size.x <= area.x + area.width && now.real.y + now.size.y === area.y + area.height;

try {
  const monitors = await app.evaluate('pet.desktop.monitors()');
  const start = await state();
  const here = monitors.find((monitor) => monitor.name === start.monitor);
  const there = monitors.find((monitor) => monitor.name !== start.monitor);
  if (!here || !there) {
    console.log(`Hace falta más de una pantalla, y hay ${monitors.length}`);
    process.exit(2);
  }
  console.log(`de ${here.name} a ${there.name}`);

  // 1. La orden de la bandeja lo lleva a la otra pantalla.
  await pick(there.name);
  let now = await state();
  check('elegir la otra pantalla lleva la ventana a ella', now.monitor === there.name, now.monitor);
  check('queda junto a su esquina, apoyada en el suelo', same(now.position, corner(there.workArea, now)), describe(now.position));
  check('la ventana está de verdad donde dice la app', same(now.real, now.position), describe(now.real));
  check('llega contento, como al traerlo', now.activity === 'happy', now.activity);
  check('la pantalla queda guardada', now.saved === there.name, now.saved);

  // 2. Elegir la pantalla en la que ya está no lo mueve del sitio.
  await settle();
  await app.evaluate(`(() => {
    pet.behavior.windowPosition.x -= 300;
    return pet.desktop.moveWindow(pet.behavior.windowPosition);
  })()`);
  const moved = (await state()).position;
  await pick(there.name);
  now = await state();
  check('elegir la pantalla en la que ya está no hace nada', same(now.position, moved) && now.activity === 'sit', `${describe(now.position)}, ${now.activity}`);
  await pick('no-existe');
  now = await state();
  check('una pantalla que no existe tampoco', same(now.position, moved) && now.monitor === there.name);

  // 3. La ventana aparece en la otra pantalla sin que la app lo sepa, y al rato se vuelve a apoyar.
  await settle();
  await app.evaluate(`pet.desktop.moveWindow({ x: ${here.workArea.x + 40}, y: ${here.workArea.y + 40} })`);
  await app.evaluate('pet.behavior.relayout()');
  await sleep(300);
  now = await state();
  check('si Windows pasa la ventana a otra pantalla, se apoya en el suelo de esa', now.monitor === here.name && inside(here.workArea, now) && same(now.real, now.position), describe(now.real));

  // 4. Y de vuelta, ida y vuelta completas.
  await pick(there.name);
  now = await state();
  check('vuelve a la otra', now.monitor === there.name && same(now.real, corner(there.workArea, now)), describe(now.real));
  await pick(here.name);
  now = await state();
  check('y regresa a la primera', now.monitor === here.name && same(now.real, corner(here.workArea, now)) && now.saved === here.name, describe(now.real));
} finally {
  app.close();
}
console.log(failures ? `${failures} comprobaciones han fallado` : 'todo correcto');
process.exitCode = failures ? 1 : 0;
