# 0021. Wingman, la segunda mascota: sus animaciones se crean aquí y su modelo no se versiona

- **Fecha:** 2026-10-12
- **Estado:** propuesta en la rama `mascota-wingman`. Pendiente de la opinión del usuario. En `main` y en GitHub desde el 2026-10-13 por orden del usuario ([0025](0025-todo-a-main-y-app-instalada.md))
- **Decide:** el usuario pide la mascota; el diseño y los detalles no especificados los propone el agente
- **Depende de:** la rama `cama-del-perro` (decisiones 0019 y 0020), de la que sale esta
- **Resuelve:** "Qué falta para una segunda mascota", de la decisión 0020

## Lo que pidió el usuario
- Añadir un nuevo modelo de mascota, con sus animaciones correspondientes.
- El modelo está en `C:\Users\lucas\valorant-extract` y es Wingman, de VALORANT.

## Lo que había en esa carpeta
`Wingman\Wingman.glb`: la malla, 21 huesos y sus texturas, en reposo con los brazos en cruz. **Ninguna animación.** El resto de la carpeta son las herramientas con las que el usuario lo extrajo del juego.

El juego sí tiene animaciones de Wingman (correr, girar, plantar la Spike y poco más), pero no están extraídas, y ninguna es de sentarse, tumbarse, dormir, comer o ir en brazos, que es lo que la app necesita.

## Cómo se ha resuelto

### Las animaciones se crean por código, las quince
| Opción | Resultado |
|---|---|
| **Crearlas con Blender en modo script**, como las del perro que no venían en el pack | **Elegida.** `tools/model/build_wingman.py` coloca el esqueleto en poses clave y las interpola. Salen los mismos quince clips que tiene el perro, con los mismos nombres |
| Extraer las del juego y completar las que falten | Descartada por ahora. Hace falta el juego instalado y su clave de cifrado; el agente fue a buscar esa clave en el historial de la consola y la herramienta de permisos lo impidió, con razón. Aun con ellas, faltaría crear la mayoría |
| Dejar a Wingman con menos actividades que el perro | Descartada: habría que enseñar a `src/behavior.ts` qué sabe hacer cada mascota |

Que todas las mascotas traigan los mismos clips es lo que permite que el comportamiento no sepa cuál tiene delante.

| Clip | Qué hace Wingman |
|---|---|
| `Idle`, `IdleLook`, `Sniff` | De pie, respirando; mira a los lados; se inclina a curiosear el suelo |
| `Walk`, `Run` | Anda como un pato, balanceándose; corre echado hacia delante y con los brazos atrás, como en el juego. `Run` no lo usa la app todavía, tampoco con el perro |
| `SitDown`, `Sit` | Se sienta en el suelo como un muñeco, con las piernas estiradas por delante |
| `LieDown`, `Lie` | Se deja caer de barriga, parando el golpe con los brazos, y se queda boca abajo con la cara levantada |
| `Sleep`, `Nap` | Dormido boca abajo, con la cabeza sobre una mejilla. En la cama, con la cara vuelta hacia quien mira |
| `Eat` | Doblado sobre el cuenco, llevando los brazos a él |
| `Happy`, `Sad` | Salta con los brazos en alto; se queda encogido, con la cabeza baja |
| `Carry` | Cuelga de la mano, pataleando |

### El modelo, con lo justo
`build_wingman.py` deja una sola textura (la de color) de las tres, quita siete canales de UV y los colores por vértice, gira el modelo para que mire hacia donde mira el perro y añade dos huesos sin malla: lo alto del casco, por donde lo coge la mano, y el centro de la cara, donde salen los corazones. El GLB pasa de 2,39 MB a 1,03 MB.

### Lo que la app hace por encima de los clips
| En el perro | En Wingman |
|---|---|
| Mueve la cola según lo contento que esté | No tiene cola: **aletea con los brazos**, y solo cuando está muy contento (una caricia, comida, en brazos). Con la alegría de un día normal, un aleteo pequeño y constante se leería como un temblor: no llegó a verse en la app, se quitó al repasar los números |
| Cierra los ojos pintándolos del color del pelaje | Los ojos son dos lentes blancas sobre el antifaz: **se ocultan** y queda el antifaz lila, como un párpado. `build_wingman.py` las separa en un material propio |
| Saca la lengua | No tiene |
| La mano lo coge del collar | La mano lo coge **por lo alto del casco**, como un gancho de feria |
| Levanta y ladea la cabeza al acariciarlo | Igual |

### El código
`src/dog.ts` se parte en dos: `src/pet.ts` (lo que tienen todas: clips, fundidos, caricias, parpadeo) y lo propio de cada una (`src/dog.ts`, `src/wingman.ts`). `src/behavior.ts` ya no nombra al perro: las medidas que cambian de una mascota a otra (dónde se le pone el cuenco, cuánto retrocede en la cama, dónde agarra la mano, el tamaño de su sombra, el encuadre de su retrato) están en el `shape` de cada una.

### El retrato de la mascota que no está
La decisión 0020 preveía un PNG guardado para las mascotas cuyo modelo no está cargado. Se ha hecho de otra forma: **la primera vez que se abre el menú**, la app carga el modelo de las demás, las retrata y lo libera. Así el retrato sigue saliendo del modelo y no se queda viejo; si el menú no se abre, no cuesta nada.

## El modelo es de Riot Games: no se versiona
El perro sale de un modelo publicado como CC0. Wingman no: es de Riot Games, extraído de los ficheros del juego. El repositorio es público (decisión 0014).

| Opción | A favor | En contra |
|---|---|---|
| **Dejar los dos GLB fuera de git** (elegida) | No se publica nada de Riot aunque la rama acabe en GitHub. Se deshace quitando dos líneas de `.gitignore` | Quien clone el repositorio no tiene a Wingman |
| Versionarlos, como los del perro | El repositorio se compila tal cual | Publicaría un modelo de Riot con el nombre del usuario. Quitarlo después obliga a reescribir el historial |

- Fuera de git: `assets/source/riot/Wingman.glb` (el extraído) y `public/models/wingman.glb` (el derivado, que contiene la misma malla y la misma textura).
- Dentro: el código, `build_wingman.py`, la documentación y `assets/source/riot/PROCEDENCIA.md`.
- Tampoco se guardan capturas de Wingman en `docs/capturas/`, que se publica. Están en `tools/verify/out/wingman/`, solo en este equipo.
- **Si falta el modelo**, la app arranca con el perro en vez de fallar, y en el menú el círculo de Wingman sale sin retrato.

Lo que dice la política de Riot para proyectos de aficionados está en `docs/investigacion.md`, parte 6. En corto: los tolera si son gratuitos y llevan un aviso, pero dice que no se use su propiedad intelectual (aspecto de personajes incluido) en juegos o aplicaciones sin permiso, y se reserva retirarlo todo cuando quiera. Para uso propio en este equipo no cambia nada; **para publicar o repartir el instalador con Wingman dentro, sí**, y eso lo decide el usuario.

## Decisiones que el usuario no especificó
Quedan a su criterio.

1. **Las animaciones son nuevas, no las del juego** (ver arriba). Si prefiere las originales para andar y correr, hay que extraerlas: lo puede hacer él con su herramienta, o darle al agente lo que necesita.
2. **El modelo no se versiona.** Si prefiere tenerlo en el repositorio, son dos líneas de `.gitignore`.
3. **Las dos mascotas comparten hambre, felicidad y energía.** Cambiar de mascota es cambiar de aspecto, no tener dos animales a la vez. La alternativa, un estado por mascota, haría que la que no está pasara hambre.
4. **Tamaño.** Wingman mide 1,3 unidades de alto frente a 1,12 del perro. Es más alto pero mucho más estrecho: abulta parecido. Con 1,0 se veía pequeño.
5. **El nombre "Wingman"** en el menú. Está en `src/pets.ts`.
6. **El aviso de Riot en el README**, en inglés, que es como lo pide su política. Si no se quiere, se quita.
7. **`Sniff` es "curiosear"**: Wingman no olfatea. El nombre del clip se mantiene porque es común a todas las mascotas.

## Verificación
Con la app de desarrollo y las herramientas de `tools/verify/`:

| Comprobación | Resultado |
|---|---|
| `npm run model:wingman` | Los 15 clips, ninguno vacío; el validador de glTF no encuentra errores; tres hojas de poses revisadas (de pie, en el suelo y la cabeza sin los ojos) |
| Wingman en la app, actividad por actividad (`cdp.mjs`) | Capturas de reposo, sentado, tumbado, dormido (con las zetas y los ojos cerrados), contento, comiendo con el cuenco, andando, en brazos con la mano y al soltarlo |
| `node tools/verify/bed.mjs`, con Wingman | 15 comprobaciones correctas: sale la cama, cae dentro, duerme con los ojos cerrados, recupera energía, se levanta |
| `node tools/verify/menu.mjs`, con Wingman | 20 correctas (una nueva: las demás mascotas llevan su retrato). La prueba daba por hecho que había una sola mascota: ahora las cuenta en la app |
| `node tools/verify/carry.mjs`, con Wingman | Balanceo máximo de 12,1° |
| Caricias a Wingman sentado, 3 s seguidos | Ojos cerrados y brazos aleteando mientras duran; al acabar, la cabeza y los brazos vuelven a donde los deja el clip |
| Cambio de mascota desde el menú | De perro a Wingman, de vuelta al perro y otra vez a Wingman: recarga y queda marcada la elegida |
| Sin `wingman.glb` (renombrado un momento) | Arranca el perro, sin pantalla de error; en el menú, Wingman sin retrato |
| El perro sigue igual | `bed.mjs`: todo correcto. `carry.mjs`: 12,9°. `pet-face.mjs`: la cabeza gira 12,7° con la caricia y vuelve a 0,0° |
| `npx tsc --noEmit`, `npx vitest run`, `npm run build` | Sin errores; 40 pruebas en verde (1 nueva); las dos páginas |

## Qué no se ha probado
- **Con el ratón real.** Todo se ha hecho con órdenes inyectadas. Los gestos (frotar, arrastrar, clic derecho) no han cambiado y ya estaban probados con el perro.
- **La versión empaquetada.** No se ha regenerado el instalador ni tocado la app instalada.
- **Un clon limpio del repositorio.** Que la app arranca sin el modelo se ha probado renombrándolo, no clonando.
- El frontend en el navegador (`npm run dev`) y pantallas con escala distinta del 100 %.
- `pet-face.mjs` solo vale con el perro: mide su cola.

## Incidencias
- **El modelo no se giraba.** El importador de glTF deja el giro del objeto como cuaternión y, en ese modo, asignar `rotation_euler` no hace nada ni avisa. Las primeras poses salieron torcidas, con un brazo en cruz y otro caído.
- **Las hojas de poses salían diminutas.** `preview.py` contaba para el encuadre una esfera que el importador guarda oculta. Ahora solo cuenta lo visible. Afectaba también a las hojas del perro, pero en él no se notaba.
- **Wingman salía oscuro.** El agente supuso que las luces de la escena, pensadas para un perro negro, quemarían una textura clara, y la oscureció. Era al revés: con el blanco sin tocar sale en su color.
- **Las pruebas han cambiado el estado de la mascota.** Ha comido una vez y la energía se ha quedado en 70; el valor que tenía antes no se anotó.
- La orden de consola con varias líneas de texto entre comillas volvió a fallar al interpretarla, dos veces, sin cambiar nada. Se hizo con ficheros.

## Cambios
- Nuevos: `src/pet.ts`, `src/wingman.ts`, `src/loadPet.ts`, `tools/model/build_wingman.py`, `tools/model/build-wingman.mjs`, `assets/source/riot/PROCEDENCIA.md`.
- `src/dog.ts`: se queda con lo propio del perro. `src/behavior.ts`: recibe una mascota cualquiera. `src/main.ts`: carga la elegida. `src/portrait.ts`: retrata a cualquiera, en una escena aparte. `src/petMenu.ts`: avisa la primera vez que se abre. `src/pets.ts`: Wingman en la lista.
- `tests/pets.test.ts`: toda mascota de la lista tiene modelo.
- `tools/verify/`: `pet.dog` pasa a ser `pet.animal`; `menu.mjs` cuenta las mascotas.
- `tools/model/preview.py`: el encuadre ignora lo oculto.
- `package.json` (`model:wingman`), `.gitignore`, `README.md`, `CLAUDE.md`.
- No cambia el modelo del perro, la cama ni el lado nativo.
