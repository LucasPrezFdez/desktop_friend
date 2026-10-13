# 0022. Elegir en qué pantalla está la mascota, desde el menú de la bandeja

- **Fecha:** 2026-10-13
- **Estado:** propuesta en la rama `elegir-pantalla`. Pendiente de la opinión del usuario
- **Decide:** el usuario pide la función; el diseño y los detalles no especificados los propone el agente
- **Depende de:** la rama `mascota-wingman` (decisión 0021), de la que sale esta y que tampoco está aprobada todavía

## Lo que pidió el usuario
- Que se pueda elegir en qué pantalla se ve la mascota, si hay varias.

## Lo que había
La mascota ya vivía en la pantalla en la que estuviera su ventana: arrastrándola a otra y soltándola, caía al suelo de esa y paseaba por ella. Faltaban dos cosas:

- **No había dónde elegir.** Solo se podía cambiar de pantalla llevándola con el ratón.
- **No se acordaba.** Solo se guardaba la posición horizontal. Al arrancar, la ventana nace en la pantalla principal y esa posición se recortaba a ella: la mascota volvía siempre a la principal.

## Cómo se ha resuelto

| Aspecto | Solución |
|---|---|
| Dónde se elige | En el menú de la bandeja, un submenú **Cambiar de pantalla**, justo debajo de **Cambiar de mascota** |
| Qué enseña | Una entrada por pantalla: `Pantalla 1 (principal) · 2560 × 1440`, `Pantalla 2 · 1920 × 1080`. Lleva la marca la que tiene a la mascota |
| Con una sola pantalla | El submenú no está: no hay nada que elegir |
| Al elegir otra | La mascota aparece en esa pantalla junto a su esquina inferior derecha y da un salto de alegría, igual que con **Traer aquí** |
| Al elegir la que ya tiene | No pasa nada |
| Al arrastrarla a otra pantalla | Sigue funcionando como antes, y ahora la marca del menú la sigue |
| Al cerrar y abrir la app | Vuelve a la pantalla en la que estaba, y a su mismo sitio (`monitor` en `pet.json`, junto a `windowX`) |
| Si esa pantalla ya no está al arrancar | Sale en la principal |
| Si desconectan su pantalla con la app en marcha | Cada 20 segundos, antes de guardar, la app vuelve a apoyarla en el suelo de la pantalla en la que Windows haya dejado la ventana |

### El menú se pone al día al pulsar
La lista de pantallas y la marca no se mantienen al día todo el rato: se rehacen **al pulsar el botón derecho sobre el icono**, que es justo antes de que el menú se abra (se abre al soltarlo). Si no ha cambiado nada, no se toca.

| Opción | Resultado |
|---|---|
| **Rehacerlo al pulsar el botón derecho** | **Elegida.** El aviso llega siempre, y antes de que el menú se abra |
| Rehacerlo cuando el cursor llega al icono | Descartada tras probarla: el aviso llegó una sola vez y no volvió a llegar (ver "Incidencias") |
| Que la ventana avise cada vez que la mascota cambia de pantalla | Descartada: no se enteraría de que se conecta o se desconecta una pantalla, y añade una orden más entre las dos mitades de la app |

### Cómo se reconoce una pantalla
Por el nombre que le da Windows (`\\.\DISPLAY1`, `\\.\DISPLAY2`). Es lo que se guarda y lo que la bandeja le envía a la ventana. El número de la entrada del menú sale de ese nombre.

## Decisiones que el usuario no especificó
Quedan a su criterio.

1. **Se elige en la bandeja, no en los círculos que salen de la mascota.** Es un ajuste del escritorio, como "Arrancar con Windows", y se toca pocas veces. Los círculos son para lo que se hace con la mascota. Además, el arco de círculos ya está casi lleno (decisión 0020).
2. **El nombre de las entradas.** "Pantalla 1", "Pantalla 2", con la resolución y cuál es la principal. El número suele coincidir con el que enseña la configuración de Windows, pero Windows no lo garantiza: la resolución y "(principal)" están para distinguirlas si no coincide.
3. **Aparece junto a la esquina, como con "Traer aquí".** La alternativa era conservar la posición que tenía en la otra pantalla, pero las pantallas no tienen por qué medir lo mismo.
4. **Se acuerda de la pantalla en la que está, no de la que se eligió.** Si se la arrastra a otra, se queda con esa. Si desconectan la suya y acaba en otra, se queda con esa también: al volver a conectarla no regresa sola.
5. **La cama no viaja.** Si estaba durmiendo en ella, al cambiar de pantalla se guarda, igual que con "Traer aquí".

## Verificación
Con la app de desarrollo en un equipo con dos pantallas (2560 × 1440 la principal y 1920 × 1080 a su derecha, las dos al 100 %) y las herramientas de `tools/verify/`:

| Comprobación | Resultado |
|---|---|
| `node tools/verify/monitors.mjs` (órdenes inyectadas, sin tocar el ratón), dos veces, una desde cada pantalla | 10 comprobaciones correctas: la orden de la bandeja lleva la ventana a la otra pantalla; queda junto a su esquina y en el suelo; la ventana está de verdad ahí; llega contenta; la pantalla queda guardada; elegir la que ya tiene no la mueve, y una que no existe tampoco; si la ventana aparece en otra pantalla sin que la app la haya movido, se vuelve a apoyar en el suelo de esa; ida y vuelta |
| El menú real, con el ratón (`tools/verify/tray.ps1`, nueva) | Lee las entradas del menú abierto: están las seis de siempre y **Cambiar de pantalla** con las dos pantallas y la marca en la de la mascota |
| Elegir pantalla con el ratón | Pulsada "Pantalla 2": la mascota aparece en ella, en (3980, 866), y la marca pasa a la 2. Pulsada "Pantalla 1": vuelve, en (2060, 1052) |
| La marca sigue a la mascota | Llevada de una pantalla a otra tres veces sin pasar por el menú, este la marca bien las tres. Recién arrancada en la pantalla 2, también |
| Pulsar la pantalla que ya tiene | Movida 400 px a un lado y pulsada su pantalla: no se mueve, sigue sentada y la marca sigue puesta |
| Arrastrarla con el ratón de la pantalla 2 a la 1 (`input.ps1 -Action drag -DX -1900`) | Cae al suelo de la 1; queda guardada la 1; el menú marca la 1 |
| Cerrar con **Salir** (pulsado con el ratón) y volver a abrir, con la mascota en la pantalla 2 | Arranca en la pantalla 2, en el mismo sitio (3480, 866) |
| Arrancar con una pantalla guardada que no existe (`pet.json` editado con la app cerrada) | Arranca en la principal, pegada a su borde derecho |
| Captura del escritorio en la pantalla 2 | La mascota, apoyada sobre la barra de tareas de esa pantalla (revisada, no guardada: se veía una ventana del usuario) |
| Lo anterior sigue igual, con la mascota en la pantalla 2 | `bed.mjs`: 15 correctas, con la cama en esa pantalla. `menu.mjs`: todo correcto. `carry.mjs`: balanceo máximo de 9,6° |
| `npx tsc --noEmit`, `npx vitest run`, `npm run build`, `cargo check` | Sin errores ni avisos; 40 pruebas en verde; las dos páginas |

## Qué no se ha probado
- **Desconectar una pantalla de verdad.** Se ha probado moviendo la ventana a la otra pantalla a espaldas de la app, que es lo que hace Windows, y llamando a lo mismo que se ejecuta cada 20 segundos. No se ha desenchufado ningún cable, ni se ha esperado a que lo hiciera el temporizador.
- **Conectar una pantalla con la app en marcha**, y un equipo con una sola (donde el submenú no debe salir): el equipo tiene dos y no se han tocado.
- **Pantallas con escalas distintas** (una al 100 % y otra al 150 %, por ejemplo). Las dos de este equipo están al 100 %. El código cuenta con ello (entra en la pantalla, mide desde dentro y se recoloca), pero no se ha visto funcionar.
- **Más de dos pantallas**, o colocadas una encima de otra.
- **El menú con el teclado o con una pantalla táctil.** Si Windows abriera el menú sin el aviso de "botón derecho pulsado", la lista saldría como estuviera la última vez.
- **La versión empaquetada.** No se ha regenerado el instalador ni tocado la app instalada.
- **Wingman.** Todo se ha probado con el perro; el cambio no distingue entre mascotas.
- No hay pruebas unitarias nuevas: lo añadido es mover la ventana y preguntar a Windows por las pantallas, que no se puede probar sin la app. Lo cubre `monitors.mjs`.

## Incidencias
- **El aviso de que el cursor llega al icono no es de fiar.** La primera versión rehacía el menú con él. Arrancada la app con la mascota en la pantalla 2, el menú marcaba la 1. Con el cursor llevado de un salto no llegó ningún aviso; llevándolo paso a paso llegó uno, y ya ninguno más en las siguientes pasadas, ni el de salida. El icono estaba entre los ocultos de la barra de tareas. No se ha buscado la causa: se cambió al aviso del botón derecho, que llega siempre.
- **La herramienta nueva fallaba a ratos.** La lista de iconos ocultos se cierra sola, y el botón que la abre también la cierra. `tray.ps1` lo intenta ahora hasta tres veces; después de eso no ha vuelto a fallar en seis pasadas.
- **Los guiones de prueba escritos desde la consola perdían barras invertidas** (`\\.\DISPLAY2` quedaba en `\.\DISPLAY2`), y la mascota "no se movía" porque esa pantalla no existe. Se tomó dos veces por un fallo de la app antes de mirar el fichero.
- **Una pasada de `monitors.mjs` se cortó a medias** por un `head` puesto a su salida, y dejó a la mascota desplazada 300 px. Sin consecuencias.
- **Las pruebas han cambiado el estado de la mascota.** Las caricias de `bed.mjs` subieron la felicidad de 39,7 a 43,5. La saciedad (8,5) y la energía (99,6) solo cambiaron por el paso del tiempo: la app llevaba unas 16 horas cerrada cuando se empezó.
- La mascota queda en la pantalla principal, en `windowX` 1856; antes de empezar estaba en 2014.

## Cambios
- `src-tauri/src/lib.rs`: el submenú (`mod monitors`), el evento `pet-monitor` y el aviso del botón derecho.
- `src/desktop.ts`: `monitor()`, `monitors()` y `onMonitorPick()`. No hacen falta permisos nuevos: preguntar por las pantallas entra en los que ya tenía la ventana.
- `src/behavior.ts`: `moveTo()`; `init()` recibe la pantalla guardada; `relayout()` recorta también el destino del paseo.
- `src/main.ts`: guarda y recupera la pantalla, atiende la elección y vuelve a apoyar la ventana antes de cada guardado periódico. `window.pet` (solo en desarrollo) incluye `desktop`.
- Nuevos: `tools/verify/monitors.mjs` y `tools/verify/tray.ps1`. La segunda sirve para todo el menú de la bandeja, que la decisión 0012 daba por no verificable.
- `README.md`: la fila de "Cambiar de pantalla".
- No cambia nada del modelo, de las animaciones, de la cama ni del menú de mascotas.
