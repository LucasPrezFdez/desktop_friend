# Bitácora de acciones

Registro cronológico de todo lo que se hace en el proyecto. Cada fila indica la acción, cómo se hizo, el resultado y la decisión o el commit relacionados. Las decisiones están en `docs/decisiones/`.

## 2026-10-11

### Investigación y planificación (sin cambios en el equipo)

| Nº | Acción | Cómo | Resultado | Referencia |
|---|---|---|---|---|
| 1 | Revisar la carpeta del proyecto | Listado de ficheros | Vacía, sin git | `investigacion.md`, punto de partida |
| 2 | Revisar las herramientas instaladas | Consulta de versiones en PowerShell | Hay Node 24.21.0, npm 11.19.0, Git 2.56.0, VS Code, WebView2 154 y GPU RTX 2060 SUPER. Faltan Rust, Blender, Godot, .NET y Python | `investigacion.md`, punto de partida |
| 3 | Investigar el framework de la app | Agente de búsqueda web: 95 consultas a documentación, issues y repositorios | Recomienda Tauri 2 + Three.js y, como segunda opción, Electron + Three.js | `investigacion.md`, parte 1 |
| 4 | Investigar la creación del modelo 3D | Agente de búsqueda web: 109 consultas. Se reorientó a mitad al saber que la mascota sería un perro negro | Recomienda un asset libre de Quaternius retocado con Blender en modo script | `investigacion.md`, parte 2 |
| 5 | Preguntar al usuario alcance, mascota y plataforma | Tres preguntas | Construir la app completa; perro mediano negro; solo Windows | Decisiones 0001, 0002, 0003 |
| 6 | Comprobar requisitos de compilación | Consulta de `vswhere`, winget, disco y memoria | Sin Build Tools de C++ ni rustup; winget 1.29; 74 GB libres; 16 GB de RAM | Decisión 0007 |
| 7 | Preguntar al usuario framework, modelo y registro | Tres preguntas | Tauri 2 + Three.js; base libre + Blender; docs en el repo + git | Decisiones 0004, 0005, 0006 |
| 8 | Escribir y aprobar el plan | Plan de ocho hitos | Aprobado por el usuario | Decisión 0001 |

### Hito 0: documentación inicial y repositorio

| Nº | Hora | Acción | Cómo | Resultado | Referencia |
|---|---|---|---|---|---|
| 9 | 14:52 | Crear el repositorio | `git init -b main` | Repositorio vacío en `main` | Decisión 0006 |
| 10 | 14:52 | Confirmar identificadores de winget | `winget search` | `Rustlang.Rustup` 1.29.1, `Microsoft.VisualStudio.2022.BuildTools` 17.14.41 (también existe la 2026, 18.10.2), `BlenderFoundation.Blender` 5.2.2 | Decisión 0007 |
| 11 | 14:55 | Escribir `.gitignore` y `CLAUDE.md` | Ficheros nuevos | `CLAUDE.md` fija la regla de documentación y las convenciones | Decisión 0006 |
| 12 | 15:00 | Escribir el informe de investigación | `docs/investigacion.md` | Dos partes, con tablas, fiabilidad de cada dato y fuentes | |
| 13 | 15:05 | Registrar las decisiones 0001 a 0007 | `docs/decisiones/` | Siete decisiones | |

### Hito 1: herramientas

| Nº | Hora | Acción | Cómo | Resultado | Referencia |
|---|---|---|---|---|---|
| 14 | 14:54 | Instalar Blender, Rust y Build Tools 2022 | `winget install` en segundo plano, en ese orden; las Build Tools con `--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended` | Las tres instaladas a las 14:59 con código de salida 0 | Decisión 0007 |
| 15 | 15:00 | Verificar las herramientas | `blender --version`, `rustc --version`, `cargo --version`, `vswhere` | Blender 5.2.2 LTS, rustc 1.99.0, cargo 1.99.0, cadena `stable-x86_64-pc-windows-msvc`, Build Tools en `C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools` | |
| 16 | 15:01 | Commit inicial y rama de trabajo | `git commit` en `main`, `git checkout -b desarrollo` | Commit `4ad3c1e` | Decisión 0006 |

### Hito 3 (adelantado): obtención e inspección del modelo base

Se hizo mientras compilaba Rust, porque no dependía de ello.

| Nº | Hora | Acción | Cómo | Resultado | Referencia |
|---|---|---|---|---|---|
| 17 | 14:57 | Localizar las descargas | Lectura del HTML de las páginas de Poly Pizza | URL directas de los GLB de Husky y Shiba Inu; licencia mostrada CC0 1.0 | `assets/source/quaternius/PROCEDENCIA.md` |
| 18 | 14:57 | Descargar los dos modelos | `curl` a `assets/source/quaternius/` | `Husky.glb` (927 536 bytes) y `ShibaInu.glb` (851 196 bytes); no hizo falta intervención del usuario | Decisión 0009 |
| 19 | 15:02 | Escribir un inspector de GLB | `tools/model/inspect.mjs` | Lista clips, materiales, mallas y huesos | |
| 20 | 15:03 | Inspeccionar ambos modelos | `node tools/model/inspect.mjs` | Materiales de color plano, 12 clips útiles incluidos `Walk` y `Eating`, 49 y 46 huesos | Decisión 0009 |
| 21 | 15:06 | Escribir el render de previsualización | `tools/model/preview.py` (Blender sin interfaz) | Hoja de contactos PNG; EEVEE funciona sin interfaz en este equipo, no hizo falta Cycles | |
| 22 | 15:08 | Renderizar y comparar los dos modelos | `blender -b -P tools/model/preview.py` | Elegido el Husky por su cola recta | Decisión 0009 |
| 23 | 15:20 | Medir el esqueleto del Husky | Script temporal de Blender | Las patas dependen de huesos de control sueltos: hará falta resolver cinemática inversa en el script | Decisión 0009 |

### Hito 2: prototipo de ventana transparente

| Nº | Hora | Acción | Cómo | Resultado | Referencia |
|---|---|---|---|---|---|
| 24 | 15:00 | Consultar versiones de dependencias | `npm view` | three 0.186.1, vite 8.3.4, typescript 7.0.2, vitest 5.0.3, @tauri-apps/cli 2.12.2, @tauri-apps/api 2.12.3 | |
| 25 | 15:01 | Crear `package.json` e instalar | `npm install` | 226 paquetes en 29 s | |
| 26 | 15:10 | Escribir la parte nativa | `src-tauri/` (`Cargo.toml`, `tauri.conf.json`, `capabilities/default.json`, `src/lib.rs`, `src/main.rs`) | Ventana transparente, bandeja con menú, instancia única, arranque con Windows y persistencia | Decisión 0004 |
| 27 | 15:12 | Generar un icono provisional | Render del Husky + `npx tauri icon` | Iconos en `src-tauri/icons/`; se sustituirán por el perro negro | |
| 28 | 15:13 | Primera compilación de Rust | `cargo build` | Correcta a la primera en 2 min 8 s | Decisión 0008 |
| 29 | 15:15 | Escribir el frontend del prototipo | `index.html`, `vite.config.ts`, `tsconfig.json`, `src/style.css`, `src/desktop.ts`, `src/scene.ts`, `src/clickThrough.ts`, `src/main.ts` | `npx tsc --noEmit` sin errores | Decisión 0004 |
| 30 | 15:22 | Escribir las pruebas de escritorio | `tools/verify/clickthrough.ps1` y `screenshot.ps1` | Preguntan a Windows qué ventana recibiría un clic y capturan la zona de la ventana | |
| 31 | 15:25 | Arrancar la app real | `npm run tauri dev` | Arranca; ventana de 420×340 visible | |
| 32 | 15:27 | Corregir las pruebas | `[NullString]::Value` en lugar de `$null` al llamar a `FindWindowW` | PowerShell pasaba una cadena vacía y no encontraba la ventana | |
| 33 | 15:28 | Probar los clics que atraviesan | `clickthrough.ps1` | Tres ejecuciones con resultados incoherentes | Decisión 0008, incidencia |
| 34 | 15:31 | Diagnosticar | Muestreo del estado de la ventana cada 50 ms con el cursor quieto | Estado estable y cambio en menos de 100 ms: no hay oscilación | Decisión 0008 |
| 35 | 15:34 | Hacer la prueba robusta | La prueba mide la latencia y detecta si el ratón se movió | Ocho ejecuciones correctas, de 56 a 149 ms | Decisión 0008 |
| 36 | 15:35 | Capturar la ventana | `screenshot.ps1` | Sin fondo, borde ni marco | Decisión 0008 |
| 37 | 15:36 | Medir el consumo en reposo | Suma de los procesos de la app | Unos 400 MB y 14 % de un núcleo en modo desarrollo | Decisión 0008 |
