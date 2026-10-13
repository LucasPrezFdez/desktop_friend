// Mide cuánto se cruzan la mascota y su cama, y la fotografía de cerca.
// La mete en la cama con órdenes inyectadas (sin tocar el ratón real) y comprueba, punto a punto de
// su malla, cuáles quedan dentro del reborde, bajo el colchón o bajo el suelo: mientras se tumba,
// dormida y al levantarse. Lo que queda dentro del reborde es lo que se ve cortado desde la app.
//
// Requiere la app en modo desarrollo con --remote-debugging-port=9223 (ver cdp.mjs).
// Uso: node tools/verify/nap.mjs [--shots prefijo] [--stay 1] [--trace 1]
//   --shots  guarda primeros planos desde varios ángulos, hechos con un segundo renderer
//   --stay   la deja dormida en la cama, para medir varias veces seguidas; si la ha metido esta
//            herramienta, con la energía a 50 para que no se despierte sola
//   --trace  escribe lo peor de cada fotograma mientras se tumba y se levanta
// Sin --stay la despierta y deja la energía como estaba; el rato que duerme durante la prueba sí cuenta.
// Tumbarse y levantarse se miden fotograma a fotograma: la herramienta para el bucle de dibujo y lo
// avanza ella, así que durante esos segundos la ventana va a cámara lenta.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { connect } from './cdp-client.mjs';

const options = { shots: '', stay: '', trace: '' };
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) options[args[i].replace(/^--/, '')] = args[i + 1];

// Unidades de la escena; una unidad son unos 125 píxeles en la ventana.
/** Lo más que puede entrar en el reborde: apoyarse en él lo hunde un poco, como un cojín. */
const RIM_LIMIT = 0.02;
/** Lo más que puede hundirse en el colchón, que mide 0,10 de grueso: cede, pero no hasta el suelo. */
const CUSHION_LIMIT = 0.08;
const FLOOR_LIMIT = 0.005;
/** Momentos del clip de dormir en los que se mide: respira, así que no vale con uno. */
const SAMPLES = 5;
const NAP_SECONDS = 4;
/** Paso con el que se avanza la animación al medir fotograma a fotograma, como a 30 por segundo. */
const STEP_SECONDS = 1 / 30;
/** Cuánto se sigue midiendo después de dormirse: el fundido con el clip de tumbarse dura 0,9 s. */
const FADE_SECONDS = 1.2;

/** Vistas de las fotos: nombre, cámara, punto al que mira, campo de visión y tamaño. */
const VIEWS = [
  ['app', [0, 1.5, 5.4], [0, 0.22, 0], 11, 1400, 640],
  ['esquina', [-1.4, 0.9, 3.4], [-0.55, 0.15, 0.2], 16, 1200, 800],
  ['arriba', [0, 5, 0.01], [0, 0, 0], 28, 1200, 800],
  ['lado', [-5, 0.6, 0.6], [0, 0.2, 0], 16, 1200, 700],
  ['tres-cuartos', [-2.6, 2.4, 3.6], [0, 0.15, 0], 20, 1200, 800],
];

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const dog = await connect(9223, 'main');
let failures = 0;
const check = (what, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'bien ' : 'FALLO'}  ${what}${detail ? `: ${detail}` : ''}`);
};

/** Se ejecuta dentro de la página: recorre la malla de la mascota y la compara con la de la cama. */
const MEASURE = `(() => {
  const { animal, bed } = pet;
  const Vector = animal.root.position.constructor;
  animal.root.updateMatrixWorld(true);
  bed.group.updateMatrixWorld(true);

  // Triángulos de la cama, en coordenadas de la escena, separados por pieza y repartidos en una
  // rejilla vista desde arriba: cada consulta mira solo los de su casilla.
  const CELL = 0.05;
  const cell = (x, z) => Math.floor(x / CELL) + ':' + Math.floor(z / CELL);
  const parts = {};
  bed.group.traverse((node) => {
    const name = node.material?.name;
    if (!node.isMesh || !name?.startsWith('Bed')) return;
    const position = node.geometry.attributes.position;
    const index = node.geometry.index;
    const points = [];
    const v = new Vector();
    for (let i = 0; i < position.count; i++) {
      v.fromBufferAttribute(position, i).applyMatrix4(node.matrixWorld);
      points.push([v.x, v.y, v.z]);
    }
    const triangles = [];
    const columns = new Map();
    for (let i = 0; i < index.count; i += 3) {
      const triangle = [points[index.getX(i)], points[index.getX(i + 1)], points[index.getX(i + 2)]];
      triangles.push(triangle);
      const xs = triangle.map((p) => p[0]);
      const zs = triangle.map((p) => p[2]);
      for (let x = Math.floor(Math.min(...xs) / CELL); x <= Math.floor(Math.max(...xs) / CELL); x++) {
        for (let z = Math.floor(Math.min(...zs) / CELL); z <= Math.floor(Math.max(...zs) / CELL); z++) {
          const key = x + ':' + z;
          if (!columns.has(key)) columns.set(key, []);
          columns.get(key).push(triangle);
        }
      }
    }
    parts[name] = { triangles, columns };
  });

  // Alturas a las que la vertical que pasa por (x, z) corta una pieza.
  const crossings = (part, x, z) => {
    const found = [];
    for (const [a, b, c] of part.columns.get(cell(x, z)) ?? []) {
      const d = (b[2] - c[2]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[2] - c[2]);
      if (Math.abs(d) < 1e-12) continue;
      const u = ((b[2] - c[2]) * (x - c[0]) + (c[0] - b[0]) * (z - c[2])) / d;
      const w = ((c[2] - a[2]) * (x - c[0]) + (a[0] - c[0]) * (z - c[2])) / d;
      if (u < 0 || w < 0 || u + w > 1) continue;
      found.push(u * a[1] + w * b[1] + (1 - u - w) * c[1]);
    }
    return found;
  };

  // Distancia de un punto a la superficie de una pieza: la del triángulo que le queda más cerca.
  const sub = (p, q) => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
  const dot = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
  const toTriangle = (p, a, b, c) => {
    const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a);
    const d1 = dot(ab, ap), d2 = dot(ac, ap);
    let s, t;
    if (d1 <= 0 && d2 <= 0) [s, t] = [0, 0];
    else {
      const bp = sub(p, b), d3 = dot(ab, bp), d4 = dot(ac, bp);
      const cp = sub(p, c), d5 = dot(ab, cp), d6 = dot(ac, cp);
      const vc = d1 * d4 - d3 * d2, vb = d5 * d2 - d1 * d6, va = d3 * d6 - d5 * d4;
      if (d3 >= 0 && d4 <= d3) [s, t] = [1, 0];
      else if (d6 >= 0 && d5 <= d6) [s, t] = [0, 1];
      else if (vc <= 0 && d1 >= 0 && d3 <= 0) [s, t] = [d1 / (d1 - d3), 0];
      else if (vb <= 0 && d2 >= 0 && d6 <= 0) [s, t] = [0, d2 / (d2 - d6)];
      else if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
        t = (d4 - d3) / (d4 - d3 + (d5 - d6));
        s = 1 - t;
      } else [s, t] = [vb / (va + vb + vc), vc / (va + vb + vc)];
    }
    return Math.hypot(ap[0] - s * ab[0] - t * ac[0], ap[1] - s * ab[1] - t * ac[1], ap[2] - s * ab[2] - t * ac[2]);
  };
  const nearest = (part, x, y, z) => {
    let best = Infinity;
    for (const [a, b, c] of part.triangles) best = Math.min(best, toTriangle([x, y, z], a, b, c));
    return best;
  };

  // Puntos de la mascota: vértices, mitades de arista y centros de cara, cada uno con su hueso.
  const samples = [];
  const v = new Vector();
  animal.root.traverse((node) => {
    if (!node.isMesh) return;
    for (let up = node; up; up = up.parent) if (!up.visible) return;
    const position = node.geometry.attributes.position;
    const weights = node.geometry.attributes.skinWeight;
    const joints = node.geometry.attributes.skinIndex;
    const points = [];
    for (let i = 0; i < position.count; i++) {
      node.getVertexPosition(i, v).applyMatrix4(node.matrixWorld);
      let bone = node.parent?.isBone ? node.parent.name : node.name;
      if (node.isSkinnedMesh) {
        let heaviest = 0;
        for (let k = 1; k < 4; k++) if (weights.getComponent(i, k) > weights.getComponent(i, heaviest)) heaviest = k;
        bone = node.skeleton.bones[joints.getComponent(i, heaviest)].name;
      }
      points.push({ at: [v.x, v.y, v.z], bone });
    }
    samples.push(...points);
    const index = node.geometry.index;
    const corner = (i) => points[index ? index.getX(i) : i];
    const count = index ? index.count : position.count;
    const middle = (...of) => ({ at: [0, 1, 2].map((k) => of.reduce((sum, p) => sum + p.at[k], 0) / of.length), bone: of[0].bone });
    for (let i = 0; i < count; i += 3) {
      const [a, b, c] = [corner(i), corner(i + 1), corner(i + 2)];
      samples.push(middle(a, b), middle(b, c), middle(c, a), middle(a, b, c));
    }
  });

  const worst = { rim: {}, cushion: {}, floor: {} };
  const note = (kind, bone, depth) => {
    const entry = (worst[kind][bone] ??= { points: 0, depth: 0 });
    entry.points++;
    entry.depth = Math.max(entry.depth, depth);
  };
  for (const { at: [x, y, z], bone } of samples) {
    if (y < 0) note('floor', bone, -y);
    // Dentro de una pieza cerrada: la vertical hacia arriba la corta un número impar de veces.
    for (const closed of ['BedRim', 'BedPiping']) {
      if (crossings(parts[closed], x, z).filter((height) => height > y).length % 2 === 1) {
        note('rim', bone, nearest(parts[closed], x, y, z));
      }
    }
    const top = Math.max(-Infinity, ...crossings(parts.BedCushion, x, z));
    if (y >= 0 && top > y) note('cushion', bone, top - y);
  }
  return { samples: samples.length, worst, inBed: pet.behavior.inBed, bedShown: bed.shown };
})()`;

/** Foto desde una cámara propia, sin tocar la de la app. */
const photograph = ([, from, to, fov, width, height]) => `(() => {
  const { stage } = pet;
  const canvas = document.createElement('canvas');
  const renderer = new stage.renderer.constructor({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(${width}, ${height}, false);
  renderer.setClearColor(0xc9ced6, 1);
  const camera = new stage.camera.constructor(${fov}, ${width / height}, 0.1, 50);
  camera.position.set(${from.join(',')});
  camera.lookAt(${to.join(',')});
  renderer.render(stage.scene, camera);
  const data = canvas.toDataURL('image/png');
  renderer.dispose();
  renderer.forceContextLoss();
  return data;
})()`;

/** Para el bucle de dibujo de la app, para avanzarlo a mano con `step`; `resume` lo devuelve. */
const pause = () => dog.evaluate('pet.stage.renderer.setAnimationLoop(null)');
const resume = () => dog.evaluate('pet.stage.start()');
const step = () => dog.evaluate(`pet.stage.onUpdate(${STEP_SECONDS}); pet.stage.draw()`);

const state = () =>
  dog.evaluate(`({
    activity: pet.behavior.activity, phase: pet.behavior.phase, clip: pet.animal.clip, clock: pet.behavior.clock,
    inBed: pet.behavior.inBed, nest: pet.behavior.nest, kind: pet.animal.constructor.name,
  })`);

/** Lo peor de varias medidas, hueso a hueso. */
class Worst {
  total = { rim: {}, cushion: {}, floor: {} };
  measures = 0;

  async measure() {
    const { worst, inBed, bedShown } = await dog.evaluate(MEASURE);
    // Solo cuenta mientras la cama está entera bajo la mascota: al guardarse encoge y la atraviesa.
    if (!inBed || bedShown !== 1) return false;
    this.measures++;
    if (options.trace) {
      const now = await state();
      const top = (kind) =>
        Object.entries(worst[kind])
          .sort((a, b) => b[1].depth - a[1].depth)
          .slice(0, 3)
          .map(([bone, { depth }]) => `${bone} ${depth.toFixed(3)}`)
          .join(', ');
      console.log(`       ${String(this.measures).padStart(3)} ${now.activity}/${now.phase} ${now.clip} | reborde: ${top('rim') || '-'} | suelo: ${top('floor') || '-'}`);
    }
    for (const kind of Object.keys(this.total)) {
      for (const [bone, { points, depth }] of Object.entries(worst[kind])) {
        const entry = (this.total[kind][bone] ??= { points: 0, depth: 0 });
        entry.points = Math.max(entry.points, points);
        entry.depth = Math.max(entry.depth, depth);
      }
    }
    return true;
  }

  deepest(kind) {
    return Math.max(0, ...Object.values(this.total[kind]).map((entry) => entry.depth));
  }

  list(kind) {
    return Object.entries(this.total[kind])
      .sort((a, b) => b[1].depth - a[1].depth)
      .map(([bone, { points, depth }]) => `${bone} ${depth.toFixed(3)} (${points})`)
      .join(', ');
  }

  report(when, kinds) {
    const names = { rim: 'entra en el reborde', cushion: 'se hunde en el colchón', floor: 'queda bajo el suelo' };
    const limits = { rim: RIM_LIMIT, cushion: CUSHION_LIMIT, floor: FLOOR_LIMIT };
    for (const kind of kinds) {
      const depth = this.deepest(kind);
      check(`${when}, nada ${names[kind]} más de ${limits[kind]}`, depth <= limits[kind], `máximo ${depth.toFixed(3)} en ${this.measures} medidas`);
      if (this.list(kind)) console.log(`       ${this.list(kind)}`);
    }
  }
}

const saved = await dog.evaluate('pet.behavior.needs.energy');
try {
  if (!(await state()).inBed) {
    await dog.evaluate(`pet.behavior.needs = { ...pet.behavior.needs, energy: 50 }; pet.behavior.force('idle')`);
    await sleep(1500);
    await dog.evaluate('pet.behavior.grab()');
    await sleep(800);
    const spot = await dog.evaluate('pet.behavior.bedSpot');
    await dog.evaluate(`pet.behavior.drag({ x: ${spot.x}, y: ${spot.y - 200} })`);
    await sleep(500);
    // Desde que toca el colchón hasta que termina de fundirse con el clip de dormir.
    const lying = new Worst();
    await pause();
    try {
      await dog.evaluate('pet.behavior.drop()');
      let dozing = 0;
      for (let steps = 0; steps < 300 && dozing < FADE_SECONDS; steps++) {
        await step();
        const now = await state();
        if (now.activity === 'nap' && now.phase === 1) dozing += STEP_SECONDS;
        if (now.inBed) await lying.measure();
      }
    } finally {
      await resume();
    }
    lying.report('mientras se tumba', ['rim', 'floor']);
  }
  // Dormida del todo y colocada en su sitio.
  for (let tries = 0; tries < 40; tries++) {
    const now = await state();
    if (now.activity === 'nap' && now.phase === 1 && now.clock > 1.2 && now.nest > 0.999) break;
    await sleep(250);
  }
  const now = await state();
  check('duerme en la cama', now.activity === 'nap' && now.phase === 1 && now.inBed, `${now.kind}, clip ${now.clip}`);

  const asleep = new Worst();
  for (let sample = 0; sample < SAMPLES; sample++) {
    await asleep.measure();
    await sleep((NAP_SECONDS * 1000) / SAMPLES);
  }
  asleep.report('dormida', ['rim', 'cushion', 'floor']);

  if (options.shots) {
    for (const view of VIEWS) {
      const file = resolve(`${options.shots}-${view[0]}.png`);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, Buffer.from((await dog.evaluate(photograph(view))).split(',')[1], 'base64'));
      console.log(`captura: ${file}`);
    }
  }

  if (!options.stay) {
    // Con la energía a tope y el mínimo de siesta cumplido se levanta sola, y la cama se guarda.
    await dog.evaluate('pet.behavior.needs = { ...pet.behavior.needs, energy: 100 }; pet.behavior.clock = 60');
    const rising = new Worst();
    await pause();
    try {
      for (let steps = 0; steps < 300; steps++) {
        await step();
        if (!(await rising.measure())) break;
      }
    } finally {
      await resume();
    }
    rising.report('al levantarse', ['rim', 'floor']);
    await sleep(2500);
  }
} finally {
  if (!options.stay) await dog.evaluate(`pet.behavior.needs = { ...pet.behavior.needs, energy: ${saved} }`);
  dog.close();
}
console.log(failures ? `${failures} comprobaciones han fallado` : 'todo correcto');
process.exitCode = failures ? 1 : 0;
