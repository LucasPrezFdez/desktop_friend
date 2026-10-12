// Regenera public/models/dog.glb: construye el perro con Blender, lo valida y renderiza una hoja de revisión.
// Uso: npm run model   (variable BLENDER para indicar otro ejecutable)
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { root, runBlender, validate } from './blender.mjs';

const source = resolve(root, 'assets/source/quaternius/Husky.glb');
const built = resolve(root, 'tools/model/out/dog.glb');
const sheet = resolve(root, 'tools/model/out/dog_sheet.png');
const headSheet = resolve(root, 'tools/model/out/dog_head.png');
const target = resolve(root, 'public/models/dog.glb');

const EXPECTED_CLIPS = [
  'Carry', 'Eat', 'Happy', 'Idle', 'IdleLook', 'Lie', 'LieDown', 'Nap', 'Run', 'Sad', 'Sit', 'SitDown', 'Sleep', 'Sniff', 'Walk',
];
const SHOTS = [
  'rest@three', 'rest@front', 'Sit:0.5@side', 'Sit:0.5@three',
  'Lie:0.5@side', 'Lie:0.5@three', 'Sleep:0.5@side', 'Sleep:0.5@three',
  'Happy:0.5@side', 'Sad:0.5@side', 'Walk:0.25@side', 'Eat:0.5@side',
  'Carry:0@front', 'Carry:0.25@front', 'Carry:0.75@front', 'Carry:0.25@side',
  // En la cama se le ve desde su derecha: de lado, como en la app, desde arriba y de frente.
  'Nap:0.5@-1/0/0.1', 'Nap:0.5@-0.96/-0.27/0.12', 'Nap:0.5@top', 'Nap:0.5@front',
].join(',');

runBlender('tools/model/build_dog.py', ['--in', source, '--out', built]);

// Un clip sin slot se exporta vacío sin dar error: se comprueba que están todos y que duran algo.
const inspection = execFileSync(process.execPath, [resolve(root, 'tools/model/inspect.mjs'), built], { encoding: 'utf8' });
const found = new Map([...inspection.matchAll(/^ {2}(\w+): ([\d.]+) s,/gm)].map((m) => [m[1], Number(m[2])]));
const broken = EXPECTED_CLIPS.filter((name) => !(found.get(name) > 0));
if (broken.length) {
  console.error(`Clips ausentes o vacíos: ${broken.join(', ')}`);
  process.exit(1);
}

validate(built);

// La lengua se oculta en las hojas: la app solo la enseña cuando está contento.
runBlender('tools/model/preview.py', [
  '--in', built, '--out', sheet, '--shots', SHOTS, '--size', '300', '--cols', '4', '--hide', 'Tongue', '--floor',
]);
runBlender('tools/model/preview.py', [
  '--in', built, '--out', headSheet, '--shots', 'rest@front,rest@three,rest@side', '--size', '360', '--cols', '3',
  '--frame', '0,-1.95,2.2,1.25', '--hide', 'Tongue',
]);

mkdirSync(dirname(target), { recursive: true });
copyFileSync(built, target);
console.log(`Modelo listo: ${target}`);
console.log(`Hojas de revisión: ${sheet} y ${headSheet}`);
