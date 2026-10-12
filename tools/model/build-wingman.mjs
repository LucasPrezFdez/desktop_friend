// Regenera public/models/wingman.glb: le pone las animaciones a Wingman con Blender, lo valida y
// renderiza una hoja de revisión.
// Uso: npm run model:wingman   (variable BLENDER para indicar otro ejecutable;
//                               variable WINGMAN_SOURCE para indicar otro fichero de origen)
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { root, runBlender, validate } from './blender.mjs';

const source = process.env.WINGMAN_SOURCE ?? resolve(root, 'assets/source/riot/Wingman.glb');
const built = resolve(root, 'tools/model/out/wingman.glb');
const sheet = resolve(root, 'tools/model/out/wingman_sheet.png');
const floorSheet = resolve(root, 'tools/model/out/wingman_floor.png');
const headSheet = resolve(root, 'tools/model/out/wingman_head.png');
const target = resolve(root, 'public/models/wingman.glb');

if (!existsSync(source)) {
  // El modelo es de Riot Games y no se versiona: ver assets/source/riot/PROCEDENCIA.md.
  console.error(`No se encuentra el modelo de origen en "${source}". Indica la ruta con la variable WINGMAN_SOURCE.`);
  process.exit(1);
}

// Los mismos que el perro: la app los pide por su nombre, sea cual sea la mascota.
const EXPECTED_CLIPS = [
  'Carry', 'Eat', 'Happy', 'Idle', 'IdleLook', 'Lie', 'LieDown', 'Nap', 'Run', 'Sad', 'Sit', 'SitDown', 'Sleep', 'Sniff', 'Walk',
];
const SHOTS = [
  'Idle:0@three', 'Idle:0@front', 'Idle:0@side', 'IdleLook:0.3@front',
  'Walk:0.25@side', 'Walk:0.5@side', 'Walk:0.25@front', 'Run:0.25@side',
  'Sniff:0.4@side', 'Sniff:0.4@three', 'Eat:0.3@side', 'Eat:0.3@three',
  'Sit:0.5@side', 'Sit:0.5@front', 'Happy:0.5@front', 'Sad:0.5@side',
  'Carry:0.25@front', 'Carry:0.75@front', 'Carry:0.25@side', 'SitDown:0.5@side',
].join(',');
// Tumbado ocupa más a lo largo que de pie: va en otra hoja, encuadrada más abajo y hacia delante.
const FLOOR_SHOTS = [
  'LieDown:0.45@side', 'LieDown:0.75@side', 'Lie:0.5@side', 'Lie:0.5@three',
  'Sleep:0.5@side', 'Sleep:0.5@three', 'Lie:0.5@top', 'Lie:0.5@front',
  // En la cama se le ve desde su derecha: de lado, como en la app, y desde arriba.
  'Nap:0.5@-1/0/0.1', 'Nap:0.5@-0.96/-0.27/0.12', 'Nap:0.5@top', 'Nap:0.5@front',
].join(',');

runBlender('tools/model/build_wingman.py', ['--in', source, '--out', built]);

// Un clip sin slot se exporta vacío sin dar error: se comprueba que están todos y que duran algo.
const inspection = execFileSync(process.execPath, [resolve(root, 'tools/model/inspect.mjs'), built], { encoding: 'utf8' });
const found = new Map([...inspection.matchAll(/^ {2}(\w+): ([\d.]+) s,/gm)].map((m) => [m[1], Number(m[2])]));
const broken = EXPECTED_CLIPS.filter((name) => !(found.get(name) > 0));
if (broken.length) {
  console.error(`Clips ausentes o vacíos: ${broken.join(', ')}`);
  process.exit(1);
}

validate(built);

// El encuadre se da a mano: el modelo en reposo tiene los brazos en cruz y saldría muy pequeño.
runBlender('tools/model/preview.py', [
  '--in', built, '--out', sheet, '--shots', SHOTS, '--size', '300', '--cols', '4', '--floor', '--frame', '0,0,0.55,0.95',
]);
runBlender('tools/model/preview.py', [
  '--in', built, '--out', floorSheet, '--shots', FLOOR_SHOTS, '--size', '300', '--cols', '4', '--floor',
  '--frame', '0,-0.4,0.3,1.05',
]);
// Sin los ojos, para ver qué caras se han separado en su material.
runBlender('tools/model/preview.py', [
  '--in', built, '--out', headSheet, '--shots', 'Idle:0@front,Idle:0@three,Idle:0@side', '--size', '360', '--cols', '3',
  '--frame', '0,0,0.88,0.5', '--hide', 'WingmanEye',
]);

mkdirSync(dirname(target), { recursive: true });
copyFileSync(built, target);
console.log(`Modelo listo: ${target}`);
console.log(`Hojas de revisión: ${sheet}, ${floorSheet} y ${headSheet}`);
