// Copia el instalador generado por `tauri build` a la carpeta raíz del proyecto,
// para no tener que buscarlo dentro de src-tauri/target.
import { copyFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bundle = join(root, 'src-tauri/target/release/bundle/nsis');

let installers;
try {
  installers = readdirSync(bundle).filter((name) => name.endsWith('-setup.exe'));
} catch {
  installers = [];
}
if (installers.length === 0) {
  console.error(`No hay ningún instalador en ${bundle}. Ejecuta antes "npm run tauri build".`);
  process.exit(1);
}

// Si hay varios (de versiones anteriores), el más reciente.
const newest = installers
  .map((name) => ({ name, time: statSync(join(bundle, name)).mtimeMs }))
  .sort((a, b) => b.time - a.time)[0].name;
copyFileSync(join(bundle, newest), join(root, newest));
console.log(`Instalador copiado a ${join(root, newest)}`);
