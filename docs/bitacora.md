# Bitácora de acciones

Registro cronológico de todo lo que se hace en el proyecto. Cada fila indica la acción, cómo se hizo, el resultado y la decisión o el commit relacionados. Las decisiones están en `docs/decisiones/`.

## 2026-10-11

Las filas siguen el orden en que se hicieron las cosas. No llevan hora porque no se registró una por acción; estas son las horas comprobadas en las salidas de las herramientas y en git:

| Hora | Hecho |
|---|---|
| 14:52 | Se crea el repositorio y empieza la ejecución del plan |
| 14:57 | Descargados los dos modelos de Quaternius |
| 14:59 | Terminan las instalaciones de Blender, Rust y Build Tools |
| 15:04 | Termina la primera compilación de Rust |
| 15:14 | Primer GLB del perro negro generado |
| 15:19 | Commit del hito 3 |
| 15:27 | Tipos correctos y 24 pruebas en verde con la app completa |
| 15:34 | Commit de los hitos 4, 5 y 6 |
| 15:39 | Captura de la barra de tareas con la versión empaquetada ya corregida |

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

| Nº | Acción | Cómo | Resultado | Referencia |
|---|---|---|---|---|
| 9 | Crear el repositorio | `git init -b main` | Repositorio vacío en `main` | Decisión 0006 |
| 10 | Confirmar identificadores de winget | `winget search` | `Rustlang.Rustup` 1.29.1, `Microsoft.VisualStudio.2022.BuildTools` 17.14.41 (también existe la 2026, 18.10.2), `BlenderFoundation.Blender` 5.2.2 | Decisión 0007 |
| 11 | Escribir `.gitignore` y `CLAUDE.md` | Ficheros nuevos | `CLAUDE.md` fija la regla de documentación y las convenciones | Decisión 0006 |
| 12 | Escribir el informe de investigación | `docs/investigacion.md` | Dos partes, con tablas, fiabilidad de cada dato y fuentes | |
| 13 | Registrar las decisiones 0001 a 0007 | `docs/decisiones/` | Siete decisiones | |

### Hito 1: herramientas

| Nº | Acción | Cómo | Resultado | Referencia |
|---|---|---|---|---|
| 14 | Instalar Blender, Rust y Build Tools 2022 | `winget install` en segundo plano, en ese orden; las Build Tools con `--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended` | Las tres instaladas a las 14:59 con código de salida 0 | Decisión 0007 |
| 15 | Verificar las herramientas | `blender --version`, `rustc --version`, `cargo --version`, `vswhere` | Blender 5.2.2 LTS, rustc 1.99.0, cargo 1.99.0, cadena `stable-x86_64-pc-windows-msvc`, Build Tools en `C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools` | |
| 16 | Commit inicial y rama de trabajo | `git commit` en `main`, `git checkout -b desarrollo` | Commit `4ad3c1e` | Decisión 0006 |

### Hito 3 (adelantado): obtención e inspección del modelo base

Se hizo mientras compilaba Rust, porque no dependía de ello.

| Nº | Acción | Cómo | Resultado | Referencia |
|---|---|---|---|---|
| 17 | Localizar las descargas | Lectura del HTML de las páginas de Poly Pizza | URL directas de los GLB de Husky y Shiba Inu; licencia mostrada CC0 1.0 | `assets/source/quaternius/PROCEDENCIA.md` |
| 18 | Descargar los dos modelos | `curl` a `assets/source/quaternius/` | `Husky.glb` (927 536 bytes) y `ShibaInu.glb` (851 196 bytes); no hizo falta intervención del usuario | Decisión 0009 |
| 19 | Escribir un inspector de GLB | `tools/model/inspect.mjs` | Lista clips, materiales, mallas y huesos | |
| 20 | Inspeccionar ambos modelos | `node tools/model/inspect.mjs` | Materiales de color plano, 12 clips útiles incluidos `Walk` y `Eating`, 49 y 46 huesos | Decisión 0009 |
| 21 | Escribir el render de previsualización | `tools/model/preview.py` (Blender sin interfaz) | Hoja de contactos PNG; EEVEE funciona sin interfaz en este equipo, no hizo falta Cycles | |
| 22 | Renderizar y comparar los dos modelos | `blender -b -P tools/model/preview.py` | Elegido el Husky por su cola recta | Decisión 0009 |
| 23 | Medir el esqueleto del Husky | Script temporal de Blender | Las patas dependen de huesos de control sueltos: hará falta resolver cinemática inversa en el script | Decisión 0009 |

### Hito 2: prototipo de ventana transparente

| Nº | Acción | Cómo | Resultado | Referencia |
|---|---|---|---|---|
| 24 | Consultar versiones de dependencias | `npm view` | three 0.186.1, vite 8.3.4, typescript 7.0.2, vitest 5.0.3, @tauri-apps/cli 2.12.2, @tauri-apps/api 2.12.3 | |
| 25 | Crear `package.json` e instalar | `npm install` | 226 paquetes en 29 s | |
| 26 | Escribir la parte nativa | `src-tauri/` (`Cargo.toml`, `tauri.conf.json`, `capabilities/default.json`, `src/lib.rs`, `src/main.rs`) | Ventana transparente, bandeja con menú, instancia única, arranque con Windows y persistencia | Decisión 0004 |
| 27 | Generar un icono provisional | Render del Husky + `npx tauri icon` | Iconos en `src-tauri/icons/`; se sustituirán por el perro negro | |
| 28 | Primera compilación de Rust | `cargo build` | Correcta a la primera en 2 min 8 s | Decisión 0008 |
| 29 | Escribir el frontend del prototipo | `index.html`, `vite.config.ts`, `tsconfig.json`, `src/style.css`, `src/desktop.ts`, `src/scene.ts`, `src/clickThrough.ts`, `src/main.ts` | `npx tsc --noEmit` sin errores | Decisión 0004 |
| 30 | Escribir las pruebas de escritorio | `tools/verify/clickthrough.ps1` y `screenshot.ps1` | Preguntan a Windows qué ventana recibiría un clic y capturan la zona de la ventana | |
| 31 | Arrancar la app real | `npm run tauri dev` | Arranca; ventana de 420×340 visible | |
| 32 | Corregir las pruebas | `[NullString]::Value` en lugar de `$null` al llamar a `FindWindowW` | PowerShell pasaba una cadena vacía y no encontraba la ventana | |
| 33 | Probar los clics que atraviesan | `clickthrough.ps1` | Tres ejecuciones con resultados incoherentes | Decisión 0008, incidencia |
| 34 | Diagnosticar | Muestreo del estado de la ventana cada 50 ms con el cursor quieto | Estado estable y cambio en menos de 100 ms: no hay oscilación | Decisión 0008 |
| 35 | Hacer la prueba robusta | La prueba mide la latencia y detecta si el ratón se movió | Ocho ejecuciones correctas, de 56 a 149 ms | Decisión 0008 |
| 36 | Capturar la ventana | `screenshot.ps1` | Sin fondo, borde ni marco | Decisión 0008 |
| 37 | Medir el consumo en reposo | Suma de los procesos de la app | Unos 400 MB y 14 % de un núcleo en modo desarrollo | Decisión 0008 |

### Hito 3: modelo 3D del perro negro

| Nº | Acción | Cómo | Resultado | Referencia |
|---|---|---|---|---|
| 38 | Escribir el script del modelo | `tools/model/build_dog.py` | Limpieza, recoloreado, collar, chapa, lengua y siete clips nuevos | Decisión 0010 |
| 39 | Primera generación | `blender -b -P tools/model/build_dog.py` | GLB con 13 clips y 8 materiales a la primera; chapa en la nuca, lengua flotando y patas traseras mal plegadas | Decisión 0010 |
| 40 | Añadir encuadre manual al render | Opción `--frame` en `preview.py` | Primer plano de la cabeza | |
| 41 | Corregir chapa, lengua y plegado | Edición del script | Cabeza y sentado correctos; tumbado seguía mal | Decisión 0010 |
| 42 | Diagnosticar el tumbado | Imprimir las posiciones de las articulaciones (`DOG_DEBUG=1`) | La armadura está girada 90° respecto al mundo: los desplazamientos iban por el eje equivocado | Decisión 0010 |
| 43 | Rehacer el cálculo en coordenadas de mundo | Clase `Rig` del script | Las articulaciones coinciden con el cálculo a mano; todas las poses correctas | Decisión 0010 |
| 44 | Automatizar | `tools/model/build.mjs` y `npm run model` | Construye, comprueba clips, valida, renderiza la hoja y copia a `public/models/dog.glb` | Decisión 0010 |
| 45 | Validar | `gltf-transform validate` | Sin errores; un aviso heredado del original | Decisión 0010 |

### Hitos 4, 5 y 6: el perro en la app, su cuidado y el escritorio

Se hicieron juntos porque comparten ficheros y se verifican a la vez en la app real.

| Nº | Acción | Cómo | Resultado | Referencia |
|---|---|---|---|---|
| 46 | Corregir la bitácora | Se quitan las horas por fila | Eran estimaciones mías y no coincidían con el reloj; quedan solo las comprobadas | |
| 47 | Escribir el modelo de necesidades y sus pruebas | `src/needs.ts`, `tests/needs.test.ts` | 20 pruebas en verde | Decisión 0011 |
| 48 | Escribir el material del pelaje y las luces | `src/blackFur.ts` | Sombreado de tres tonos con borde de luz | Decisión 0011 |
| 49 | Escribir la carga y animación del perro | `src/dog.ts` | Clips con fundidos, cola, reacción a caricias y parpadeo encima del clip activo | Decisiones 0010 y 0011 |
| 50 | Escribir sombra, cuenco e interfaz | `src/props.ts`, `src/ui.ts`, estilos | Panel de estado, bocadillo, corazones y aviso | Decisión 0011 |
| 51 | Escribir los gestos del ratón | `src/interaction.ts` | Frotar, coger y clic | Decisión 0011 |
| 52 | Escribir el comportamiento | `src/behavior.ts`, `tests/behavior.test.ts` | Máquina de estados; 4 pruebas más | Decisión 0011 |
| 53 | Unirlo todo | `src/main.ts` | `tsc` sin errores, 24 pruebas en verde | |
| 54 | Escribir la herramienta de depuración | `tools/verify/cdp.mjs` y relanzar la app con el puerto de depuración de WebView2 | Permite forzar actividades y capturar la ventana | Decisión 0012 |
| 55 | Primera captura del perro en la app | `cdp.mjs --shot` | Sin errores, pero el perro se veía gris azulado | Decisión 0011 |
| 56 | Oscurecer el pelaje y suavizar luces y borde | `src/blackFur.ts` | Se lee como negro sobre fondo claro, gris y azul marino | Decisión 0011 |
| 57 | Escribir el mosaico de capturas | `tools/verify/sheet.ps1` | Tras corregir un error de tipos al crear la imagen | Decisión 0012 |
| 58 | Verificar sentarse, tumbarse, dormir y triste | `cdp.mjs` forzando cada actividad | Correctos en la app real | Decisión 0012 |
| 59 | Verificar comer, caricias, panel y paseo | `cdp.mjs` | Ración: saciedad de 30 a 65; corazones y ojos cerrados al acariciar; el paseo mueve la ventana unos 99 px por segundo | Decisión 0012 |
| 60 | Acercar el cuenco | `BOWL_X` de 1,02 a 0,86 | El hocico no llegaba al cuenco | |
| 61 | Escribir la simulación de ratón real | `tools/verify/input.ps1` | Frotar, clic y arrastrar | Decisión 0012 |
| 62 | Probar con el ratón real | `input.ps1` y lectura del estado con `cdp.mjs` | Frotar: felicidad de 40 a 54,8. Clic: abre el panel. Arrastrar: la ventana sube a (742, 860) y al soltar cae a 1052 | Decisión 0012 |
| 63 | Moderar las caricias | `PIXELS_PER_HAPPINESS` de 45 a 120 | Subía demasiado deprisa | Decisión 0011 |
| 64 | Probar los clics que atraviesan con el perro | `clickthrough.ps1`, tres veces | Correcto las tres, entre 58 y 116 ms | Decisión 0008 |
| 65 | Capturar el escritorio real | `screenshot.ps1` | Perro sin marco sobre el fondo de escritorio | |
| 66 | Bajar el encuadre | `lookAt` de la cámara de 1,0 a 1,2 | El perro pisa el borde de la barra de tareas | Decisión 0011 |
| 67 | Generar el icono definitivo | Render de la cabeza recortado en círculo (opción `--round` de `preview.py`) y `npx tauri icon` | Cabeza del perro sobre círculo ámbar, visible en barras oscuras | |
| 68 | Distinguir caricias en cabeza y lomo | `src/behavior.ts`, `src/interaction.ts` | Por distancia a la cabeza en pantalla, no con un rayo como preveía el plan | Decisión 0011 |
| 69 | Probar la orden de la bandeja y la instancia única | Evento `pet-command` enviado con `cdp.mjs`; segundo lanzamiento del ejecutable | Come y la saciedad pasa de 30 a 65; la segunda instancia se cierra y la primera trae al perro a x = 2060 | Decisión 0013 |
| 70 | Escribir el README | `README.md` | Uso, desarrollo, estructura y créditos | |

### Hito 7: empaquetado y cierre

| Nº | Acción | Cómo | Resultado | Referencia |
|---|---|---|---|---|
| 71 | Tratar la suspensión del equipo | `advance()` en `src/needs.ts` con dos pruebas | Un salto del reloj de más de un minuto cuenta como app cerrada; 26 pruebas en verde | Decisión 0011 |
| 72 | Generar el instalador | `npm run tauri build` | NSIS de 2,38 MB; ejecutable de 9,8 MB | Decisión 0013 |
| 73 | Probar la versión empaquetada | `clickthrough.ps1`, tres veces | Correcto | Decisión 0013 |
| 74 | Medir el consumo | Primera medida a mano; después `tools/verify/usage.ps1` | 32,7 % de un núcleo recién arrancada; 15,5 % en reposo; 194 MB | Decisión 0013 |
| 75 | Experimento sin el halo CSS | `cdp.mjs` cambiando el estilo en caliente | Sin diferencia (15,8 %): el halo se mantiene | Decisión 0013 |
| 76 | Capturar la barra de tareas | Captura de la franja inferior | El perro pisaba la barra: la ventana estaba 39 px demasiado baja | Decisión 0013 |
| 77 | Corregir la posición y ajustar fotogramas | `Behavior.relayout()`; 30, 20 o 10 fotogramas por segundo según la actividad | Ventana en y = 1052; consumo en reposo 12,8 % de un núcleo y 183 MB | Decisión 0013 |
| 78 | Comprobar la barra de tareas despejada | Orden "traer aquí" y captura | Sin botón de la app; el icono tapado era de otra aplicación | Decisión 0013 |
| 79 | Probar guardado y tiempo cerrada | Lectura de `pet.json`, ración por evento, cierre, `lastSeen` retrasado 3 horas y reapertura | Saciedad +35,0 al comer; tras reabrir −24,1 de saciedad, −15,0 de felicidad y energía al tope | Decisión 0013 |
| 80 | Instalar la app | Instalador con `/S` | Código 0; instalada en `%LOCALAPPDATA%DesktopFriend` con acceso en el menú Inicio | Decisión 0013 |
| 81 | Arrancar la versión instalada | Acceso del menú Inicio, `clickthrough.ps1` y captura | Correcto; queda en marcha | Decisión 0013 |
| 82 | Documentar el cierre | Decisiones 0011 a 0013 y esta bitácora | | |

### Después del cierre

| Nº | Acción | Cómo | Resultado | Referencia |
|---|---|---|---|---|
| 83 | Dejar el instalador en la carpeta raíz | `tools/copy-installer.mjs` y el comando `npm run installer` (compila y copia) | `DesktopFriend_0.1.0_x64-setup.exe` en la raíz del proyecto. Lo pidió el usuario para no tener que buscarlo en `src-tauri/target`. No se versiona en git porque se genera | |
| 84 | Diagnosticar por qué GitHub estaba vacío | `git remote -v`, `git branch -vv`, `git ls-remote` | El remoto estaba bien configurado, pero no se había hecho ningún `push`; el repositorio es público | Decisión 0014 |
| 85 | Preguntar al usuario ramas y modelos | Dos preguntas | Fusionar en `main` y subir todo, modelos incluidos | Decisión 0014 |
| 86 | Fusionar `desarrollo` en `main` | `git merge --ff-only desarrollo` | Avance rápido, sin reescribir historial | Decisión 0014 |
| 87 | Subir a GitHub | `git push -u origin main desarrollo` | Las dos ramas publicadas en https://github.com/LucasPrezFdez/desktop_friend con 78 ficheros versionados | Decisión 0014 |

### Arreglo: cabeza deformada al acariciar

| Nº | Acción | Cómo | Resultado | Referencia |
|---|---|---|---|---|
| 88 | Preparar la reproducción | Se cierra la app instalada y se arranca la de desarrollo con el puerto de depuración | Solo puede haber una instancia abierta | Decisión 0015 |
| 89 | Revisar el mezclador de Three.js | Lectura de `PropertyMixer.apply` | Solo reescribe un hueso si su valor cambia: hipótesis de que el giro de la caricia se acumula | Decisión 0015 |
| 90 | Escribir la prueba con cursor virtual | `tools/verify/pet-face.mjs` y `cdp-client.mjs` | Inyecta movimientos del ratón en la página y mide el giro de la cabeza, sin mover el ratón real | Decisión 0015 |
| 91 | Reproducir el fallo | Prueba en sentado, tumbado y de pie, con capturas | 179° sentado y tumbado, con 29 a 37° de residuo; 18° y 0,2° de pie | Decisión 0015 |
| 92 | Confirmar la causa | Comprobación de qué clips tienen fija la pista de la cabeza | Fija en `Sit`, `Lie`, `LieDown`, `Eat` y `Run`: coincide con dónde falla | Decisión 0015 |
| 93 | Medir la cola antes de arreglar | Se añade la cola a la prueba | Queda entre 43 y 67° de su giro inicial: mismo fallo | Decisión 0015 |
| 94 | Aplicar el arreglo | `src/dog.ts`: los huesos girados por la app vuelven al giro del clip antes de que actúe el mezclador | 11 líneas añadidas, único cambio en el código de la app. Un primer intento de edición por script falló por los finales de línea de Windows, sin modificar nada | Decisión 0015 |
| 95 | Verificar el arreglo | La misma prueba, con capturas, y pasadas de 6 y 12 s | 12° de máximo y 0,0° de residuo sentado y tumbado; de pie sin cambios; 26 pruebas en verde | Decisión 0015 |
| 96 | Actualizar la app instalada | `npm run installer`, instalación con `/S` y arranque desde el menú Inicio | Instalador y ejecutable instalado de las 16:01; app en marcha | Decisión 0015 |

### Propuesta: interfaz de círculos (rama `interfaz-circulos`)

| Nº | Acción | Cómo | Resultado | Referencia |
|---|---|---|---|---|
| 97 | Crear la rama de trabajo | `git checkout -b interfaz-circulos` desde `desarrollo` | La versión instalada y las demás ramas no se tocan | Decisión 0016 |
| 98 | Sustituir el panel por tres círculos | `src/ui.ts`, `src/style.css`, `src/main.ts` | Círculos con emoticono y anillo de nivel que salen del perro | Decisión 0016 |
| 99 | Capturar la animación de apertura | App de desarrollo y `cdp.mjs`, seis fotogramas | Salida escalonada con rebote y llenado de los anillos | Decisión 0016 |
| 100 | Probar el clic en el círculo de la comida | Clic con cursor virtual | Da de comer (saciedad de 40 a 75); lleno, avisa. Las esquinas de la caja capturaban el clic | Decisión 0016 |
| 101 | Limitar la captura de clics al círculo | `Hud.isUiAt` comprueba la distancia al centro | Esquina de la caja: ya no captura | Decisión 0016 |
| 102 | Capturar fondos y cierre | `cdp.mjs` y `screenshot.ps1` | Legible sobre claro, oscuro y el escritorio real | Decisión 0016 |
| 103 | Guardar las capturas de la propuesta | `docs/capturas/` | Dos mosaicos | Decisión 0016 |
| 104 | El usuario aprueba la propuesta | Probó la versión de la rama | Aprobada sin retoques; pide subir los cambios | Decisión 0016 |
| 105 | Actualizar la app instalada | `npm run installer`, instalación con `/S` y arranque desde el menú Inicio | Instalador de las 16:13; clics que atraviesan correctos | Decisión 0016 |
| 106 | Comprobar los círculos en la app instalada | Clic real con `input.ps1` y captura | El primer clic cayó en un hueco transparente mientras el perro se tumbaba y llegó a la ventana de debajo (el navegador del usuario, en una zona sin botones según la captura); no abrió los círculos | |
| 107 | Hacer segura la prueba de clic | `input.ps1` comprueba antes de pulsar que el clic lo recibiría la mascota; si no, no pulsa | Repetido: el clic abre los círculos en la app instalada | Decisión 0012 |
| 108 | Actualizar el README | Uso con los círculos | | Decisión 0016 |
| 109 | Fusionar y subir | `git merge --ff-only` en `desarrollo` y `main`, `git push` | Incluye también el arreglo de la cabeza (decisión 0015), que estaba sin subir | Decisiones 0015 y 0016 |
