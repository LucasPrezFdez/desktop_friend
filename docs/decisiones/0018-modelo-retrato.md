# 0018. Modelo nuevo: un retrato del perro del usuario, con collar lila

- **Fecha:** 2026-10-12
- **Estado:** propuesta en su novena versión (ver las revisiones 2 a 9 al final; la 9 sube el hocico de la 8; la 8 rehace la forma de toda la cabeza y sustituye a lo dicho en la 4 sobre hocico y trufa y en la 6 sobre el alto del cráneo; la 7 añade las cejas canosas y queda guardada con la etiqueta `modelo-revision-7`; la 6 cambia el alto y la inclinación del cráneo de la 4; la 4 sustituye a lo dicho antes sobre el cráneo, las orejas y la trufa, y la 5 a lo dicho sobre los ojos), pendiente de la opinión del usuario. Está en la rama `nuevo-modelo-3d`, sin fusionar
- **Decide:** el usuario pide el cambio; el diseño lo propone el agente
- **Relación con otras decisiones:** mantiene la 0005 y la 0009 (se sigue partiendo del Husky de Quaternius y de Blender en modo script) y sustituye, de la 0010, la tabla de colores y la lista de piezas añadidas. El resto de la 0010 (cinemática propia, poses en coordenadas de mundo, clips) sigue en vigor

## Lo que pidió el usuario
- Rehacer el modelo 3D de la mascota en una rama nueva.
- Que el perro se parezca lo más posible al de cuatro fotos que adjuntó.
- Que el collar sea lila.

## Qué se ve en las fotos
Las fotos son del usuario y no se copian al repositorio, que es público. Estaban en `C:\Users\lucas\Pictures\` (`WhatsApp Image 2026-10-12 at 15.27.04.jpeg`, `2.jpeg`, `3.jpeg` y `4.jpeg`).

| Rasgo | En las fotos | En el modelo anterior |
|---|---|---|
| Tamaño y tipo | Perro pequeño, de tipo spaniel, cuerpo algo alargado | Husky alto de patas |
| Orejas | Caídas, largas y anchas, con flecos ondulados | Tiesas y puntiagudas |
| Hocico | Corto y ancho, canoso: casi blanco en labios y barbilla, gris hacia los ojos, caña negra | Largo y negro |
| Ojos | Grandes y redondos, marrón oscuro, con la pupila velada de azul grisáceo | Pequeños, marrones |
| Alrededor de los ojos | Canas | Negro |
| Cráneo | Abombado, con la frente marcada | Plano, en cuña |
| Pecho | Mancha pequeña blanca y gris, pelo ondulado | Liso |
| Cola | De plumero, con flecos largos | Lisa y casi vertical |
| Patas | Con flecos por detrás | Lisas |
| Trufa | Grande y negra | Pequeña |

## Opciones consideradas
| Opción | A favor | En contra |
|---|---|---|
| **Remodelar la malla del Husky sin tocar el esqueleto** (elegida) | Se conservan los 14 clips, el esqueleto y todo el código de la app; reproducible | La malla original es muy tosca (955 vértices soldados): el parecido es el de una caricatura, no el de un retrato fino |
| Modelar el perro entero por código | Proporciones exactas | Habría que rehacer esqueleto, pesos y los clips de caminar, comer y reposo; el resultado orgánico por código suele ser peor que el de un artista |
| Buscar otro modelo base de un spaniel | Partiría de una forma más cercana | Nueva descarga, nueva licencia, otro esqueleto y otros clips; sin garantía de encontrar uno animado |
| Acortar las patas cambiando los huesos | Proporción real | Los pies cuelgan de huesos de control sueltos: con otras longitudes, los clips del pack dejan de casar con los pies |

## Decisión
Remodelar el Husky en `tools/model/build_dog.py`. La malla se deforma, se le quitan piezas y se le añaden otras, pero cada vértice conserva sus pesos y los huesos conservan su orientación, de modo que los clips del pack siguen valiendo tal cual.

## Cómo está hecho

### Remodelado de la malla (`reshape`)
| Paso | Qué hace |
|---|---|
| Soldar | El pack trae los vértices desdoblados por cara (3900 para 955 posiciones); soldados se puede cortar y rellenar |
| Orejas tiesas | Se borran y se tapa el hueco. Sus pesos sobre el cráneo pasan al hueso `Head` |
| Subdividir la cabeza | Más caras para redondear el cráneo y dar mejor borde a la mancha gris |
| Cabeza | Un 32 % más grande, alrededor de la base del cráneo |
| Hocico | Al 72 % de su largo y un 28 % más ancho |
| Cráneo | La parte de arriba se acerca a una esfera |
| Tronco | Barriga 0,25 más baja, un 12 % más ancho; cuello un 18 % más ancho |
| Patas y pies | Un 30 % más gruesas; pies un 15 % más largos |
| Cola | Girada 38° hacia atrás (malla y huesos `Tail2` a `Tail6`), para que caiga como un plumero |

### Patas más cortas sin tocar los clips (`squash`)
Al final se aplasta el modelo entero al 82 % en vertical desde su nodo raíz. Como el aplastamiento afecta por igual a la malla, al esqueleto y a los clips, los pies siguen pisando donde pisaban. Para que la cabeza y el tronco no queden chatos, `reshape` los estira antes en la misma proporción: el resultado neto es que solo las patas (y la altura a la que va el cuerpo) se acortan.

### Piezas añadidas (`build_extras`)
| Pieza | Cómo |
|---|---|
| Orejas | Lámina con grosor que sigue una curva: sale del cráneo, hace un pliegue y cuelga hasta la mandíbula (más corta desde la revisión 2). Su cara ancha mira hacia fuera y algo hacia delante. Cinco flecos en el borde. Los huesos `Ear1` a `Ear4` se trasladan a la oreja nueva y pasan a colgar de `Head` |
| Ojos | Disco abombado: cerco negro, iris marrón oscuro, pupila azul grisácea y un brillo |
| Canas | Material `Muzzle` (casi blanco) en labios, barbilla y lados del hocico; `FurGrey` en la franja de transición y alrededor de los ojos. La caña del hocico queda negra |
| Pecho | Cinco mechones blancos y grises bajo el collar y seis negros alrededor |
| Patas | Flecos detrás de las cuatro |
| Cola | Doce flecos por debajo, de la base a la punta |
| Collar | El mismo, ahora **lila** |
| Chapa y lengua | Como antes; la lengua se recoloca bajo el hocico nuevo |

Cada mechón copia los pesos del vértice del perro más cercano, así se mueve con la zona de la que cuelga.

### Materiales
| Material | Uso | Color en la app |
|---|---|---|
| `Fur` | Manto | `#1b1b21` |
| `FurLight` | Flecos y zonas que en el Husky eran blancas | `#27272e` |
| `Nose` | Trufa y cerco de los ojos | `#111116` |
| `Muzzle` | Hocico cano y mancha del pecho | `#b9b6b1` |
| `FurGrey` | Transición del hocico, canas de los ojos | `#5c5b63` |
| `EyeIris`, `EyePupil`, `EyeShine` | Ojos | `#2c1a0e`, `#7590b0`, blanco |
| `Collar` | Collar | `#b58be8` |
| `Tag`, `Tongue` | Chapa y lengua | sin cambios |

Desaparecen `EyeWhite` y el `EyePupil` marrón del pack.

### Poses
- `Lie` y `Sleep`: el cuerpo baja 0,70 en vez de 0,95 (con la barriga más honda se hundía en el suelo) y las patas delanteras se estiran 0,55 en vez de 0,75.
- El resto de las poses no ha necesitado cambios.

### Cambios en la app
| Fichero | Cambio | Motivo |
|---|---|---|
| `src/blackFur.ts` | Paleta nueva; el borde de luz se aplica también a `Muzzle` y `FurGrey` | Materiales nuevos |
| `src/dog.ts` | El parpadeo pinta `EyeIris`, `EyePupil` y `EyeShine`; `MODEL_HEIGHT` 2,67 y `DOG_HEIGHT` 1,12 | Ojos nuevos; el modelo es más bajo y más largo |
| `src/behavior.ts` | Cuenco en 0,98 (antes 0,86) | El morro llega más lejos |
| `src/behavior.ts` | Mano a 0,20 de la nuca (antes 0,085) | La oreja caída tapaba el guante |
| `src/behavior.ts` | Tumbado y dormido se le ve más de perfil (1,0 rad en vez de 0,6) | Casi de frente, las patas estiradas se salían por debajo de la ventana |

### Herramientas
- `tools/model/preview.py`: no dibuja las caras vistas por detrás, igual que la app (una pieza del revés se ve ya en la hoja); opción `--hide` para ocultar materiales y `--floor` para dibujar el suelo.
- `tools/model/build.mjs`: las hojas llevan suelo y ocultan la lengua; genera además `dog_head.png` con tres vistas de la cabeza.

## Lo que se probó y se descartó
| Intento | Por qué no |
|---|---|
| Orejas colgando de canto, pegadas al costado | De frente se veían como dos asas finas |
| Ojos más abombados, con cerco gris y pupila azul viva | Ojos saltones, de insecto |
| Canas en un radio de 0,17 alrededor de cada ojo | Parecían unas gafas |
| Mechones del pecho largos y todos blancos | Parecían colmillos bajo el collar |
| Tapar el hueco de las orejas con un abanico desde el centro | Dejaba un pico en la nuca; se cambió por una triangulación regular |
| Dejar las patas del Husky y solo bajar la barriga | Seguía pareciendo un perro grande, tipo setter |
| Escalar el perro un 20 % más en la app | Colgado de la mano tocaba el borde superior de la ventana y el cuenco quedaba bajo el pecho |

## Verificación
| Comprobación | Resultado |
|---|---|
| `npm run model` | 14 clips presentes y con duración; `gltf-transform validate` sin errores, con el aviso `NODE_SKINNED_MESH_NON_ROOT` de siempre |
| Modelo | 1 101 364 bytes (antes 830 492), 10 056 vértices exportados (antes 4322), 11 materiales, 50 huesos |
| Hoja de poses con suelo (`docs/capturas/nuevo-modelo-poses.png`) | Sentado, tumbado, dormido, feliz, triste, andando y comiendo, con los pies en el suelo; en brazos, de frente y de lado |
| `npx tsc --noEmit` | Sin errores |
| `npx vitest run` | 26 pruebas en verde |
| App en desarrollo, por el puerto de depuración (`docs/capturas/nuevo-modelo-app.png`) | Reposo, sentado, tumbado, andando, comiendo con el cuenco y en brazos con la mano, sobre fondos claro, crema y oscuro |
| Primer plano en la app (`docs/capturas/nuevo-modelo-cara.png`) | Hocico cano, ojos y collar lila sobre fondo claro y oscuro |
| Ojos cerrados al acariciarlo | El ojo se pinta del color del pelaje y se lee como cerrado |

## Qué no se ha probado
- La app instalada: no se ha regenerado el instalador. Solo se ha probado la versión de desarrollo.
- El arrastre con el ratón real y la medida del balanceo (`tools/verify/carry.mjs`, `input.ps1`); cogerlo y soltarlo se probó con órdenes inyectadas.
- Los clics que atraviesan (`clickthrough.ps1`) con la silueta nueva.
- El clip `Run`, que la app no usa, más allá de un fotograma en la hoja.

## Límites conocidos
- El aplastamiento vertical deforma un poco las piezas cuando giran mucho (la cabeza al comer, el cuerpo en brazos). En las capturas no llama la atención.
- La malla de partida es de pocos polígonos: los rasgos son los del perro, pero en versión de dibujo anguloso.
- El icono de la app (`assets/icon.png`) sigue siendo el del perro anterior.

## Pendiente de la opinión del usuario
Si se parece lo bastante es un juicio suyo. Cosas fáciles de retocar, todas en `tools/model/build_dog.py` o en la paleta de `src/blackFur.ts`: tono del lila, tamaño y color de los ojos (incluida la pupila velada), cuánto blanco lleva el hocico, largo de las orejas, largo de las patas (`SQUASH`), tamaño de la cabeza y cuánta mancha tiene el pecho.

## Revisión 2: retoques pedidos por el usuario
Al ver la primera versión en la app, el usuario dijo que estaba muy bien y pidió dos retoques, con una captura:

1. Una **hendidura en la cabeza**, entre lo alto del cráneo y el arranque de la oreja.
2. Las **orejas un poco más cortas**.

### La hendidura
| | |
|---|---|
| Causa | Al borrar las orejas tiesas se borra también parte del costado del cráneo, y el relleno del hueco queda plano y hundido. El abombado del cráneo solo acercaba cada vértice un 55 % a la esfera, así que el hundimiento seguía ahí |
| Arreglo | Detrás de los ojos, todo vértice que quede por dentro de la esfera del cráneo sale hasta su superficie (`reshape`) |
| Lo que se descartó | Aplicarlo también a la altura de los ojos: la zona se abultaba, el ojo quedaba saltón y desaparecían las canas de alrededor |

### Las orejas
El recorrido de la oreja baja 0,62 en vez de 0,78 (un 20 % menos): ahora acaba a la altura de la mandíbula, con los flecos por debajo.

### Verificación de esta versión
| Comprobación | Resultado |
|---|---|
| Renders de la cabeza en seis vistas | Cráneo redondo, sin escalón entre la cúpula y la oreja; ojos y canas como antes |
| `npm run model` | 14 clips, sin errores de validación. 1 101 948 bytes, 10 056 vértices |
| App en desarrollo, primer plano sobre el mismo fondo que la captura del usuario | Sin hendidura, de pie y sentado |
| App en desarrollo, resto de actividades | Reposo, sentado, tumbado, andando, comiendo y en brazos; la mano sigue viéndose junto a la oreja |
| `npx tsc --noEmit`, `npx vitest run` | Sin errores; 26 pruebas en verde |

Las cuatro capturas `docs/capturas/nuevo-modelo-*.png` se han rehecho con esta versión.

## Revisión 3: la hendidura, otra vez
El usuario dijo que la hendidura seguía sin convencerle, **a los dos lados de la cabeza**, y adjuntó una captura con una línea roja dibujada: un arco que va de lo alto del cráneo a lo alto de la oreja. Pidió rellenarla siguiendo esa línea y que quedase realista.

### Qué estaba mal en la revisión 2
La revisión 2 rellenó el hundimiento del cráneo, pero la hendidura que veía el usuario era otra: la **muesca en la silueta entre la cúpula del cráneo y la oreja**. La oreja salía de golpe por el costado, a la altura de los ojos, y subía en un pliegue propio; entre ese pliegue y la cúpula quedaba un entrante. El agente arregló lo que encontró al mirar el modelo y no comprobó que fuera lo mismo que señalaba la captura.

### Arreglo
| Cambio | Cómo |
|---|---|
| La oreja nace arriba | El recorrido (`EAR_PATH`) empieza en lo alto de la cúpula, baja pegado a ella y cuelga desde el costado. La línea de arriba de la cabeza pasa del cráneo a la oreja sin entrante, como en el dibujo |
| La raíz se ciñe a la piel | Cada vértice de la raíz se lleva al punto más cercano de la malla del cráneo (`BVHTree.find_nearest`): los bordes quedan a ras, un poco hundidos, y el grosor crece desde cero. La oreja parece salir de la piel, no ir apoyada encima |
| La raíz va tumbada | Arriba, el ancho de la oreja va de delante a atrás; al colgar gira hasta mirar hacia fuera y hacia delante |
| La raíz no se mueve | El primer 20 % del recorrido pesa sobre `Head`; los huesos de la oreja empiezan después (`EAR_ROOT`, `EAR_BONES_AT`) |

El largo que cuelga es el de la revisión 2.

### Lo que se probó y se descartó
| Intento | Por qué no |
|---|---|
| Raíz como una lámina recta apoyada sobre la cúpula | De frente y de espaldas la silueta ya era lisa, pero desde arriba se veían las esquinas de la lámina como hombreras, con una muesca a cada lado |
| Estrechar esa lámina hacia arriba | Las esquinas seguían despegadas de la cúpula |

### Verificación de esta versión
| Comprobación | Resultado |
|---|---|
| Renders de la cabeza en seis vistas, incluida una nueva desde arriba y de frente (`above` en `preview.py`) | Silueta continua del cráneo a las orejas en todas |
| App en desarrollo, primeros planos sobre fondo fucsia desde seis ángulos, entre ellos el de la captura del usuario y uno desde arriba (`docs/capturas/nuevo-modelo-union-orejas.png`) | No asoma el fondo entre cráneo y orejas en ninguno; tampoco triste ni mientras se le acaricia |
| `npm run model` | 14 clips, sin errores de validación. 1 104 756 bytes, 10 120 vértices |
| App en desarrollo, resto de actividades | Reposo, sentado, tumbado, andando, comiendo y en brazos, sin cambios |
| `npx tsc --noEmit`, `npx vitest run` | Sin errores; 26 pruebas en verde |

Las capturas `docs/capturas/nuevo-modelo-*.png` se han rehecho con esta versión.

## Revisión 4: la forma de la cabeza, medida sobre las fotos
El usuario confirmó que estaba viendo la revisión 3 y dijo que seguía mal. Pidió crear **un agente en paralelo** para hacer el trabajo con precisión y fijó el criterio: la forma de la cabeza ha de ser la del perro de las fotos.

### Método
Hasta aquí el agente principal había decidido a ojo qué era la hendidura, y había fallado dos veces. En esta revisión:

1. Un segundo agente, sin conocer las hipótesis anteriores, midió la cabeza en las cuatro fotos y en el render del modelo, píxel a píxel, y lo expresó todo en **anchos de cráneo** (AC). También superpuso el contorno de la foto 1 sobre la vista de frente del modelo.
2. El agente principal rehízo la cabeza para que se construya a partir de esas medidas.
3. El segundo agente volvió a medir cada versión (tres rondas) y señaló lo que no coincidía, incluidas dos regresiones que el principal no había visto.

### Diagnóstico del segundo agente
La hendidura es **el ángulo entrante de la silueta donde la oreja se une al cráneo**. El modelo tenía una cúpula alta y estrecha, con las orejas colgando a la altura de los ojos. El perro tiene un arco ancho y rebajado, y las orejas salen de sus esquinas de arriba sin escalón: en ninguna de las cuatro fotos hay entrante entre la coronilla y la oreja. La revisión 3 había tapado la costura, pero el defecto era de silueta.

### Medidas (en anchos de cráneo, vista de frente)
"Real" son las medidas de las fotos, con su margen; la foto 1, un primer plano, agranda hocico y barbilla un 10–15 %, y el valor entre paréntesis lo descuenta.

| Medida | Real | Revisión 3 | Revisión 4 |
|---|---|---|---|
| Coronilla sobre los arranques de oreja | 0,15 (0,10–0,25) | 0,36 | 0,08 en la última medición; después se bajó el arranque |
| Arranque de la oreja sobre la línea de ojos | 0,37 (0,25–0,48) | 0,15 | 0,46 |
| Punta de la oreja bajo la línea de ojos | 0,47–0,52 | 0,84 | 0,52 |
| Ancho de la silueta a 0,13 / 0,27 / 0,48 bajo la coronilla | 0,94 / 1,26 / 1,63 | 0,78 / 0,94 / 1,54 | 0,98 / 1,30 / 1,67 |
| Ancho total con orejas | 1,71 | 1,79 | 1,74 |
| Separación entre ojos | 0,67 (0,57–0,71) | 0,72 | 0,68 |
| Diámetro del ojo | 0,15 | 0,26 | 0,15–0,16 |
| Línea de ojos, fracción del alto de la cabeza | 0,39–0,47 | 0,43 | 0,44 |
| Alto de la cabeza | 1,27 (≈1,15) | 1,18 | 1,17 |
| Ancho del hocico | 0,60–0,67 (≈0,55–0,60) | 0,59 | 0,56 |
| Línea de ojos a barbilla | 0,77 (≈0,67) | 0,67 | 0,65 |
| Ancho de la trufa | ≈0,31 | 0,46 | 0,33 |
| Alto de la trufa | ≈0,20 | 0,17 | 0,145 en la última medición; después se estiró un 30 % |

Las cifras de la columna "Revisión 4" son de la tercera ronda del agente. Los últimos retoques (ver más abajo) se hicieron después y **no han pasado por una cuarta medición**.

### Cómo está hecho ahora (`tools/model/build_dog.py`)
| Parte | Antes | Ahora |
|---|---|---|
| Cráneo | Esfera a la que cada vértice se acercaba a medias, más rellenos | Elipsoide de sección cuadrada redondeada (`SKULL_WIDTH`, `SKULL_RADII`, `SKULL_SQUARENESS`): casi plano arriba y con las esquinas llenas. Todo vértice del cráneo va a su superficie |
| Malla del cráneo | Una subdivisión | Se corta toda arista de más de 0,07 y se regularizan los triángulos. Con la malla anterior no había ni un vértice entre 30° y 82° de la sección y la curva se quedaba en una recta |
| Ojos | Donde los tenía el Husky | Donde digan `EYE_X` y `EYE_Z`, buscando la piel con un rayo; tamaño `EYE_RADIUS` |
| Canas de los ojos | Caras de la cabeza pintadas | Un aro propio pegado a la piel (pintadas, con la malla fina salían en picos) |
| Orejas | Nacían en lo alto de la cúpula y bajaban pegadas | Nacen en la esquina de arriba (`EAR_SET_Z`), salen hacia fuera y cuelgan hasta la boca; su cara ancha mira más al frente. El borde de delante sigue pegado a la sien y a la mejilla casi hasta la punta |
| Hocico y mandíbula | | Un 15 % más grandes en las tres direcciones |
| Trufa | La del Husky, ensanchada con el hocico | Limitada a 0,31 anchos de cráneo y estirada un 30 % hacia abajo |

El script imprime al construir el perfil del cráneo en anchos de cráneo, para cotejarlo sin renderizar.

### Lo que encontró el segundo agente por el camino
| Ronda | Hallazgo | Arreglo |
|---|---|---|
| 2 | Regresión: al crecer el cráneo, hocico y mandíbula quedaron pequeños (0,50 de ancho; ojos a barbilla 0,53) | Hocico y mandíbula ×1,15; ojos algo más altos |
| 2 | Rayas oscuras finas en la unión oreja–cráneo | Triángulos del cráneo regularizados; el borde delantero de la oreja, pegado a la piel |
| 3 | Defecto nuevo: una rendija entre oreja y mejilla por la que se veía el fondo | El borde delantero sigue pegado casi hasta la punta |
| 3 | Un triángulo oscuro en la sien | Se disuelven los triángulos casi sin área |
| 3 | Trufa plana; arranque de las orejas algo alto | Trufa estirada; arranque bajado de 0,18 a 0,22 |

### Lo que se probó y se descartó
| Intento | Por qué no |
|---|---|
| Alargar la trufa pintando de negro las caras de debajo | Borde en picos; parecía una boca abierta |
| Aro de canas ancho (1,6 radios) | A tamaño de la app el ojo parecía un agujero con un aro; se dejó en 1,42 |

### Verificación de esta versión
| Comprobación | Resultado |
|---|---|
| Medición independiente del segundo agente, ronda 3 | "La forma de la cabeza coincide ya con la del perro de las fotos dentro del margen de mis medidas" |
| Entrantes de coronilla a oreja, ronda 3 | Ninguno de frente, en tres cuartos ni en perfil. Desde arriba y de frente queda un escalón de 0,03 anchos de cráneo, sin valle |
| Renders en seis vistas tras los últimos retoques (`docs/capturas/nuevo-modelo-cabeza.png`) | Sin rendija entre oreja y mejilla; trufa más alta. Revisado por el agente principal, no medido |
| App en desarrollo, primeros planos sobre fucsia (`docs/capturas/nuevo-modelo-union-orejas.png`) | Sin fondo a la vista entre cráneo, orejas y mejillas en seis ángulos |
| App en desarrollo, actividades (`docs/capturas/nuevo-modelo-app.png`) | Reposo, sentado, tumbado, andando, comiendo y en brazos |
| `npm run model` | 14 clips, sin errores de validación. 1 153 836 bytes, 11 200 vértices |
| `npx tsc --noEmit`, `npx vitest run` | Sin errores; 26 pruebas en verde |

### Lo que no se puede comprobar con estas fotos
- El perfil: la inclinación de la frente y el largo exacto del hocico. No hay foto de lado.
- El ancho del cráneo no se ve limpio en ninguna (las orejas lo tapan): se dedujo de la separación entre ojos, con un margen de 1,4 a 1,75.

### Diferencias que quedan
- El perro tiene dos abultamientos de ceja y un surco en medio de la frente; el modelo tiene la frente lisa.
- Vistas desde arriba, las orejas del modelo salen como alas rígidas; las del perro caen más pegadas.
- El escalón de 0,03 anchos de cráneo donde la oreja se separa del cráneo, visto desde arriba y de frente.

## Revisión 5: cabeza más pequeña y ojos nuevos
Al ver la revisión 4 funcionando en la app, el usuario pidió tres cosas:

1. La cabeza, **un poco más pequeña**.
2. El azul de los ojos no queda bien: **la parte de fuera del ojo, marrón oscuro; la de dentro, negra**.
3. Mejorar el diseño de los ojos, porque **no parecían realistas**.

Con esto se retira la pupila velada azul de las revisiones anteriores. Era una interpretación del agente a partir de las fotos; el usuario no la había pedido.

### Cabeza
`HEAD_SIZE = 0,90`: la cabeza entera (cráneo, hocico, ojos y orejas) se encoge un 10 % alrededor de la base del cráneo, al terminar de darle forma. Las proporciones medidas en la revisión 4 no cambian: el perfil del cráneo que imprime el script es el mismo.

### Ojos
| | Antes | Ahora |
|---|---|---|
| Forma | Disco plano de anillos concéntricos | Globo abombado que asoma por una abertura almendrada, algo más cerrada por arriba |
| Colores | Aro marrón fino y un disco azul grande | Iris marrón oscuro (`#3e2413`), pupila negra (`#0a0a0c`) y algo de blanco en las comisuras (`#c8c2b8`, material nuevo `EyeWhite`) |
| Párpados | Un aro negro | Borde negro que se apoya en el globo y baja hasta la piel |
| Brillo | Uno | Dos: uno grande arriba y otro pequeño enfrente |
| Sombreado | Plano, como el resto | El globo se sombrea liso para que se vea redondo |
| Canas | Aro gris de ancho fijo | Borde gris fino que sigue la forma de la almendra |

En la app, el parpadeo pinta también `EyeWhite` (`src/dog.ts`).

### Lo que se probó y se descartó
| Intento | Por qué no |
|---|---|
| Iris marrón medio (`#4a2c17`) | El usuario lo pidió oscuro, y en las fotos lo es |
| Aro de canas hasta 1,5 radios | A tamaño de la app se veía un aro gris con un punto dentro |

### Verificación de esta versión
| Comprobación | Resultado |
|---|---|
| Renders en seis vistas (`docs/capturas/nuevo-modelo-cabeza.png`) | Ojos almendrados con iris, pupila y brillos; cabeza más pequeña con la misma forma |
| Primer plano en la app, fondo claro y oscuro, y con los ojos cerrados (`docs/capturas/nuevo-modelo-cara.png`) | El ojo se lee como un ojo de perro; cerrado queda oscuro con un borde gris fino |
| App en desarrollo, seis ángulos sobre fucsia (`docs/capturas/nuevo-modelo-union-orejas.png`) | Sin huecos entre cráneo, orejas y mejillas |
| App en desarrollo, actividades (`docs/capturas/nuevo-modelo-app.png`) | Reposo, sentado, tumbado, andando, comiendo (el morro sigue llegando al cuenco) y en brazos (la mano sigue viéndose) |
| `npm run model` | 14 clips, sin errores de validación. 1 152 504 bytes, 11 106 vértices, 12 materiales |
| `npx tsc --noEmit`, `npx vitest run` | Sin errores; 26 pruebas en verde |

Esta revisión no ha pasado por el segundo agente: el tamaño de la cabeza y el aspecto de los ojos son juicio del usuario.

## Revisión 6: menos frente
El usuario pidió quitarle un poco de la parte superior de la cabeza y darle una forma más realista, porque el modelo quedaba **muy frentón**.

### Qué estaba mal
El cráneo era un elipsoide derecho y simétrico de delante a atrás: la frente salía tan abultada como la nuca, subía casi vertical desde los ojos y lo más alto de la cabeza quedaba justo encima de ellos. El segundo agente ya lo había anotado en la revisión 4 como algo que no podía comprobar por falta de una foto de perfil ("frente muy abombada en perfil: sube a 73° desde el stop"); el usuario, que conoce al perro, lo confirma.

### Cambios (`tools/model/build_dog.py`)
| Parámetro | Antes | Ahora | Efecto |
|---|---|---|---|
| Alto del cráneo (`SKULL_RADII.z`) | 0,45 | 0,35 | Coronilla más baja |
| Fondo hacia delante (`SKULL_FRONT`) | 0,46, igual que hacia atrás | 0,34 (hacia atrás, 0,50) | La frente abulta menos que la nuca |
| Inclinación (`SKULL_TILT`) | 0° | 24° hacia atrás | La frente sube tendida desde los ojos y lo más alto queda entre las orejas |

La coronilla queda 0,38 por encima del centro del cráneo (antes 0,45): la parte de la cabeza que hay por encima de los ojos baja en torno a una cuarta parte. Las orejas siguen naciendo a la misma distancia por debajo de la coronilla, así que bajan con ella.

### Lo que se probó
Una primera versión más tímida (alto 0,37, fondo delantero 0,40, 18°) cambiaba poco la silueta de frente; se pasó a los valores de la tabla.

### Efecto sobre las medidas de la revisión 4
- El ancho del cráneo y su perfil de frente no cambian (a 0,13 bajo la coronilla, 0,88 anchos de cráneo; antes 0,90).
- La altura de la coronilla sobre la línea de los ojos baja de unos 0,50 anchos de cráneo a unos 0,39. La medida de las fotos era 0,50, pero el agente la dio como aproximada y tomada en un primer plano; aquí manda lo que ve el usuario.

### Verificación de esta versión
| Comprobación | Resultado |
|---|---|
| Renders en seis vistas, comparados con los de la revisión 5 (`docs/capturas/nuevo-modelo-cabeza.png`) | De perfil, la frente sube tendida y lo más alto queda detrás de los ojos; de frente, la coronilla baja |
| App en desarrollo, perfil andando, de frente y en tres cuartos sobre fucsia (`docs/capturas/nuevo-modelo-union-orejas.png`) | Misma lectura que en los renders; sin huecos entre cráneo y orejas |
| App en desarrollo, actividades (`docs/capturas/nuevo-modelo-app.png`) | Reposo, sentado, tumbado, andando, comiendo y en brazos |
| `npm run model` | 14 clips, sin errores de validación. 1 141 500 bytes, 10 890 vértices |
| `npx tsc --noEmit`, `npx vitest run` | Sin errores; 26 pruebas en verde |

Sigue sin haber una foto de perfil con la que comparar la frente.

## Revisión 7: cejas canosas
El usuario adjuntó una foto (`2.jpeg`) y pidió las **"cejas" blancas como en ella: solo unos pocos pelos, sin hacer una línea blanca a modo de ceja**.

### Qué se ve en la foto
Sobre cada ojo hay canas sueltas, cortas, que salen del párpado de arriba y suben tendidas hacia la sien. Son más densas sobre la mitad de dentro del ojo, no forman un borde continuo y no son iguales en los dos ojos.

### Opciones consideradas
| Opción | A favor | En contra |
|---|---|---|
| Pintar de gris las caras de la piel de encima del ojo | No añade geometría | Con esta malla salen manchas o una franja: justo la línea que se pidió evitar. Ya se descartó para el contorno del ojo en la revisión 4 |
| Una pieza con forma de ceja | Sencilla | Es una línea |
| **Pelos sueltos, uno a uno** | Se leen como canas; cada uno se coloca y se orienta por separado | A tamaño real en el escritorio se quedan en un moteado tenue |

### Decisión (`tools/model/build_dog.py`)
Siete pelos por ojo, definidos uno a uno en `BROW_HAIRS` y dibujados por `Extras.brow`.

| Aspecto | Valor |
|---|---|
| Forma de cada pelo | Lámina fina de dos tramos que acaba en punta, apoyada en la piel en su raíz, su mitad y su punta |
| Ancho | 0,20 radios del ojo (`BROW_WIDTH`) |
| Largo | De 0,34 a 0,56 radios |
| Colocación | Entre 48° y 138° desde la comisura de fuera, a dos alturas alternas sobre el párpado (0,5 a 1,1 radios del borde de la abertura) |
| Dirección | Girados hacia la sien entre 28° y 64° respecto a la radial: van casi paralelos, no en abanico |
| Color | Cinco en `Muzzle` (casi blanco) y dos en `FurGrey` por ojo |
| Asimetría | Cada ojo tiene su propia lista |

Van unidos al hueso `Head`. No cambian con el parpadeo: usan materiales de pelaje y la app solo repinta los del ojo. No hubo que tocar `src/`.

Para colocar los pelos respecto a la abertura, la forma de la almendra y los ejes del ojo se sacaron de `Extras.eye` a dos funciones (`eye_opening`, `eye_axes`); el ojo no cambia.

### Lo que se probó y se descartó
| Intento | Por qué no |
|---|---|
| Seis pelos radiales en abanico, pegados al párpado | Parecían pestañas de dibujo animado |
| Ancho de 0,15 radios | Bien de cerca; a tamaño real casi no se veían |

### Verificación de esta versión
| Comprobación | Resultado |
|---|---|
| Renders en seis vistas (`docs/capturas/nuevo-modelo-cabeza.png`) | Pelos sueltos sobre cada ojo, pegados a la piel también de perfil y en tres cuartos |
| Primer plano en la app, fondo claro y oscuro, y con los ojos cerrados (`docs/capturas/nuevo-modelo-cara.png`) | Se leen como canas sueltas; con el ojo cerrado siguen en su sitio |
| App a tamaño real (420×340), sentado, ampliando la captura | Moteado gris tenue sobre el ojo; no se distingue pelo a pelo |
| `npm run model` | 14 clips, sin errores de validación. 1 146 064 bytes, 10 988 vértices, 12 materiales |
| `npx tsc --noEmit`, `npx vitest run` | Sin errores; 26 pruebas en verde |

`docs/capturas/nuevo-modelo-poses.png` también se rehízo. `nuevo-modelo-app.png` y `nuevo-modelo-union-orejas.png` son de la revisión 6: no se rehicieron.

### Límite
La cabeza del perro ocupa unos 70 píxeles de ancho en el escritorio, contando las orejas. A ese tamaño unos pocos pelos finos no pueden verse uno a uno; hacerlos más gruesos o más numerosos los acercaría a la línea que se pidió evitar. Si se quieren más visibles, se retoca `BROW_WIDTH` o se añaden pelos a `BROW_HAIRS`.

## Revisión 8: la forma de la cabeza, estudiada otra vez sobre las fotos
El usuario pidió **guardar el modelo** de la revisión 7 y, con las cuatro fotos adjuntas de nuevo, **estudiar la forma de la cabeza para que se parezca lo más posible**.

### El modelo guardado
La revisión 7 queda en la etiqueta de git `modelo-revision-7` (commit `c5e2406`). Para volver a ella: `git checkout modelo-revision-7 -- tools/model/build_dog.py public/models/dog.glb`.

### Método
1. Se recortó la cabeza de cada foto y se renderizó el modelo desde el mismo ángulo, una fila bajo la otra.
2. Se midió sobre los recortes, **en separaciones entre ojos** en lugar de en anchos de cráneo: el ancho del cráneo no se ve en ninguna foto (lo tapan las orejas) y en la revisión 4 hubo que deducirlo; la separación entre ojos se mide directamente en las cuatro.
3. Se midió la malla de la revisión 7 con un volcado de sus perfiles.

### Diagnóstico
La revisión 4 solo había dado forma al cráneo por detrás de los ojos. **La cara seguía siendo la del Husky**, escalada: un plano liso con los ojos pegados, sin stop ni arcos de cejas, y un hocico en forma de caja. Visto desde arriba, el cráneo redondo acababa en una pared recta a la altura de las cejas.

| Medida (en separaciones entre ojos) | Fotos 1 / 2 / 3 / 4 | Revisión 7 | Revisión 8 |
|---|---|---|---|
| Ancho del hocico | 1,3 / 0,87 / 1,05 / 0,93 | 0,68 | 0,86 |
| Ancho de la trufa | 0,57 / 0,41 / 0,48 / 0,41 | 0,34 | 0,42 |
| De la coronilla a la línea de ojos | 0,75 / 0,81 / 1,13 / 1,06 | 0,57 a 0,63 | 0,67 a 0,73 |
| De la línea de ojos al centro de la trufa | 0,47 / 0,67 / 0,80 / 0,86 | 0,49 a 0,71 | 0,49 a 0,71 |
| Diámetro del ojo | 0,25 en las cuatro, redondo | 0,25 de ancho, 0,17 de alto | Sin cambios |

La foto 1 es un primer plano y agranda hocico y trufa. Las cifras del modelo están tomadas en renders desde los ángulos estimados de las fotos 1 a 3; las de la revisión 8 son anteriores a los dos últimos retoques (hocico un 1,5 % más ancho, borde de las canas) y son aproximadas, medidas a ojo sobre el mosaico.

### Opciones consideradas
| Opción | A favor | En contra |
|---|---|---|
| Seguir retocando parámetros de la cara del Husky | Poco código | Es lo que se hizo en las revisiones 2 a 6; el stop, las cejas y un hocico redondeado no salen de escalar una cara plana |
| Modelar la cabeza a mano o importar otra malla | Control total | Rompe la regla de generar el modelo por script; habría que volver a pesar la malla sobre el esqueleto |
| **Describir la cabeza como volúmenes redondeados fundidos y llevar la malla del Husky a esa superficie** | La forma queda escrita en una docena de medidas; la malla conserva sus pesos y los clips siguen valiendo | El script tarda algo más; la superficie es aproximada |

### Decisión (`tools/model/build_dog.py`)
La cabeza es la superficie de `head_field`: la unión suavizada de estos volúmenes.

| Volumen | Qué aporta |
|---|---|
| Cráneo (el elipsoide de las revisiones 4 y 6) | La bóveda. Alto 0,42 en lugar de 0,35 |
| Quijada (`JAW_*`) | La cara por debajo de los ojos y por detrás del hocico |
| Hocico (`MUZZLE_BASE`, `MUZZLE_END`, `MUZZLE_WIDE`) | Un cono redondeado, un 32 % más ancho que alto, que se estrecha hacia la punta. Con la unión suavizada aparece el stop |
| Belfos (`LIP_*`) | Dos almohadillas a los lados de la trufa |
| Arcos de las cejas (`BROW_AT`, `BROW_RADII`, `BROW_OUT`) | Dos bultos sobre los ojos, con el surco de la frente en medio |
| Trufa (`NOSE_*`) | Un elipsoide en la punta; es trufa lo que queda dentro de él |

Cómo se aplica (`reshape`):
1. Toda la cabeza se subdivide (antes solo el cráneo) hasta aristas de 0,07.
2. El Husky se acerca primero a las proporciones del retrato, como antes, para que cada vértice caiga cerca de su sitio.
3. Cada vértice se lleva a la superficie (`to_surface`) y se reparten por ella en cuatro pasadas, para que no queden triángulos afilados.
4. Las canas del hocico se delimitan con tres planos (`MUZZLE_WHITE_*`) y **la malla se corta por ellos**: el borde sale recto en vez de en dientes de sierra. La caña queda negra hasta la trufa.

Ojos, cejas canosas, orejas, collar y lengua se colocan como antes, buscando la piel, así que se adaptan solos. No hubo que tocar `src/`.

`tools/model/preview.py` admite ahora una vista cualquiera como dirección `x/y/z`, para renderizar desde el ángulo de una foto.

### Cambio respecto a la revisión 6
En la revisión 6 el usuario pidió menos frente y la coronilla bajó a 0,39 anchos de cráneo sobre los ojos. Las fotos dan más: 0,50 en la foto 1 y, en separaciones entre ojos, entre 0,75 y 1,13 frente a 0,57–0,63 del modelo. En esta revisión **la coronilla vuelve a subir, a 0,45**, a medio camino. Se mantienen las otras dos correcciones de la revisión 6 (frente menos abultada que la nuca y cráneo inclinado 24° hacia atrás), que son las que quitaban la frente vertical. Si al usuario le vuelve a parecer frentón, basta bajar el alto de `SKULL_RADII`.

### Lo que se probó y se descartó
| Intento | Por qué no |
|---|---|
| Hocico de sección casi redonda (12 % más ancho que alto) | 0,68 separaciones entre ojos de ancho, igual que antes; las fotos piden de 0,9 a 1 |
| Arcos de cejas que sobresalían 0,075 | Tapaban media abertura del ojo y le daban cara de enfado |
| Canas del hocico delimitadas solo por dos planos inclinados | Formaban un aro gris por encima de la caña; se añadió el tercer plano |

### Verificación de esta versión
| Comprobación | Resultado |
|---|---|
| Fotos y renders desde el mismo ángulo, lado a lado (no se guarda: las fotos no están en el repositorio) | Bóveda, stop, hocico corto y ancho y trufa grande, como en las fotos |
| Renders en seis vistas (`docs/capturas/nuevo-modelo-cabeza.png`) | De perfil, frente tendida, stop y hocico que se estrecha; desde arriba, cráneo redondo sin pared en las cejas |
| App en desarrollo, primer plano claro, oscuro y con los ojos cerrados (`docs/capturas/nuevo-modelo-cara.png`) | Misma lectura que en los renders |
| App en desarrollo, primer plano sobre fucsia | Sin fondo a la vista entre cráneo, orejas y mejillas |
| App en desarrollo, lengua fuera y comiendo | La lengua cuelga bajo el hocico; el hocico llega al cuenco |
| App en desarrollo, actividades (`docs/capturas/nuevo-modelo-app.png`) y `tools/verify/carry.mjs` | Reposo, sentado, tumbado, andando, comiendo y en brazos |
| `npm run model` | 14 clips, sin errores de validación. 1 239 828 bytes, 13 051 vértices, 12 materiales |
| `npx tsc --noEmit`, `npx vitest run` | Sin errores; 26 pruebas en verde |

`docs/capturas/nuevo-modelo-union-orejas.png` sigue siendo de la revisión 6.

### Lo que no se ha hecho
- **No ha medido un segundo agente**, como en la revisión 4: las medidas y el juicio son del agente principal.
- **Los ojos no se han tocado.** En las fotos son redondos; en el modelo la abertura es una almendra un tercio más baja que ancha (revisión 5). Es la diferencia más visible que queda.
- **Las orejas no se han tocado.** Vistas desde arriba siguen saliendo hacia los lados más que las del perro.
- Sigue sin haber foto de perfil: el largo del hocico y la inclinación de la frente son una estimación.

## Revisión 9: el morro, más arriba
Al ver la revisión 8 en el escritorio, el usuario pidió que **el morro esté un poco más arriba**.

### Decisión (`tools/model/build_dog.py`)
Se sube 0,05 todo lo que forma el morro, sin cambiar su tamaño ni su forma: el hocico (`MUZZLE_BASE`, `MUZZLE_END`), los belfos (`LIP_CENTER`), la trufa (`NOSE_CENTER`) y, con ellos, los planos que delimitan sus canas (`MUZZLE_WHITE_AT`, `MUZZLE_GREY_AT`, `MUZZLE_WHITE_TOP`). Son 0,06 anchos de cráneo.

| Medida | Revisión 8 | Revisión 9 |
|---|---|---|
| De la línea de ojos al centro de la trufa | 0,225 | 0,175 |
| Caña del hocico en el stop, respecto a la línea de ojos | 0,085 por debajo | 0,035 por debajo |

El stop queda menos hondo y la caña sale casi a la altura de los ojos. La quijada no se ha movido.

"Más arriba" se ha entendido como el morro entero más alto en la cara, no como la punta levantada; si era lo segundo, se sube solo `MUZZLE_END`.

### Efecto sobre las medidas de la revisión 8
La distancia de los ojos a la trufa, que coincidía con las fotos (0,49 separaciones entre ojos en la vista de frente, frente a 0,47 de la foto 1), baja a unas 0,42, calculadas sobre las medidas para esa misma vista. Aquí manda lo que ve el usuario.

### Verificación de esta versión
| Comprobación | Resultado |
|---|---|
| Renders de perfil, de frente y en tres cuartos, antes y después | El morro sube; la forma es la misma |
| Renders en seis vistas (`docs/capturas/nuevo-modelo-cabeza.png`) | Sin defectos |
| App en desarrollo: primer plano claro, oscuro y con los ojos cerrados (`docs/capturas/nuevo-modelo-cara.png`), sobre fucsia, con la lengua fuera y comiendo | Sin huecos; la lengua cuelga bajo el hocico; el hocico llega al cuenco |
| Copia de pantalla del rectángulo de la ventana | El perro se ve en el escritorio con esta versión |
| `npm run model` | 14 clips, sin errores de validación. 1 240 800 bytes, 13 071 vértices |
| `npx tsc --noEmit`, `npx vitest run` | Sin errores; 26 pruebas en verde |

`docs/capturas/nuevo-modelo-poses.png` también se rehízo. `nuevo-modelo-app.png` es de la revisión 8 y `nuevo-modelo-union-orejas.png`, de la 6.
