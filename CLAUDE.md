# DesktopFriend

Mascota de escritorio 3D (perro mediano negro; desde la decisión 0021, también Wingman) para Windows 11. Tauri 2 + Three.js + TypeScript + Vite. Los modelos se generan con Blender en modo script (`tools/model/build_dog.py`, `tools/model/build_wingman.py` y `tools/model/build_bed.py`).

## Regla de documentación (obligatoria)

Toda decisión y toda acción se documentan, en español, antes de cerrar el trabajo:

- **Decisiones**: un fichero nuevo en `docs/decisiones/NNNN-titulo.md` con fecha, contexto, opciones consideradas, decisión, consecuencias y fuentes. No se reescriben las decisiones antiguas: si una cambia, se añade otra que la sustituye y se enlazan.
- **Acciones**: una fila nueva en `docs/bitacora.md` (qué se hizo, comando o fichero, resultado, referencia a la decisión o al commit).
- **Horas**: en la bitácora solo se anotan horas comprobadas (salidas de herramientas, `git log`). No se estiman.
- **Investigación**: `docs/investigacion.md` recoge los hechos y sus fuentes, marcando cada dato como verificado [V], inferido [I] o no verificado [NV].

## Convenciones

- El único módulo que puede importar `@tauri-apps/*` es `src/desktop.ts`.
- La simulación de necesidades usa marcas de tiempo, nunca conteo de frames.
- Todas las mascotas traen los mismos clips, con los mismos nombres (`ClipName` en `src/pet.ts`). Lo que cambia de una a otra va en su clase (`src/dog.ts`, `src/wingman.ts`), no en `src/behavior.ts`.
- El modelo de Wingman es de Riot Games y no se versiona: ni `assets/source/riot/*.glb` ni `public/models/wingman.glb` (decisión 0021).
- Git: trabajo en la rama `desarrollo`, un commit por hito verificado.

## Comandos

- `npm run dev`: frontend en el navegador (con el puente nativo simulado).
- `npm run tauri dev`: app real.
- `npx vitest run`: pruebas unitarias.
- `npm run model`: regenera `public/models/dog.glb` con Blender.
- `npm run model:bed`: regenera `public/models/bed.glb` (la cama) con Blender.
- `npm run model:wingman`: regenera `public/models/wingman.glb` con Blender, a partir de `assets/source/riot/Wingman.glb`.
- `npm run installer`: compila y deja el instalador NSIS en la carpeta raíz.
- `tools/verify/`: verificación de la app en marcha (ver `docs/decisiones/0012-como-se-verifica.md`).
