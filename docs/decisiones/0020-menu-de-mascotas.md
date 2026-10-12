# 0020. Un menú para cambiar de mascota, hecho con círculos que salen del perro

- **Fecha:** 2026-10-12
- **Estado:** propuesta en la rama `menu-de-mascotas`. Pendiente de la opinión del usuario
- **Decide:** el usuario pide la función; el diseño y los detalles no especificados los propone el agente
- **Depende de:** la rama `cama-del-perro` (decisión 0019), de la que sale esta y que tampoco está aprobada todavía

## Lo que pidió el usuario
- Un menú para cambiar entre mascotas.
- Minimalista y bonito.
- De momento solo estará la mascota del perro.

## Cómo se ha resuelto
El menú usa el mismo lenguaje que los círculos de estado (decisión 0016), que el usuario aprobó sin retoques: nada por detrás, solo círculos que salen del perro.

| Aspecto | Solución |
|---|---|
| Qué es | Un círculo por mascota, con su **retrato** dentro y su nombre debajo. Salen del centro del perro en arco, con el mismo rebote y el mismo escalonado que los de estado |
| La mascota actual | Lleva el anillo lleno, en el lila del collar (`#b58be8`). El anillo se dibuja cuando el círculo ya ha llegado a su sitio |
| Las demás | Anillo vacío. Al pasar el cursor, el círculo crece un 10 % |
| Las que vendrán | Un último hueco, atenuado, con el borde discontinuo, una cruz y el rótulo "Pronto". No se puede pulsar y deja pasar los clics |
| Tamaño | 72 px, algo más que los 60 de los círculos de estado, para que el retrato se distinga |
| Fondo del retrato | Crema, dentro del mismo disco oscuro translúcido de los círculos de estado: sobre el disco oscuro, un perro negro no se vería |
| Cómo se abre | **Botón derecho sobre el perro**, o **Cambiar de mascota** en el menú de la bandeja |
| Cómo se cierra | Al elegir, con otro clic derecho, al abrir los círculos de estado, al coger al perro, o solo a los 10 segundos |
| Clics | Solo los círculos de mascota capturan el clic. Entre círculos, en las esquinas de su caja, sobre los nombres y sobre el hueco de "Pronto", el clic llega a lo que haya debajo |

Captura: `docs/capturas/menu-mascotas.png` (la apertura fotograma a fotograma, el menú sobre fondo gris, claro y oscuro, y cómo quedaría con más mascotas).

### El retrato
Se saca **del propio modelo, al arrancar la app** (`src/portrait.ts`): se coloca al perro de tres cuartos, se dibuja su cabeza con una cámara aparte y se copia a una imagen de 160 × 160 con el fondo transparente. Tarda un fotograma y ocurre con la ventana todavía oculta.

| Opción | Resultado |
|---|---|
| **Sacarlo del modelo al arrancar** | **Elegida.** Es el mismo perro que se ve en el escritorio, con sus materiales, y no se queda viejo cuando cambie el modelo (que ya lleva nueve revisiones) |
| Un PNG guardado en el proyecto | Descartada por ahora: habría que acordarse de regenerarlo con cada cambio del modelo. Será lo natural cuando haya una segunda mascota, cuyo modelo no esté cargado |
| Un emoticono (🐶) | Descartada: no se parece al perro de la app |
| Renderizarlo con Blender | Descartada: los colores los pone la app, no el GLB; el render no coincidiría |

### Cambiar de mascota
Elegir otra mascota **guarda la elección y recarga la ventana**: la app arranca de nuevo con la elegida (`chosenPet` en `pet.json`). Elegir la que ya está solo cierra el menú. Si la mascota guardada deja de existir, sale la primera de la lista.

Con una sola mascota ese camino no se puede recorrer, así que se probó añadiendo dos ficticias, "Gato" y "Zorro", que después se quitaron (ver "Verificación").

## Decisiones que el usuario no especificó
Quedan a su criterio.

1. **Cómo se abre: botón derecho sobre el perro.** Hasta ahora el botón derecho hacía lo mismo que el clic normal (abrir los círculos de estado). Ahora el clic normal enseña cómo está y el derecho abre el menú, como en cualquier programa de escritorio. También está en la bandeja.
   - Alternativa: un cuarto círculo, pequeño, junto a los de estado. Se descartó para no tocar una interfaz que el usuario aprobó tal cual.
2. **El hueco de "Pronto".** Con una sola mascota, un único círculo no se lee como un menú. Si no gusta, se quita con unas pocas líneas de `src/petMenu.ts`.
3. **El nombre "Perro".** La mascota no tiene nombre propio; se usa el de la especie. Está en `src/pets.ts`.
4. **Cambiar recarga la ventana**, en vez de sustituir un modelo por otro sobre la marcha. Es lo más simple y no deja nada del anterior en memoria.
5. **Se cierra solo a los 10 segundos**, no a los 6 de los círculos de estado: desde la bandeja hay que llegar con el ratón hasta el perro.

## Qué falta para una segunda mascota
Esta propuesta deja hecho el menú, la lista de mascotas y la elección guardada. **No** deja hecho lo que una mascota nueva necesita, que habrá que decidir con ella delante:

- Su modelo, sus animaciones y su retrato. Hoy `src/main.ts` carga siempre el perro, y `src/behavior.ts` está escrito para él (sus clips, sus huesos, su cama).
- Si cada mascota tiene sus propias necesidades o las comparten. Hoy hay un único estado guardado.
- Con más de cuatro mascotas el arco no cabe en la ventana (caben cinco círculos, contando el hueco): hará falta otra disposición.

## Verificación
Con la app de desarrollo y las herramientas de `tools/verify/`:

| Comprobación | Resultado |
|---|---|
| `node tools/verify/menu.mjs` (cursor virtual, sin tocar el ratón) | 19 comprobaciones correctas: el botón derecho sobre el perro abre el menú; hay un círculo por mascota y el hueco; el actual lleva el anillo lleno y su retrato; los círculos caben en la ventana; solo el círculo de mascota captura el clic; el clic normal abre los de estado y cierra el menú, y al revés; elegir la mascota actual lo cierra sin recargar; coger al perro lo cierra; la orden de la bandeja lo abre; se cierra solo entre los 9 y los 11 segundos |
| Cambio de mascota, con "Gato" y "Zorro" añadidas a mano | Elegir "Gato" recarga la app y lo deja marcado; volver a "Perro", igual. Quitadas las dos, `pet.json` queda con `"chosenPet": "dog"` |
| Ratón real (`input.ps1 -Action menu`, acción nueva) | El clic derecho sobre el perro abre el menú en el escritorio; sobre el hueco de "Pronto" el clic no llega a la app; sobre el círculo del perro sí, y cierra el menú. Una primera pasada dio resultados incoherentes (ver "Incidencias") |
| Aspecto | Capturas sobre fondo gris, claro y oscuro, y captura del escritorio real (revisada, no guardada: ver "Incidencias") |
| `npx tsc --noEmit`, `npx vitest run` | Sin errores; 39 pruebas en verde (7 nuevas, en `tests/pets.test.ts`) |
| Lo anterior sigue igual | `bed.mjs`: 15 correctas. `carry.mjs`: balanceo máximo de 11,4°. `npm run build`: las dos páginas |

## Qué no se ha probado
- **El menú de la bandeja con el ratón.** Se ha probado que la orden que envía ("pets") abre el menú, y que el lado nativo compila con la entrada nueva; no se ha pulsado la entrada.
- **La versión empaquetada.** No se ha regenerado el instalador ni tocado la app instalada: se hará si el usuario aprueba la propuesta.
- El frontend en el navegador (`npm run dev`), donde el menú se abre con la tecla `m`.
- Pantallas con escala distinta del 100 %.

## Incidencias
- **Primera pasada con el ratón real, incoherente.** El clic derecho no llegó a darse (la herramienta avisó de que bajo el cursor no estaba el perro) y aun así el menú apareció abierto un segundo después; en la captura de esa pasada hay un corazón de caricia, que solo sale frotando el cursor sobre el perro. Lo más probable es que el ratón se estuviera usando en ese momento. Causa sin confirmar. Repetida dos veces con el cursor quieto: correcta.
- La captura del escritorio real mostraba la ventana del navegador que el usuario tenía abierta. Se revisó y **no se ha guardado** en `docs/capturas/`, que se publica.
- Las pruebas acariciaron al perro: la felicidad pasó de 92,6 a 96,7. La saciedad y la energía solo cambiaron por el paso del tiempo.
- Al editar dos veces seguidas un mismo fichero, la app de desarrollo se recargó con el fichero a medias y siguió sirviendo esa versión hasta volver a tocarlo. Es del servidor de desarrollo, no de la app.

## Cambios
- Nuevos: `src/pets.ts` (lista de mascotas y elección guardada), `src/petMenu.ts` (el menú), `src/portrait.ts` (el retrato), `tests/pets.test.ts`, `tools/verify/menu.mjs`.
- `src/style.css`: los estilos del menú; los que comparte con los círculos de estado pasan a valer para los dos.
- `src/interaction.ts`: el botón derecho tiene su propio aviso (`onMenu`).
- `src/main.ts`, `src/desktop.ts`, `src-tauri/src/lib.rs`: la orden "pets" y la entrada **Cambiar de mascota** en la bandeja.
- `tools/verify/input.ps1`: acción `menu` (clic derecho).
- No cambia nada del comportamiento del perro, del modelo ni de la cama.

## Resolución
Al ver la propuesta, el usuario contestó "vale" y pidió confirmarla y fusionarla en la rama de la cama, sin pedir retoques.

- `menu-de-mascotas` se fusiona en `cama-del-perro` con un avance rápido (commit `16e8c51`). Desde aquí el menú y la cama van juntos en esa rama.
- No se ha fusionado en `desarrollo` ni en `main`, ni se ha subido a GitHub, ni se ha regenerado el instalador: el usuario no lo ha pedido. La cama (decisión 0019) sigue pendiente de su opinión.
- Las decisiones que no había especificado (botón derecho, hueco de "Pronto", nombre "Perro", recarga al cambiar, cierre a los 10 segundos) quedan como están; no las ha comentado una a una.
