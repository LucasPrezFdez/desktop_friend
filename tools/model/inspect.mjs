// Resumen compacto de un GLB: clips, huesos, materiales y morph targets.
// Uso: node tools/model/inspect.mjs <fichero.glb> [--bones]
import { readFileSync } from 'node:fs';

const [file, ...flags] = process.argv.slice(2);
if (!file) {
  console.error('Uso: node tools/model/inspect.mjs <fichero.glb> [--bones]');
  process.exit(2);
}

const buf = readFileSync(file);
if (buf.toString('latin1', 0, 4) !== 'glTF') {
  console.error('No es un GLB');
  process.exit(1);
}
const jsonLength = buf.readUInt32LE(12);
const gltf = JSON.parse(buf.toString('utf8', 20, 20 + jsonLength));

const round = (n) => Math.round(n * 1000) / 1000;

console.log(`fichero: ${file} (${buf.length} bytes), generador: ${gltf.asset?.generator}`);

console.log(`\nanimaciones (${gltf.animations?.length ?? 0}):`);
for (const anim of gltf.animations ?? []) {
  let duration = 0;
  for (const sampler of anim.samplers) {
    duration = Math.max(duration, gltf.accessors[sampler.input].max?.[0] ?? 0);
  }
  const paths = new Set(anim.channels.map((c) => c.target.path));
  console.log(`  ${anim.name}: ${round(duration)} s, ${anim.channels.length} canales [${[...paths].join(', ')}]`);
}

console.log(`\nmateriales (${gltf.materials?.length ?? 0}):`);
for (const mat of gltf.materials ?? []) {
  const pbr = mat.pbrMetallicRoughness ?? {};
  const color = (pbr.baseColorFactor ?? [1, 1, 1, 1]).map(round).join(', ');
  const texture = pbr.baseColorTexture ? ' +textura' : '';
  console.log(`  ${mat.name}: color [${color}]${texture}`);
}
console.log(`texturas: ${gltf.textures?.length ?? 0}, imágenes: ${gltf.images?.length ?? 0}`);

console.log(`\nmallas (${gltf.meshes?.length ?? 0}):`);
for (const mesh of gltf.meshes ?? []) {
  const vertices = mesh.primitives.reduce((sum, p) => sum + gltf.accessors[p.attributes.POSITION].count, 0);
  const targets = mesh.primitives[0].targets?.length ?? 0;
  const targetNames = mesh.extras?.targetNames ?? [];
  const mats = mesh.primitives.map((p) => gltf.materials?.[p.material]?.name ?? '-').join(', ');
  console.log(`  ${mesh.name}: ${mesh.primitives.length} primitivas, ${vertices} vértices, materiales [${mats}], morph targets ${targets} [${targetNames.join(', ')}]`);
}

for (const skin of gltf.skins ?? []) {
  console.log(`\nskin "${skin.name ?? ''}": ${skin.joints.length} huesos`);
  if (flags.includes('--bones')) {
    const parentOf = new Map();
    gltf.nodes.forEach((node, i) => (node.children ?? []).forEach((c) => parentOf.set(c, i)));
    const depth = (i) => (parentOf.has(i) ? depth(parentOf.get(i)) + 1 : 0);
    for (const joint of skin.joints) {
      const node = gltf.nodes[joint];
      const t = (node.translation ?? [0, 0, 0]).map(round).join(', ');
      console.log(`  ${'  '.repeat(depth(joint))}${node.name}  t[${t}]`);
    }
  }
}

const scene = gltf.scenes?.[gltf.scene ?? 0];
console.log(`\nnodos raíz: ${scene?.nodes.map((n) => gltf.nodes[n].name).join(', ')}`);
