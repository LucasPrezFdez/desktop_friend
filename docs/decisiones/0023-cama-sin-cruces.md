# 0023. El perro duerme en la cama sin cruzarse con ella

- **Fecha:** 2026-10-13
- **Estado:** propuesta en la rama `cama-sin-cruces`. Pendiente de la opinión del usuario. En `main` y en GitHub desde el 2026-10-13 por orden del usuario ([0025](0025-todo-a-main-y-app-instalada.md))
- **Decide:** el usuario pide el arreglo; cómo se arregla lo propone el agente
- **Depende de:** la rama `elegir-pantalla` (decisión 0022), de la que sale esta y que tampoco está aprobada todavía
- **Sustituye a:** de la [0019](0019-cama-del-perro.md), los números de la pose de dormir y la colocación en la cama de su "Revisión 2" (`NAP_FACING`, `NAP_BACK`). El resto de la 0019 sigue en vigor: la cama, su ventana y su tamaño no cambian

## Lo que pidió el usuario
> quiero que mejores la animacion de el perro en la cama ya que la cama atraviesa al perro por la esquina iferior izquierda. Si lo necesitas crea un cursor y teclado virtual para ti

## Qué pasaba
Hasta ahora la pose se había ajustado mirando capturas. Para este arreglo se escribió antes una herramienta que mide el cruce (`tools/verify/nap.mjs`, ver más abajo). Con el perro dormido, tal como estaba:

| Qué | Cuánto | Con qué |
|---|---|---|
| Entra en el reborde | Hasta 0,130 unidades (unos 16 píxeles) | Cola, muslo y pata trasera izquierdos, grupa, pata delantera derecha y barbilla |
| Se hunde en el colchón | Hasta 0,099, de un colchón de 0,10 de grueso | Pecho y barriga |
| Queda bajo el suelo | Hasta 0,026 | Barriga |

Lo que se veía en la esquina inferior izquierda era la cola: salía en arco por detrás de la grupa y volvía por delante **por dentro del reborde**, que la tapaba a trozos.

La causa es de tamaño. El hueco de la cama, a la altura del colchón, es una elipse de 1,48 × 0,64 unidades que se estrecha hacia los extremos. El perro dormido ocupaba 1,49 × 0,75, cabeza incluida: no cabe entero de ninguna forma, solo a lo largo y con la cabeza encima del reborde. Estaba en diagonal (girado 1,4 rad y con el lomo curvado 24°), que es como peor cabe algo largo en una elipse, y 0,33 más a la izquierda de donde tenía sitio.

## Opciones

| Opción | Resultado |
|---|---|
| **Retocar la pose y recolocar al perro, midiendo** | **Elegida.** Cabe en la cama que hay |
| Agrandar la cama otro 15 % | Descartada: ya se agrandó en la revisión 2 de la 0019 por lo mismo, y el usuario pide arreglar la animación, no la cama. Hecha la medida, no hace falta |
| Dejarlo donde estaba y apoyar las patas delanteras encima del reborde | Descartada sin probar: resolvía la parte de delante, no la esquina de la que se queja el usuario |
| Un clip nuevo que vaya de estar de pie a dormido, en vez de tumbarse y fundir | Descartada: todas las mascotas traen los mismos clips (decisión 0021) y habría que añadírselo también a Wingman. Lo que arreglaba se ha resuelto en la app |

## Lo que cambia

### La pose `Nap` (`tools/model/build_dog.py`)

| Aspecto | Antes | Ahora |
|---|---|---|
| Cola | En arco abierto (45°, 40°, 35°, 30°, 25°) y caída 35° | Dobla 90° nada más salir y sigue pegada al muslo (50°, 30°, 20°, 10°), caída 20°: queda encima de la pata trasera |
| Lomo | Curvado 24° hacia quien mira | Casi recto: 12° |
| Patas delanteras | Estiradas 0,85 y abiertas 0,40 hacia su derecha | Estiradas 0,62 y abiertas 0,10: delante del pecho, sobre el colchón |
| Cuello y cabeza | Cuello vuelto 34°, bajado 60° en su base | Cuello vuelto 45° y cabeza 28° más; la base baja 56°. La cabeza hace el giro que antes hacía el lomo, y la barbilla queda **encima** del reborde |
| Altura del cuerpo | Bajado 1,05 | Bajado 0,90: se hunde 0,075 en el colchón y no llega al suelo |

Son unidades del modelo (el perro mide 2,67 de alto en ellas); en la escena, 0,42 veces eso. Dormido ocupa ahora 1,50 × 0,71: igual de largo y algo más estrecho. No cabe porque sea más pequeño, sino porque va recto, a lo largo, y con la cola y las patas recogidas.

La cola caída 35°, como estaba, pasaba la medida dormido pero rozaba el reborde 0,039 durante cinco fotogramas al recogerse, mientras el clip de tumbarse se funde con el de dormir. A 20° pasa por encima.

### La colocación (`src/dog.ts`, `src/pet.ts`, `src/behavior.ts`)
- El perro duerme girado 1,62 rad (antes 1,4): de perfil, a lo largo de la cama.
- `napBack`, que era cuánto retrocedía en la dirección en la que mira, pasa a ser `napSpot`: un punto `{ x, z }` dentro de la cama. Con un solo número no se podía moverlo hacia delante o hacia atrás sin girarlo. Para el perro es (−0,25, −0,02). Para Wingman es el mismo sitio que tenía, escrito de la otra forma: (−0,572, −0,099).

### Tumbarse y levantarse (`src/behavior.ts`)
Medir fotograma a fotograma sacó tres cruces que duran menos de un segundo y que también estaban antes:

| Qué pasaba | Arreglo |
|---|---|
| De pie, el perro llega más atrás que tumbado. Iba a su sitio de dormir en 0,4 s, todavía de pie, y una pata trasera entraba 0,087 en el reborde | Va a su sitio **a la vez que se tumba**, con el avance del clip (`Pet.progress`, nuevo), y vuelve al levantarse |
| Caía de frente y se giraba ya dentro: las patas barrían el reborde | Se gira en el aire, mientras cae hacia la cama |
| Al aterrizar, las patas seguían colgando como en brazos durante 0,25 s y una delantera entraba 0,117 en el reborde | El fundido al aterrizar en la cama dura 0,15 s, como al aterrizar en el suelo, y cae ya un 30 % hacia su sitio (`BED_STAND`) |

### La herramienta que mide (`tools/verify/nap.mjs`)
Mete a la mascota en la cama con órdenes inyectadas, recorre su malla ya deformada por el esqueleto (vértices, mitades de arista y centros de cara: 31 953 puntos en el perro) y dice cuáles quedan dentro del reborde o del vivo, bajo el colchón o bajo el suelo, cuánto y de qué hueso son. Lo hace en tres momentos:

- **Mientras se tumba** y **al levantarse**, fotograma a fotograma: para el bucle de dibujo de la app y lo avanza ella a 1/30 s por paso.
- **Dormida**, en cinco momentos del clip, porque respira.

Límites, en unidades de la escena (una son unos 125 píxeles): 0,02 dentro del reborde, porque apoyar la barbilla lo hunde un poco; 0,08 dentro del colchón, que es blando y mide 0,10; 0,005 bajo el suelo. Con `--shots` saca primeros planos desde cinco ángulos con un segundo renderer, sin tocar la cámara de la app; con `--trace`, lo peor de cada fotograma.

Para que la herramienta distinga las piezas de la cama, sus materiales llevan ahora nombre (`src/props.ts`).

## El cursor y el teclado virtuales
No han hecho falta. Las herramientas de `tools/verify/` ya dan órdenes a la app por el puerto de depuración de WebView2 (`grab`, `drag`, `drop`), sin pasar por el ratón: es lo que usa `nap.mjs`. **En todo el trabajo no se ha movido el ratón ni se ha pulsado ninguna tecla del usuario.** Lo que eso deja sin probar está en "Qué no se ha probado".

## Verificación
Con la app de desarrollo, a las 15:49 del 13 de octubre (salida de las herramientas):

| Comprobación | Antes | Ahora |
|---|---|---|
| Dormido, dentro del reborde | 0,130 | **0,014** (la barbilla, apoyada) |
| Dormido, hundido en el colchón | 0,099 | 0,075 |
| Dormido, bajo el suelo | 0,026 | 0,000 |
| Mientras se tumba, dentro del reborde (67 fotogramas) | Sin medida comparable | 0,017 |
| Al levantarse, dentro del reborde (31 fotogramas) | Sin medida comparable | 0,016 |

"Antes" es el modelo del commit `2dc51ec` con su giro y su sitio, medido con la misma herramienta. Las transiciones de antes no se pueden medir igual porque el código que las mueve ha cambiado; las cifras sueltas de la tabla de "Tumbarse y levantarse" son de los pasos intermedios.

| Comprobación | Resultado |
|---|---|
| `node tools/verify/nap.mjs` | Las 8 comprobaciones, correctas |
| `node tools/verify/bed.mjs` | Las 15, correctas: sigue recuperando 90 puntos por hora |
| `node tools/verify/carry.mjs` | Sin cambios en el arrastre |
| `npm run model` | 15 clips, sin errores de validación y el aviso de siempre; 1 288 564 bytes |
| `npx tsc --noEmit`, `npx vitest run`, `npm run build` | Sin errores; 40 pruebas; las dos páginas |

Capturas: `docs/capturas/cama-sin-cruces.png` (arriba antes, abajo ahora: desde la cámara de la app, la esquina izquierda y desde arriba) y `cama-secuencia.png`, rehecha.

## Qué no se ha probado
- **Con el ratón real.** El código que traduce el ratón en coger, llevar y soltar no ha cambiado.
- **La versión empaquetada.** No se ha regenerado el instalador.
- **Wingman.** Su colocación y su pose son las de antes, y la herramienta dice que tiene el mismo defecto: dormido, el brazo, el codo y la rodilla izquierdos entran hasta 0,133 en el reborde de atrás, y la cabeza 0,077. Desde la cámara de la app queda detrás de su cuerpo y no se ve cortado. No se ha tocado porque el usuario pidió el perro; se arregla igual, con `tools/model/build_wingman.py` y `src/wingman.ts`.
- Otros tamaños de cama: la pose está ajustada a esta. Si cambia `tools/model/build_bed.py`, hay que volver a medir.

## Consecuencias
- El perro cabe justo. Los números de `NAP`, `napFacing` y `napSpot` no se pueden tocar a ojo: hay que pasar `nap.mjs` después.
- El pecho queda a unos 0,52 unidades del modelo sobre el colchón, no a 0,37 como en la revisión 2 de la 0019, que era la altura a la que el usuario dejó de verlo "medio de pie". Está más alto porque antes atravesaba el colchón entero. Si vuelve a parecerlo, hay que bajarlo y aceptar que se hunda más.
- `docs/capturas/cama-escritorio.png` y `cama-modelo.png` siguen siendo de la pose anterior. La captura del escritorio hecha hoy no se guarda: salían otras ventanas del usuario.

## Incidencias
- **La primera medida de profundidad estaba mal.** Daba la distancia al vértice más cercano del reborde, no a su superficie: un punto apenas hundido salía con 0,03. Se cambió por la distancia al triángulo más cercano antes de fijar ningún número de esta decisión.
- El servidor de desarrollo sirvió una vez una versión vieja de `src/behavior.ts` tras dos guardados seguidos; hubo que tocar el fichero para que lo releyera.
- Blender no genera el GLB byte a byte igual de una vez a otra con el mismo script (cambia algún byte, no el tamaño).
- Las pruebas han movido la energía guardada del perro: estaba en 99,95 al empezar y se ha dejado en 99,9. La ventana queda donde la dejó la última prueba, no donde estaba.
