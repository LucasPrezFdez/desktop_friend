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

### Propuesta: mano al arrastrar (rama `mano-al-arrastrar`)

| Nº | Acción | Cómo | Resultado | Referencia |
|---|---|---|---|---|
| 110 | Crear la rama de trabajo | `git checkout -b mano-al-arrastrar` desde `desarrollo` | | Decisión 0017 |
| 111 | Añadir el clip en brazos y el punto de la nuca | `tools/model/build_dog.py`: clip `Carry`, modo de patas en el aire y hueso `Nape`; `npm run model` | 14 clips, 50 huesos, validación sin errores | Decisión 0017 |
| 112 | Revisar la pose | Render con `preview.py` | Erguido, con las patas colgando y pataleo | Decisión 0017 |
| 113 | Escribir el guante, el levantamiento y el balanceo | `src/props.ts`, `src/behavior.ts`, `src/dog.ts`, `src/main.ts` | Un primer intento de edición falló por las comillas de la terminal, sin modificar nada | Decisión 0017 |
| 114 | Escribir la prueba de la secuencia | `tools/verify/carry.mjs` | Coge, mueve y suelta sin tocar el ratón real, y mide el balanceo | Decisión 0012 |
| 115 | Primera pasada | `carry.mjs` | Resultados sin sentido: el perro ya estaba cogido al empezar, probablemente por el ratón real del usuario. Repetida, correcta | Decisión 0017 |
| 116 | Revisar el guante de cerca | Primer plano acercando la cámara por depuración | El guante se lee bien de perfil; quedaba tapado de frente | Decisión 0017 |
| 117 | Ajustar orientación, tamaño y altura | Perfil al cogerlo, mano un 30 % mayor, altura 0,45 | Se entiende que lo lleva cogido | Decisión 0017 |
| 118 | Corregir el corte de las patas al soltarlo | El perro sigue recogido durante la caída | Sin recortes en la secuencia fotograma a fotograma | Decisión 0017 |
| 119 | Probar con el ratón real | `input.ps1 -Action drag` vigilando el estado con el depurador | quieto, cogido, cae, contento; balanceo de 5,1° | Decisión 0017 |
| 120 | Capturar sobre distintos fondos | `cdp.mjs` y `screenshot.ps1` | Legible en claro, oscuro y escritorio real. Una captura salió con el perro semitransparente; no se reprodujo en tres repeticiones | Decisión 0017 |
| 121 | Guardar las capturas de la propuesta | `docs/capturas/mano-*.png` | Cuatro mosaicos | Decisión 0017 |
| 122 | Preguntar al usuario si le gusta | Pregunta directa, como pidió | "Me gusta, con retoques": guante más pequeño y perro de frente con las patas colgando | Decisión 0017, revisión 2 |
| 123 | Ver la pose anterior de frente | Capturas con tres giros | De frente parece de pie, y la cabeza tapa el guante | Decisión 0017, revisión 2 |
| 124 | Rehacer la pose para verse de frente | `build_dog.py`: cuerpo casi vertical, patas colgando, pataleo en vertical; `npm run model` | Render revisado: se ve como un cachorro sostenido en alto | Decisión 0017, revisión 2 |
| 125 | Girar al perro de frente y reducir el guante | `src/behavior.ts`, `src/props.ts` | Con el guante sobre la cabeza parecía un gorro de cocinero, en dos alturas | Decisión 0017, revisión 2 |
| 126 | Recolocar el guante en diagonal junto al cuello | Inclinación y punto de agarre en `src/behavior.ts` | Se lee como una mano cogiendo el collar | Decisión 0017, revisión 2 |
| 127 | Dejarlo claramente en el aire | Patas traseras algo más recogidas y altura de 0,45 a 0,70 | A unos 30 px del suelo | Decisión 0017, revisión 2 |
| 128 | Verificar la versión nueva | `carry.mjs`, arrastre con el ratón real y capturas en claro y oscuro | Correcto; balanceo de 5,2° con el ratón real | Decisión 0017, revisión 2 |
| 129 | Guardar la secuencia de la versión nueva | `carry.mjs` y commit `9221b67` | **Captura no válida**: la prueba volvió a encontrarse al perro ya cogido, como en la acción 115 | Decisión 0017, revisión 2 |
| 130 | Averiguar qué lo soltaba | Tres rondas con un espía que anota quién llama a coger, soltar o traer, y los eventos reales de puntero | Nada lo suelta por su cuenta. En las dos capturas fallidas el perro estaba cogido y balanceándose antes de que la prueba diera la orden: era el usuario arrastrándolo con el ratón real | Decisión 0017, revisión 2 |
| 131 | Repetir y sustituir la captura | `carry.mjs`; mosaico revisado | `mano-v2-secuencia.png` corregida: subido 0,70, balanceo de 8,6° a cada lado, de 6,7° a 2,1° al parar | Decisión 0017, revisión 2 |
| 132 | El usuario aprueba la segunda versión | Pregunta directa | "Me gusta, impleméntalo" | Decisión 0017, resolución |
| 133 | Actualizar la app instalada | `npm run installer`, instalación con `/S` y arranque desde el menú Inicio | Instalador de 2,39 MB de las 16:50; app instalada en marcha | Decisión 0017, resolución |
| 134 | Comprobar los clics en la app instalada | `clickthrough.ps1` | Verdadero, falso, verdadero; con aviso de que el ratón se movió durante la prueba | Decisión 0017, resolución |
| 135 | Permitir sostener más tiempo en la prueba de arrastre | Parámetro `-HoldMs` en `input.ps1` | Para poder capturar al perro en el aire | Decisión 0012 |
| 136 | Comprobar el arrastre en la app instalada | `input.ps1 -Action drag -HoldMs 3000` y captura | Parcial: la captura muestra al perro ya soltado, de frente; el arrastre se cortó antes, probablemente por el ratón del usuario. No se repite para no interferir | Decisión 0017, resolución |
| 137 | Actualizar el README | Fila "Moverlo" | | Decisión 0017 |
| 138 | Fusionar y subir | `git merge --ff-only` en `desarrollo` y `main`, `git push` | | Decisión 0017, resolución |

## 2026-10-12

### Consulta: cuánto ocupa la app

| Nº | Acción | Cómo | Resultado | Referencia |
|---|---|---|---|---|
| 139 | Medir lo que ocupa en disco la carpeta del proyecto | Suma de tamaños por carpeta en PowerShell | 6,6 GB en total, de los que 6,4 GB son `src-tauri/target` (caché de compilación de Rust: `debug\deps` 2,6 GB, `release\deps` 1,3 GB, `debug\incremental` 0,7 GB). `node_modules` 166 MB. Ambas están en `.gitignore` y se regeneran | |
| 140 | Medir lo que ocupa la app instalada | Tamaño de `AppData\Local\DesktopFriend` y de `AppData\Local\dev.desktopfriend.pet`; memoria privada de `desktopfriend.exe` y sus procesos de WebView2 | Programa 9,8 MB; datos de WebView2 67,5 MB; instalador 2,4 MB; 204 MB de memoria privada con la app en marcha | Decisión 0013 |

### Modelo nuevo: retrato del perro del usuario (rama `nuevo-modelo-3d`)

Horas comprobadas en las salidas de las herramientas: 15:46 primer intento de construcción en Blender (falló al medir la oreja); 16:03 pruebas unitarias en verde; 16:04 capturas finales guardadas en `docs/capturas/`.

| Nº | Acción | Cómo | Resultado | Referencia |
|---|---|---|---|---|
| 141 | Crear la rama | `git switch -c nuevo-modelo-3d` desde `desarrollo` | Creada; arrastra las filas 139 y 140, que estaban sin confirmar | Decisión 0018 |
| 142 | Estudiar las cuatro fotos del perro | Lectura de las imágenes adjuntas | Lista de rasgos: spaniel pequeño negro, orejas caídas con flecos, hocico cano, ojos grandes con la pupila velada, mancha en el pecho, cola de plumero | Decisión 0018; `investigacion.md`, parte 3 |
| 143 | Medir la malla y el esqueleto del Husky | Dos scripts de Blender desechables: huesos, grupos de vértices, islas, perfiles y caras de ojos y trufa | 955 vértices una vez soldados, 1906 triángulos, una sola isla; el cráneo reparte sus pesos entre `Head`, `Ear1` y `Neck3` | `investigacion.md`, parte 3 |
| 144 | Reescribir la construcción del modelo | `tools/model/build_dog.py`: `reshape`, clase `Extras`, `lower_tail_bones`, `move_ear_bones`, `squash` | Construye y exporta los 14 clips. Primer intento fallido: la ventana de medida de la oreja no encontraba vértices; se amplió | Decisión 0018 |
| 145 | Iterar la forma con renders | Siete rondas de construir y renderizar cabeza, cuerpo y poses | Corregidos: orejas de canto, ojos saltones, canas como gafas, mechones como colmillos, pico en la nuca | Decisión 0018, "Lo que se probó y se descartó" |
| 146 | Acortar las patas | Aplastamiento vertical al 82 % desde el nodo raíz, compensado en cabeza y tronco | Silueta de perro pequeño; los pies siguen en el suelo en todos los clips | Decisión 0018 |
| 147 | Mejorar la herramienta de render | `tools/model/preview.py`: caras traseras sin dibujar, `--hide` y `--floor`; `build.mjs` genera también `dog_head.png` | Las hojas muestran el suelo y la cabeza en tres vistas | Decisión 0018 |
| 148 | Adaptar la app | `src/blackFur.ts` (paleta, collar lila), `src/dog.ts` (ojos, tamaño), `src/behavior.ts` (cuenco, mano, tumbado de perfil) | | Decisión 0018 |
| 149 | Ajustar la postura de tumbado | `LIE`: `body.dz` de -0,95 a -0,70 y patas delanteras de -0,75 a -0,55 | La barriga ya no se hunde en el suelo | Decisión 0018 |
| 150 | Regenerar y validar el modelo | `npm run model` | 14 clips, sin errores de validación, un aviso conocido. 1 101 364 bytes, 10 056 vértices, 11 materiales, 50 huesos | Decisión 0018 |
| 151 | Probar en la app en desarrollo | `npm run tauri dev` con el puerto de depuración y `tools/verify/cdp.mjs` | Reposo, sentado, tumbado, dormido, andando, triste, feliz, comiendo y en brazos, sobre tres fondos. Las pruebas le dieron de comer tres veces: la saciedad guardada subió de unos 9 a unos 75 puntos | Decisión 0018 |
| 152 | Comprobar tipos y pruebas | `npx tsc --noEmit`, `npx vitest run` | Sin errores; 26 pruebas en verde | |
| 153 | Guardar capturas | `docs/capturas/nuevo-modelo-app.png`, `-cara.png`, `-poses.png` y `-cabeza.png` | | Decisión 0018 |
| 154 | Documentar | Decisión 0018, parte 3 de la investigación y estas filas | Primer intento fallido: al añadir el texto desde la línea de comandos, el intérprete ejecutó como órdenes los fragmentos entre comillas invertidas. Todas fallaron sin cambiar nada, pero el texto quedó estropeado; se deshizo y se volvió a escribir desde ficheros | |

### Modelo nuevo, revisión 2: hendidura de la cabeza y orejas más cortas

Hora comprobada: 16:12, pruebas unitarias en verde con esta versión.

| Nº | Acción | Cómo | Resultado | Referencia |
|---|---|---|---|---|
| 155 | Localizar la hendidura que señaló el usuario | Renders de la cabeza en grande, en tres vistas | Está entre la cúpula del cráneo y el arranque de la oreja: es el relleno hundido del hueco de la oreja tiesa | Decisión 0018, revisión 2 |
| 156 | Rellenar la hendidura | `reshape` en `tools/model/build_dog.py`: lo que queda por dentro de la esfera del cráneo sale hasta su superficie | Primer intento descartado: aplicado también a la altura de los ojos, los dejaba saltones y borraba las canas. Limitado a detrás de los ojos, el cráneo queda redondo y la cara igual | Decisión 0018, revisión 2 |
| 157 | Acortar las orejas | `EAR_PATH`: el recorrido baja 0,62 en vez de 0,78 | Acaban a la altura de la mandíbula | Decisión 0018, revisión 2 |
| 158 | Regenerar, validar y probar | `npm run model`, `tools/verify/cdp.mjs`, `npx tsc --noEmit`, `npx vitest run` | Sin errores de validación; sin hendidura en la app; 26 pruebas en verde. Las pruebas le dieron de comer una vez más | Decisión 0018, revisión 2 |
| 159 | Rehacer las capturas | `docs/capturas/nuevo-modelo-*.png` | Las cuatro corresponden ya a la revisión 2 | Decisión 0018, revisión 2 |

### Modelo nuevo, revisión 3: unión de las orejas con el cráneo

Hora comprobada: 16:21, pruebas unitarias en verde con esta versión.

| Nº | Acción | Cómo | Resultado | Referencia |
|---|---|---|---|---|
| 160 | Estudiar la captura con la línea roja | Ampliación de la imagen (144 × 101 píxeles) | La hendidura que señala el usuario es la muesca de la silueta entre la cúpula del cráneo y la oreja, no el hundimiento que se rellenó en la revisión 2 | Decisión 0018, revisión 3 |
| 161 | Hacer que la oreja nazca en lo alto del cráneo | `EAR_PATH`, `EAR_ROOT` y `EAR_BONES_AT` en `tools/model/build_dog.py` | Silueta lisa de frente y de espaldas; desde arriba, las esquinas de la raíz quedaban despegadas como hombreras | Decisión 0018, revisión 3 |
| 162 | Ceñir la raíz de la oreja a la piel | `Extras.ear`: cada vértice de la raíz va al punto más cercano de la malla (`BVHTree.find_nearest`) | La oreja sale a ras del cráneo desde todos los ángulos | Decisión 0018, revisión 3 |
| 163 | Añadir una vista desde arriba a los renders | `above` en `tools/model/preview.py` | | Decisión 0018, revisión 3 |
| 164 | Regenerar, validar y probar | `npm run model`, `tools/verify/cdp.mjs` con la cámara acercada a la cabeza, `npx tsc --noEmit`, `npx vitest run` | Sin errores de validación; sin hueco entre cráneo y orejas en seis ángulos; 26 pruebas en verde. Las pruebas le dieron de comer una vez más | Decisión 0018, revisión 3 |
| 165 | Rehacer las capturas | `docs/capturas/nuevo-modelo-*.png` y la nueva `nuevo-modelo-union-orejas.png` | | Decisión 0018, revisión 3 |

### Modelo nuevo, revisión 4: la cabeza, medida sobre las fotos con un segundo agente

Horas comprobadas: 16:57 y 17:01, pruebas unitarias en verde con las dos últimas versiones del modelo.

| Nº | Acción | Cómo | Resultado | Referencia |
|---|---|---|---|---|
| 166 | Confirmar qué versión veía el usuario | Consulta a la app en marcha por el puerto de depuración | Una sola copia en marcha, la de desarrollo, con 10 120 vértices cargados: era la revisión 3 | |
| 167 | Lanzar un segundo agente para medir | Encargo sin hipótesis previas: medir la cabeza en las cuatro fotos y en el render, en anchos de cráneo, y diagnosticar la hendidura | La hendidura es el ángulo entrante donde la oreja se une al cráneo; orejas implantadas 0,22 demasiado bajas; cráneo estrecho y picudo; ojos un 70 % grandes; trufa un 45 % ancha | Decisión 0018, revisión 4 |
| 168 | Rehacer el cráneo a partir de medidas | `reshape` en `tools/model/build_dog.py`: elipsoide de sección cuadrada redondeada, ojos colocados por coordenadas | Primer intento: el cráneo salía estrecho (0,71 a 0,13 bajo la coronilla, objetivo 0,94) | Decisión 0018, revisión 4 |
| 169 | Averiguar por qué salía estrecho | Volcado de los vértices del cráneo por ángulo | Ningún vértice entre 30° y 82°: el relleno de las orejas deja triángulos enormes. Cortando toda arista de más de 0,07 el perfil pasa a 0,90 | Decisión 0018, revisión 4 |
| 170 | Orejas desde las esquinas del cráneo, ojos y trufa a medida | `EAR_PATH`, `EAR_SET_Z`, `EAR_ACROSS`, `EYE_RADIUS`, `NOSE_WIDTH` | | Decisión 0018, revisión 4 |
| 171 | Segunda medición del agente | Mismo método sobre el render nuevo | Hendidura resuelta de frente, en tres cuartos y en perfil. Regresión: hocico y mandíbula pequeños | Decisión 0018, revisión 4 |
| 172 | Corregir hocico, ojos y costura | Hocico y mandíbula ×1,15; triángulos regularizados; aro de canas propio en los ojos | Descartado por el camino: alargar la trufa pintando caras (parecía una boca) | Decisión 0018, revisión 4 |
| 173 | Tercera medición del agente | Mismo método | La forma coincide con la de las fotos dentro del margen. Defecto nuevo: rendija entre oreja y mejilla; un triángulo oscuro en la sien; trufa plana | Decisión 0018, revisión 4 |
| 174 | Últimos retoques | Borde delantero de la oreja pegado a la mejilla; triángulos degenerados disueltos; trufa estirada; arranque de la oreja algo más bajo | Revisado en renders y en la app por el agente principal; sin cuarta medición | Decisión 0018, revisión 4 |
| 175 | Regenerar, validar y probar | `npm run model`, `tools/verify/cdp.mjs`, `npx tsc --noEmit`, `npx vitest run` | Sin errores de validación; 1 153 836 bytes, 11 200 vértices; 26 pruebas en verde. Las pruebas le dieron de comer varias veces más | Decisión 0018, revisión 4 |
| 176 | Rehacer las capturas | `docs/capturas/nuevo-modelo-*.png` | `nuevo-modelo-cabeza.png` pasa a ser la hoja de seis vistas | Decisión 0018, revisión 4 |

### Modelo nuevo, revisión 5: cabeza más pequeña y ojos nuevos

Hora comprobada: 17:16, pruebas unitarias en verde con esta versión.

| Nº | Acción | Cómo | Resultado | Referencia |
|---|---|---|---|---|
| 177 | Arrancar la app a petición del usuario | `npm run tauri dev` | La copia abierta a las 15:53 se había cerrado. El primer arranque terminó solo con código 0, sin error; el segundo quedó en marcha. Causa sin averiguar | |
| 178 | Comprobar que el perro se ve en el escritorio | `tools/verify/screenshot.ps1` | Visible en el monitor principal, junto a la bandeja. Antes, en el segundo monitor, la captura de su zona salía negra | |
| 179 | Encoger la cabeza un 10 % | `HEAD_SIZE` y `head_point` en `tools/model/build_dog.py` | Misma forma: el perfil del cráneo impreso no cambia | Decisión 0018, revisión 5 |
| 180 | Rehacer los ojos | `Extras.eye`: globo abombado, abertura almendrada, iris marrón oscuro, pupila negra, dos brillos; material nuevo `EyeWhite` | Descartados un iris más claro y un aro de canas ancho | Decisión 0018, revisión 5 |
| 181 | Adaptar la app | `src/blackFur.ts` (colores de los ojos), `src/dog.ts` (el parpadeo pinta también `EyeWhite`) | | Decisión 0018, revisión 5 |
| 182 | Regenerar, validar y probar | `npm run model`, `tools/verify/cdp.mjs`, `npx tsc --noEmit`, `npx vitest run` | Sin errores de validación; 1 152 504 bytes, 11 106 vértices, 12 materiales; 26 pruebas en verde | Decisión 0018, revisión 5 |
| 183 | Rehacer las capturas | `docs/capturas/nuevo-modelo-*.png` | `nuevo-modelo-cara.png` incluye ahora el ojo cerrado | Decisión 0018, revisión 5 |

### Modelo nuevo, revisión 6: menos frente

Hora comprobada: 17:21, pruebas unitarias en verde con esta versión.

| Nº | Acción | Cómo | Resultado | Referencia |
|---|---|---|---|---|
| 184 | Rebajar la frente | `tools/model/build_dog.py`: cráneo más bajo, menos fondo hacia delante que hacia atrás e inclinado hacia atrás (`SKULL_RADII`, `SKULL_FRONT`, `SKULL_TILT`) | Primer intento (18°) con poco efecto de frente; con 24° la frente sube tendida y lo más alto queda entre las orejas | Decisión 0018, revisión 6 |
| 185 | Regenerar, validar y probar | `npm run model`, `tools/verify/cdp.mjs`, `npx tsc --noEmit`, `npx vitest run` | Sin errores de validación; 1 141 500 bytes, 10 890 vértices; 26 pruebas en verde | Decisión 0018, revisión 6 |
| 186 | Rehacer las capturas | `docs/capturas/nuevo-modelo-*.png` | `nuevo-modelo-union-orejas.png` incluye ahora una vista de perfil | Decisión 0018, revisión 6 |

### Arranque de la app con el modelo de la revisión 6

Hora comprobada: 18:31, hora de inicio del proceso `desktopfriend.exe` según `Get-Process`.

| Nº | Acción | Cómo | Resultado | Referencia |
|---|---|---|---|---|
| 187 | Arrancar la app a petición del usuario | `npm run tauri dev` con el puerto de depuración 9223, en la rama `nuevo-modelo-3d` | No había ninguna copia abierta. Arranca a la primera y queda en marcha | Commit 24b0244 |
| 188 | Comprobar que se dibuja el modelo nuevo | `tools/verify/cdp.mjs` (estado y captura sobre blanco; después `--bg none`) | Perro tumbado, con el collar lila; la ventana vuelve a ser transparente | Decisión 0018, revisión 6 |

### Modelo nuevo, revisión 7: cejas canosas

Hora comprobada: 18:40, pruebas unitarias en verde con esta versión.

| Nº | Acción | Cómo | Resultado | Referencia |
|---|---|---|---|---|
| 189 | Mirar las cejas en la foto del usuario | `2.jpeg`, adjunta a la petición | Canas sueltas sobre cada ojo, tendidas hacia la sien, sin borde continuo | `investigacion.md`, "El perro de las fotos" |
| 190 | Añadir las cejas como pelos sueltos | `tools/model/build_dog.py`: `BROW_HAIRS`, `BROW_WIDTH` y `Extras.brow`; `eye_axes` y `eye_opening` salen de `Extras.eye` | Primer intento (abanico radial pegado al párpado) descartado: parecían pestañas. Quedan siete pelos por ojo, girados hacia la sien y a dos alturas | Decisión 0018, revisión 7 |
| 191 | Probar en la app a tamaño real | `npm run model`, recarga de la página y `tools/verify/cdp.mjs` | Con 0,15 radios de ancho casi no se veían; se sube a 0,20 | Decisión 0018, revisión 7 |
| 192 | Regenerar, validar y probar | `npm run model`, `npx tsc --noEmit`, `npx vitest run` | Sin errores de validación; 1 146 064 bytes, 10 988 vértices, 12 materiales; 26 pruebas en verde | Decisión 0018, revisión 7 |
| 193 | Rehacer las capturas | `docs/capturas/nuevo-modelo-cara.png`, `-cabeza.png` y `-poses.png` | `-app.png` y `-union-orejas.png` no se rehacen: siguen siendo de la revisión 6 | Decisión 0018, revisión 7 |
| 194 | Dejar la app en marcha con esta versión | Recarga de la página por el puerto de depuración | La cámara y el fondo vuelven a su estado normal tras las capturas | |

### Modelo nuevo, revisión 8: la forma de la cabeza

Hora comprobada: 19:03, pruebas unitarias en verde con esta versión.

| Nº | Acción | Cómo | Resultado | Referencia |
|---|---|---|---|---|
| 195 | Guardar el modelo de la revisión 7 | `git tag -a modelo-revision-7` sobre el commit `c5e2406` | Etiqueta local; no se ha subido al remoto | Decisión 0018, revisión 8 |
| 196 | Recortar la cabeza de las cuatro fotos y renderizar el modelo desde sus ángulos | Recortes fuera del repositorio; `tools/model/preview.py` admite ahora vistas `x/y/z` | Mosaico de fotos y renders, lado a lado | Decisión 0018, revisión 8 |
| 197 | Medir fotos y malla | A ojo sobre los recortes, en separaciones entre ojos; volcado de perfiles de la malla con una copia desechable del script | La cara era la del Husky sin tocar; hocico 0,68 de ancho frente a 0,9–1 de las fotos | `investigacion.md`, "La cabeza del perro, medida" |
| 198 | Rehacer la forma de la cabeza | `tools/model/build_dog.py`: `head_field` (cráneo, quijada, hocico, belfos, arcos de cejas y trufa fundidos), `to_surface`, reparto de vértices; toda la cabeza subdividida | Funciona al primer intento; tres rondas de ajuste de medidas (hocico más ancho, cejas menos salientes, cráneo más alto y hocico más hondo) | Decisión 0018, revisión 8 |
| 199 | Limpiar el borde de las canas del hocico | La malla se corta por tres planos (`MUZZLE_WHITE_*`) | Lo que parecía un pico junto a la boca era el borde en dientes de sierra; ahora es recto y la caña queda negra hasta la trufa | Decisión 0018, revisión 8 |
| 200 | Regenerar, validar y probar | `npm run model`, `npx tsc --noEmit`, `npx vitest run` | Sin errores de validación; 1 239 828 bytes, 13 051 vértices, 12 materiales; 26 pruebas en verde | Decisión 0018, revisión 8 |
| 201 | Probar en la app | `tools/verify/cdp.mjs` (actividades, primeros planos, fucsia, lengua, ojos cerrados, comer) y `tools/verify/carry.mjs` | Sin huecos; la lengua y el cuenco encajan; en brazos, balanceo máximo de 10,2° | Decisión 0018, revisión 8 |
| 202 | Rehacer las capturas | `docs/capturas/nuevo-modelo-cabeza.png`, `-cara.png`, `-poses.png` y `-app.png` | `-union-orejas.png` no se rehace: sigue siendo de la revisión 6 | Decisión 0018, revisión 8 |

### El perro no se veía en el escritorio

Hora comprobada: 19:09, hora de inicio del proceso `desktopfriend.exe` según `Get-Process`.

| Nº | Acción | Cómo | Resultado | Referencia |
|---|---|---|---|---|
| 203 | Comprobar si el perro se ve en el escritorio, a petición del usuario | Estado de la ventana preguntado a Windows y copia de pantalla de su rectángulo (`BitBlt` con `CAPTUREBLT`) | La ventana existía, visible y siempre encima, y por dentro dibujaba al perro (`tools/verify/cdp.mjs`), pero en pantalla no aparecía. Llevaba abierta desde las 18:31, con muchas recargas y capturas por el puerto de depuración. Causa sin averiguar | |
| 204 | Reiniciar la app | Se cierra `desktopfriend.exe` y se vuelve a lanzar `npm run tauri dev` con el puerto de depuración | El perro se ve en el escritorio, en el monitor principal, sobre la barra de tareas | Commit `c4d5939` |

### Modelo nuevo, revisión 9: el morro, más arriba

Hora comprobada: 19:12, pruebas unitarias en verde con esta versión.

| Nº | Acción | Cómo | Resultado | Referencia |
|---|---|---|---|---|
| 205 | Subir el morro | `tools/model/build_dog.py`: hocico, belfos, trufa y planos de las canas, 0,05 más arriba | Renders de antes y después: sube sin cambiar de forma | Decisión 0018, revisión 9 |
| 206 | Regenerar, validar y probar | `npm run model`, `npx tsc --noEmit`, `npx vitest run` | Sin errores de validación; 1 240 800 bytes, 13 071 vértices; 26 pruebas en verde | Decisión 0018, revisión 9 |
| 207 | Probar en la app | Recarga de la página y `tools/verify/cdp.mjs` (primeros planos, fucsia, lengua, ojos cerrados, comer) | Vite no recarga la página al cambiar el modelo: llevaba 213 s sin cargarse y hubo que recargarla. Sin huecos; lengua y cuenco encajan | Decisión 0018, revisión 9 |
| 208 | Comprobar que se ve en el escritorio | Copia de pantalla del rectángulo de la ventana (`BitBlt` con `CAPTUREBLT`) | El perro se ve, sentado, con el morro nuevo | Decisión 0018, revisión 9 |
| 209 | Rehacer las capturas | `docs/capturas/nuevo-modelo-cabeza.png`, `-cara.png` y `-poses.png` | `-app.png` sigue siendo de la revisión 8 y `-union-orejas.png`, de la 6 | Decisión 0018, revisión 9 |

### Fusión del modelo nuevo en main

Hora comprobada: 19:21, salida de `date` antes de la fusión.

| Nº | Acción | Cómo | Resultado | Referencia |
|---|---|---|---|---|
| 210 | El usuario pide confirmar y fusionar en `main` | Petición directa | "haz commit de los cambios y mergea en main". El árbol estaba limpio: la revisión 9 ya estaba en el commit `24001d0` | Decisión 0018, resolución |
| 211 | Cerrar la decisión | `docs/decisiones/0018-modelo-retrato.md` pasa a aceptada; la 0010 enlaza a la 0018 | | Decisión 0018, resolución |
| 212 | Fusionar | Avance rápido de `main` y `desarrollo` hasta `nuevo-modelo-3d` | Sin subir a GitHub; sin regenerar el instalador | Decisión 0018, resolución |

### Propuesta: la cama del perro (rama `cama-del-perro`)

Horas comprobadas en las salidas de las herramientas:

| Hora | Hecho |
|---|---|
| 19:28 | Leído el código que se iba a tocar (salida de `date`) |
| 19:36 | La app de desarrollo arranca con las dos ventanas (inicio del proceso `desktopfriend.exe`) |
| 19:49 | La app arranca con la ventana de la cama manejada por la API de Windows (inicio del proceso) |
| 19:56 | 32 pruebas unitarias en verde (salida de `vitest`) |
| 19:57 | Consumo medido (salida de `date` tras `usage.ps1`) |
| 20:01 | Pruebas repetidas con la documentación ya escrita: 32 en verde (salida de `vitest`) |

| Nº | Acción | Cómo | Resultado | Referencia |
|---|---|---|---|---|
| 213 | Crear la rama | `git switch -c cama-del-perro` desde `desarrollo` | Parte del commit `d4d48c7` | Decisión 0019 |
| 214 | Leer cómo son las ventanas de la app en Windows | Estilos de la ventana del perro con `GetWindowLong`; lectura del código de tao 0.37.1 en el registro de Cargo | Lleva `WS_EX_APPWINDOW`; `focusable: false` da `WS_EX_NOACTIVATE` | `investigacion.md`, parte 4 |
| 215 | Modelar la cama | `tools/model/build_bed.py` (Blender sin interfaz, 3,5 s) y render con `preview.py` | A la primera: una rosquilla ovalada de 2785 vértices, con costuras y vivo | Decisión 0019 |
| 216 | Escribir la segunda ventana | `bed.html`, `src/bedWindow.ts`, `showBed`, `hideBed` y `onBedOrder` en `src/desktop.ts`, ventana `bed` en `tauri.conf.json`, `capabilities/bed.json`, `vite.config.ts` con dos páginas | Un primer intento de editar con un script de Python falló: Python no está instalado. No cambió nada; se editó con las herramientas de edición | Decisión 0019 |
| 217 | Escribir la cama en la app y el comportamiento | `Bed` en `src/props.ts`; actividad `nap`, `bedSpotX` y `landsInBed` en `src/behavior.ts`; tres estados de descanso en `src/needs.ts`; `src/main.ts`, `src/scene.ts` | `npx tsc --noEmit` sin errores; las 26 pruebas, adaptadas, en verde | Decisión 0019 |
| 218 | Adaptar las herramientas de depuración a dos páginas | `tools/verify/cdp-client.mjs` y `cdp.mjs`: opción `--page bed` | Antes cogían la primera página que encontraban | Decisión 0012 |
| 219 | Primera prueba en la app | `npm run tauri dev` recompila solo al cambiar `src-tauri`; `cdp.mjs` y `screenshot.ps1` | La cama sale en su ventana a 300 px del perro y se ve en el escritorio real, sobre la barra de tareas. Desde la cámara de la app parecía un aro plano | Decisión 0019 |
| 220 | Subir el reborde por detrás | `RIM_HIGH`, `RIM_LOW`, `RISE_FROM` y `RISE_TO` en `build_bed.py` | Se le ve el interior | Decisión 0019 |
| 221 | Soltar al perro encima, por depuración | `cdp.mjs` (`grab`, `drag`, `drop`) | Cae dentro, se tumba y duerme con 💤. Con el clip `Sleep`, estirado, no cabe: patas y cabeza por fuera | Decisión 0019 |
| 222 | Añadir el clip `Nap` | `NAP` en `tools/model/build_dog.py`; varias rondas de render y de captura en la app | Corregidos: grupa en alto, cabeza sin apoyar, una pata y el morro atravesando el reborde, la cola asomando por detrás. La cama crece un 10 % y el perro se coloca 0,2 más atrás (`NAP_BACK`) | Decisión 0019 |
| 223 | El perro se despierta en mitad de una captura | Lectura del estado con `cdp.mjs` | Energía en 99,97 y el perro paseando: tras varias siestas de prueba había llegado a 100 y se levantó, como está previsto. Desde ahí las pruebas le bajan antes la energía | Decisión 0019 |
| 224 | Comando para la cama | `tools/model/build-bed.mjs`, `npm run model:bed`; lo común con `build.mjs` pasa a `tools/model/blender.mjs` | Un primer intento de editar `build.mjs` por script no encontró el texto y no cambió nada; se hizo con la herramienta de edición | Decisión 0019 |
| 225 | Regenerar y validar los modelos | `npm run model:bed`, `npm run model` | Cama: sin errores ni avisos, 102 508 bytes, 2785 vértices, 3 materiales. Perro: 15 clips, sin errores, un aviso conocido, 1 288 260 bytes, 13 071 vértices | Decisión 0019 |
| 226 | Escribir la prueba de la cama | `tools/verify/bed.mjs` | 15 comprobaciones correctas, sin tocar el ratón real | Decisión 0019 |
| 227 | Probar con el ratón real | `tools/verify/input.ps1`, con `-DX` y `-DY` nuevos y un aviso del orden de las ventanas | El perro acaba dormido en la cama. **Fallo**: al salir, la ventana de la cama tenía el foco y estaba por delante del perro | Decisión 0019, "Lo que se probó y se descartó" |
| 228 | Mostrar la ventana de la cama con la API de Windows | Antes, lectura de `set_visible` en tao: una ventana ya creada se muestra con `SW_SHOW`, que la activa. Módulo `bed` en `src-tauri/src/lib.rs` (`SetWindowPos`, `ShowWindow`, estilo de ventana de herramientas), crate `windows` 0.62 en `Cargo.toml`, comandos `place_bed` y `stow_bed` | Compila a la primera; la app se reinicia sola | `investigacion.md`, parte 4 |
| 229 | Repetir las dos pruebas | `bed.mjs` e `input.ps1 -Action drag -DX -300 -DY -160 -HoldMs 1200` | 15 correctas. Con el ratón real: perro por delante de la cama, la cama sin el foco, y el perro dormido en ella con su ventana en (1760, 1052) | Decisión 0019 |
| 230 | Cogerlo de la cama con el ratón real | `input.ps1 -X 0.5 -Y 0.85 -DX 30 -DY -170 -HoldMs 2600` y `screenshot.ps1` a la vez | Primer intento: no llegó a pulsar, porque el clic habría atravesado al perro dormido. Repetido: la cama se queda en su sitio y el perro vuelve a dormirse | Decisión 0019, incidencias |
| 231 | Añadir pruebas unitarias | `tests/behavior.test.ts`, `tests/needs.test.ts` | 32 pruebas en verde, 6 nuevas | |
| 232 | Compilar el frontend | `npm run build` | Dos páginas: `index.html` y `bed.html` | |
| 233 | Medir el consumo | `tools/verify/usage.ps1`, 15 s, perro sentado y cama guardada | 290 MB y 19,6 % de un núcleo en desarrollo; el proceso de la ventana de la cama, 47 MB y 0,0 % | Decisión 0019, consecuencias |
| 234 | Comprobar que no se ha roto lo anterior | `tools/verify/carry.mjs`, `clickthrough.ps1` | Arrastre sin cambios (balanceo máximo de 11,1°). Clics: una pasada anulada por el ratón del usuario y otra fallida, porque el punto de prueba por defecto, el centro de la ventana, ya no cae sobre el perro desde el modelo nuevo. Apuntando al cuerpo (`-SolidY 0.78`): correcto dos veces, y una tercera con el ratón en movimiento. Se cambia el valor por defecto | Decisiones 0012 y 0018 |
| 235 | Guardar capturas | `docs/capturas/cama-secuencia.png`, `cama-escritorio.png` y `cama-modelo.png` | | Decisión 0019 |
| 236 | Dejar la energía del perro como estaba | `cdp.mjs` | 95, como al empezar. Las pruebas también lo acariciaron: la felicidad pasó de 99,2 a 100 | Decisión 0019, incidencias |
| 237 | Documentar | Decisión 0019, parte 4 de la investigación, `README.md`, `CLAUDE.md` y estas filas | Sin regenerar el instalador ni tocar la app instalada: queda para cuando el usuario apruebe la propuesta | Decisión 0019 |

### La cama, revisión 2: dormir echado del todo

Hora comprobada: 20:10, modelo regenerado y pruebas unitarias en verde con esta versión (salidas de `date` y de `vitest`).

| Nº | Acción | Cómo | Resultado | Referencia |
|---|---|---|---|---|
| 238 | Intentar ver la imagen de referencia del usuario | `curl` con tres agentes de usuario, la herramienta de lectura web y una búsqueda | HTTP 403 con captcha; la búsqueda solo devuelve títulos. No se ha visto ninguna imagen. Se toma la postura habitual de esos dibujos: echado, con la barbilla sobre las patas | Decisión 0019, revisión 2 |
| 239 | Rehacer la pose `Nap` | `NAP` en `tools/model/build_dog.py`: pecho al suelo, patas delanteras estiradas, cuello abajo y cabeza enderezada; tres rondas de render | A la primera ya se lee como un perro tumbado; después se le baja la cabeza hasta apoyarla. Un `sed` dejó el script sin finales de línea de Windows; se restauraron | Decisión 0019, revisión 2 |
| 240 | Probarla en la cama | Recarga de las dos ventanas y capturas con `cdp.mjs`, también de cerca y desde arriba | Estirado no cabe: la cabeza y las patas atraviesan el reborde | Decisión 0019, revisión 2 |
| 241 | Alargar la cama y recolocar al perro | `RIM_X` de 0,78 a 0,88 en `build_bed.py`; `NAP_FACING` 1,4 y `NAP_BACK` 0,36 en `src/behavior.ts`; patas algo menos estiradas y cabeza más girada | Cabe entero, con la barbilla sobre el borde delantero | Decisión 0019, revisión 2 |
| 242 | Regenerar, validar y probar | `npm run model:bed`, `npm run model`, `npx tsc --noEmit`, `npx vitest run`, `tools/verify/bed.mjs`, `carry.mjs` | Sin errores de validación; cama de 102 504 bytes (2,02 × 1,20 × 0,42), perro de 1 288 704; 32 pruebas en verde; 15 comprobaciones de la cama correctas | Decisión 0019, revisión 2 |
| 243 | Rehacer las capturas | `docs/capturas/cama-secuencia.png`, `cama-escritorio.png` (con `screenshot.ps1`, llevando al perro por depuración) y `cama-modelo.png` | Las tres son ya de la revisión 2 | Decisión 0019, revisión 2 |
| 244 | Dejar al perro despierto y con su energía | `cdp.mjs` | Energía en 95, como al empezar | |
| 245 | Documentar | Revisión 2 de la decisión 0019, "La pose de dormir" en la investigación y estas filas | Un primer intento de escribirlo todo en una sola orden de consola falló al interpretarla, sin cambiar nada; se hizo con las herramientas de edición | Decisión 0019, revisión 2 |

### Propuesta: menú para cambiar de mascota (rama `menu-de-mascotas`)

Horas comprobadas en las salidas de las herramientas:

| Hora | Hecho |
|---|---|
| 21:37 | Creada la rama, con el código ya leído (salida de `date`) |
| 21:40 | 39 pruebas unitarias en verde con el menú escrito (salida de `vitest`) |
| 21:41 | La app de desarrollo en marcha y primera captura del menú (salida de `date`) |
| 21:46 | La prueba del menú, completa y correcta (salida de `date`) |
| 21:49 | Mosaico de capturas guardado (salida de `date`) |
| 21:50 | Todas las pruebas repetidas con la versión final (salida de `date`) |

| Nº | Acción | Cómo | Resultado | Referencia |
|---|---|---|---|---|
| 246 | Crear la rama | `git checkout -b menu-de-mascotas` desde `cama-del-perro` | Parte del commit `6e8e0f8`. Sale de la rama de la cama, que aún no está aprobada, porque toca los mismos ficheros | Decisión 0020 |
| 247 | Escribir el menú | Nuevos `src/pets.ts`, `src/petMenu.ts` y `src/portrait.ts`; estilos en `src/style.css`; `onMenu` en `src/interaction.ts`; orden `pets` en `src/desktop.ts`, `src/main.ts` y `src-tauri/src/lib.rs` | `npx tsc --noEmit` sin errores | Decisión 0020 |
| 248 | Añadir pruebas unitarias | `tests/pets.test.ts` | A la primera falla una: comparaba `0` con `-0`, que para la prueba no son iguales. Era la prueba, no el código. Corregida: 39 en verde, 7 nuevas | |
| 249 | Arrancar la app | `npm run tauri dev` con el puerto de depuración 9223 | No había ninguna copia abierta. Compila el lado nativo con la entrada nueva de la bandeja y arranca | |
| 250 | Primera captura | `cdp.mjs` con `pet.petMenu.open()`, sobre tres fondos | El menú sale del perro y se lee sobre los tres. El retrato, pequeño y descentrado | Decisión 0020 |
| 251 | Afinar el retrato y el tamaño | Tres rondas: cámara de 2,6 a 2,1 de distancia y encuadre centrado en la cabeza; círculos de 60 a 72 px y más separados (`FAN_STEP` de 0,6 a 0,68) | La cabeza llena el círculo, con el collar asomando | Decisión 0020 |
| 252 | La app se recarga con un fichero a medias | Dos ediciones seguidas de `src/portrait.ts` | Error "aim is not defined" en pantalla, y el servidor de desarrollo sigue sirviendo esa versión aunque el fichero ya esté bien. Se arregla tocando el fichero (`touch`). Pasó dos veces | `investigacion.md`, parte 5 |
| 253 | Escribir la prueba del menú | `tools/verify/menu.mjs`, con cursor virtual | Primera pasada: 18 de 19. La que falla mide el anillo antes de que termine de llenarse: era la prueba. Con la espera, 19 correctas | Decisión 0020 |
| 254 | Probar el cambio de mascota | "Gato" y "Zorro" añadidas a mano a `PETS`; se eligen con `cdp.mjs` | Elegir "Gato" guarda, recarga la ventana y lo deja marcado; volver a "Perro", igual. Quitadas las dos: `"chosenPet": "dog"` en `pet.json` | Decisión 0020 |
| 255 | Probar con el ratón real | `tools/verify/input.ps1`, con la acción nueva `menu` (clic derecho), y `screenshot.ps1` | Primera pasada incoherente: el clic derecho no se da y aun así el menú aparece abierto; en la captura hay un corazón de caricia. Probablemente el ratón se estaba usando; sin confirmar. Repetida dos veces con el cursor quieto: el clic derecho abre el menú, el hueco de "Pronto" deja pasar el clic y el círculo del perro lo recibe y cierra el menú | Decisión 0020, incidencias |
| 256 | Guardar capturas | `docs/capturas/menu-mascotas.png`, con `cdp.mjs` y `sheet.ps1` | La del escritorio real no se guarda: sale el navegador que el usuario tenía abierto | Decisión 0020, incidencias |
| 257 | Comprobar que no se ha roto lo anterior | `npx tsc --noEmit`, `npx vitest run`, `menu.mjs`, `bed.mjs`, `carry.mjs`, `npm run build` | Sin errores; 39 pruebas; 19 y 15 comprobaciones correctas; balanceo máximo de 11,4°; las dos páginas | |
| 258 | Estado del perro tras las pruebas | `cdp.mjs` | Felicidad de 92,6 a 96,7 por las caricias de prueba. Saciedad y energía, solo lo que baja el tiempo | Decisión 0020, incidencias |
| 259 | Documentar | Decisión 0020, parte 5 de la investigación, `README.md` y estas filas | Sin regenerar el instalador ni tocar la app instalada: queda para cuando el usuario apruebe la propuesta. La app de desarrollo se deja en marcha para que pueda probarlo | Decisión 0020 |
| 260 | Fusionar el menú en la rama de la cama, a petición del usuario | `git merge --ff-only menu-de-mascotas` en `cama-del-perro`, a las 21:54 (salida de `date`) | Avance rápido hasta `16e8c51`; no había cambios sin confirmar. Sin tocar `desarrollo` ni `main`, sin subir a GitHub y sin regenerar el instalador | Decisión 0020, resolución |

### Propuesta: Wingman, la segunda mascota (rama `mascota-wingman`)

Horas comprobadas en las salidas de las herramientas:

| Hora | Hecho |
|---|---|
| 22:07 | Creada la rama y copiado el modelo de origen (salida de `date`) |
| 22:16 | 40 pruebas unitarias en verde con la app ya adaptada (salida de `vitest`) |
| 22:17 | Última construcción de `public/models/wingman.glb` (fecha del fichero) |
| 22:20 | Captura de Wingman dormido en la app (fecha del fichero) |
| 22:27 | Comprobaciones finales: tipos, pruebas y compilación (salida de `date`) |

| Nº | Acción | Cómo | Resultado | Referencia |
|---|---|---|---|---|
| 261 | Mirar qué hay en la carpeta del usuario | Listado de `C:\Users\lucas\valorant-extract` e `inspect.mjs` sobre `Wingman\Wingman.glb` | Malla de 3649 vértices, 21 huesos, 2 materiales con 3 texturas y 0 animaciones. El resto son las herramientas de extracción | Decisión 0021 |
| 262 | Buscar la clave para extraer las animaciones del juego | Una orden que miraba, entre otras cosas, el historial de la consola | Denegada por la herramienta de permisos, por tratarse de una credencial. No se insistió: las animaciones se crean | Decisión 0021 |
| 263 | Medir el modelo con Blender | Script suelto, fuera del proyecto | Mira hacia +X, mide 1,076 de alto y 1,51 de envergadura; los ojos son una pieza aparte con su trozo de textura | `investigacion.md`, parte 6 |
| 264 | Crear la rama y copiar el modelo | `git checkout -b mascota-wingman` desde `cama-del-perro`; copia a `assets/source/riot/Wingman.glb` | Parte del commit `58f18d2`. SHA-256 igual que el original | Decisión 0021 |
| 265 | Escribir la construcción del modelo | Nuevos `tools/model/build_wingman.py` y `build-wingman.mjs` | Primera pasada: 15 clips y validación correcta, pero las poses salen torcidas y diminutas en la hoja | Decisión 0021, incidencias |
| 266 | Buscar por qué | Script suelto que compara la cadena de huesos calculada a mano con la de Blender | La cadena coincide; el modelo no se había girado: el objeto importado guarda su giro como cuaternión. Corregido con `rotation_mode = "XYZ"` | `investigacion.md`, parte 6 |
| 267 | Arreglar el encuadre de las hojas | `tools/model/preview.py`: solo cuenta las mallas visibles | La esfera oculta del importador ya no agranda el encuadre | Decisión 0021, incidencias |
| 268 | Afinar las poses, tres rondas | `build_wingman.py`: tumbado apoyado en el suelo (no flotando), brazos con la armadura hacia arriba (giro `twist`), pose intermedia al caer, brazo apartado de la cara en la cama, agarre en lo alto del casco | Hojas revisadas: de pie, en el suelo y cabeza sin ojos | Decisión 0021 |
| 269 | Separar lo común de lo propio del perro | Nuevo `src/pet.ts`; `src/dog.ts` se queda con la cola, los ojos y la lengua; nuevos `src/wingman.ts` y `src/loadPet.ts` | `npx tsc --noEmit` sin errores | Decisión 0021 |
| 270 | Adaptar el resto de la app | `src/behavior.ts`, `src/main.ts`, `src/portrait.ts`, `src/petMenu.ts`, `src/pets.ts`; `pet.dog` pasa a `pet.animal` en `tools/verify/` | 40 pruebas en verde, 1 nueva. La app de desarrollo, que seguía en marcha, se recarga sola con el perro y funciona | Decisión 0021 |
| 271 | Primer vistazo al menú | `cdp.mjs` | Salen las dos mascotas. El retrato de Wingman, oscuro y demasiado cerca | Decisión 0021, incidencias |
| 272 | Quitar el oscurecido y alejar el retrato | `src/wingman.ts` | Wingman en su color; la cabeza cabe en el círculo con las orejas | Decisión 0021, incidencias |
| 273 | Cambiar a Wingman desde el menú | Clic inyectado en su círculo | Recarga y sale Wingman. Con 1,0 de alto se ve pequeño: pasa a 1,3 | Decisión 0021 |
| 274 | Recorrer sus actividades | `cdp.mjs`, forzando cada una, con capturas | Reposo, sentado, tumbado, dormido, triste, contento, comiendo, andando, en brazos y soltado. El cuenco, algo lejos: de 0,8 a 0,72 | Decisión 0021 |
| 275 | Probar la cama con Wingman | `node tools/verify/bed.mjs --shots ...` | 15 correctas, dos veces | Decisión 0021 |
| 276 | Calmar el aleteo | `src/wingman.ts`: solo aletea con mucha alegría | Antes de verlo temblar en la app: se cambió al repasar los números | Decisión 0021 |
| 277 | Probar el menú con Wingman | `node tools/verify/menu.mjs` | Falla una: la prueba esperaba una sola mascota. Era la prueba. Ahora cuenta las de la app y comprueba el retrato de las demás: 20 correctas | Decisión 0021 |
| 278 | Probar balanceo y caricias con Wingman | `carry.mjs` y `cdp.mjs` con caricias cada 50 ms durante 3 s | 12,1° de balanceo máximo. Tras las caricias, cabeza y brazos vuelven al clip | Decisión 0021 |
| 279 | Comprobar que el perro sigue igual | Vuelta al perro desde el menú; `bed.mjs`, `carry.mjs`, `pet-face.mjs` | Todo correcto; 12,9°; la cabeza vuelve a 0,0° | Decisión 0021 |
| 280 | Probar la app sin el modelo | `wingman.glb` renombrado, recarga, y devuelto a su nombre | Arranca el perro, sin error en pantalla; Wingman sin retrato en el menú. Restaurado: vuelve Wingman | Decisión 0021 |
| 281 | Dejar el modelo de Riot fuera de git | `.gitignore`; `assets/source/riot/PROCEDENCIA.md` | `git check-ignore` confirma los dos GLB | Decisión 0021 |
| 282 | Leer la política de Riot | https://www.riotgames.com/en/legal | Resumida en la investigación, con lo que dice y lo que no | `investigacion.md`, parte 6 |
| 283 | Comprobaciones finales | `npx tsc --noEmit`, `npx vitest run`, `npm run build` | Sin errores; 40 pruebas; las dos páginas | |
| 284 | Documentar | Decisión 0021, parte 6 de la investigación, `README.md`, `CLAUDE.md` y estas filas | Sin subir nada a GitHub, sin fusionar en otra rama y sin regenerar el instalador. La app de desarrollo queda en marcha, con Wingman | Decisión 0021 |
