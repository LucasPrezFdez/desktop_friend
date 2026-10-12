// Regenera public/models/bed.glb: modela la cama con Blender, la valida y renderiza una hoja de revisión.
// Uso: npm run model:bed   (variable BLENDER para indicar otro ejecutable)
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { root, runBlender, validate } from './blender.mjs';

const built = resolve(root, 'tools/model/out/bed.glb');
const sheet = resolve(root, 'tools/model/out/bed_sheet.png');
const target = resolve(root, 'public/models/bed.glb');

runBlender('tools/model/build_bed.py', ['--out', built]);
validate(built);
// La última vista es la de la app: de frente y casi a ras de suelo.
runBlender('tools/model/preview.py', [
  '--in', built, '--out', sheet, '--shots', 'rest@three,rest@side,rest@above,rest@0/-1/0.06', '--size', '360', '--cols', '2', '--floor',
]);

mkdirSync(dirname(target), { recursive: true });
copyFileSync(built, target);
console.log(`Cama lista: ${target}`);
console.log(`Hoja de revisión: ${sheet}`);
