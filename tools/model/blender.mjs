// Lo que comparten las construcciones de modelos (build.mjs y build-bed.mjs): dónde está Blender,
// cómo se le pasa un script y cómo se valida el GLB que sale.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const blender = process.env.BLENDER ?? 'C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe';
if (!existsSync(blender)) {
  console.error(`No se encuentra Blender en "${blender}". Indica la ruta con la variable BLENDER.`);
  process.exit(1);
}

/** Ejecuta un script de Blender sin interfaz y enseña solo las líneas que el script marca como suyas. */
export function runBlender(script, args) {
  const out = execFileSync(
    blender,
    ['-b', '--factory-startup', '--python-exit-code', '1', '-P', resolve(root, script), '--', ...args],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  for (const line of out.split('\n')) {
    if (/^\[(build|preview)\]/.test(line)) console.log(line.trimEnd());
  }
}

export function validate(glb) {
  execFileSync(process.execPath, [resolve(root, 'node_modules/@gltf-transform/cli/bin/cli.js'), 'validate', glb], {
    stdio: 'inherit',
  });
}
