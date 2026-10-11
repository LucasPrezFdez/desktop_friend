// Regenera public/models/dog.glb: construye el perro con Blender, lo valida y renderiza una hoja de revisión.
// Uso: npm run model   (variable BLENDER para indicar otro ejecutable)
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const blender = process.env.BLENDER ?? 'C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe';
if (!existsSync(blender)) {
  console.error(`No se encuentra Blender en "${blender}". Indica la ruta con la variable BLENDER.`);
  process.exit(1);
}

const source = resolve(root, 'assets/source/quaternius/Husky.glb');
const built = resolve(root, 'tools/model/out/dog.glb');
const sheet = resolve(root, 'tools/model/out/dog_sheet.png');
const target = resolve(root, 'public/models/dog.glb');

const EXPECTED_CLIPS = [
  'Carry', 'Eat', 'Happy', 'Idle', 'IdleLook', 'Lie', 'LieDown', 'Run', 'Sad', 'Sit', 'SitDown', 'Sleep', 'Sniff', 'Walk',
];
const SHOTS = [
  'rest@three', 'rest@front', 'Sit:0.5@side', 'Sit:0.5@three',
  'Lie:0.5@side', 'Lie:0.5@three', 'Sleep:0.5@side', 'Sleep:0.5@three',
  'Happy:0.5@side', 'Sad:0.5@side', 'Walk:0.25@side', 'Eat:0.5@side',
  'Carry:0@front', 'Carry:0.25@front', 'Carry:0.75@front', 'Carry:0.25@side',
].join(',');

function runBlender(script, args) {
  const out = execFileSync(
    blender,
    ['-b', '--factory-startup', '--python-exit-code', '1', '-P', resolve(root, script), '--', ...args],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  for (const line of out.split('\n')) {
    if (/^\[(build|preview)\]/.test(line)) console.log(line.trimEnd());
  }
}

runBlender('tools/model/build_dog.py', ['--in', source, '--out', built]);

// Un clip sin slot se exporta vacío sin dar error: se comprueba que están todos y que duran algo.
const inspection = execFileSync(process.execPath, [resolve(root, 'tools/model/inspect.mjs'), built], { encoding: 'utf8' });
const found = new Map([...inspection.matchAll(/^ {2}(\w+): ([\d.]+) s,/gm)].map((m) => [m[1], Number(m[2])]));
const broken = EXPECTED_CLIPS.filter((name) => !(found.get(name) > 0));
if (broken.length) {
  console.error(`Clips ausentes o vacíos: ${broken.join(', ')}`);
  process.exit(1);
}

execFileSync(process.execPath, [resolve(root, 'node_modules/@gltf-transform/cli/bin/cli.js'), 'validate', built], {
  stdio: 'inherit',
});

runBlender('tools/model/preview.py', ['--in', built, '--out', sheet, '--shots', SHOTS, '--size', '300', '--cols', '4']);

mkdirSync(dirname(target), { recursive: true });
copyFileSync(built, target);
console.log(`Modelo listo: ${target}`);
console.log(`Hoja de revisión: ${sheet}`);
