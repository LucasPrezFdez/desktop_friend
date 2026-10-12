# 0018. Modelo nuevo: un retrato del perro del usuario, con collar lila

- **Fecha:** 2026-10-12
- **Estado:** propuesta en su quinta versión (ver las revisiones 2 a 5 al final; la 4 sustituye a lo dicho antes sobre el cráneo, las orejas y la trufa, y la 5 a lo dicho sobre los ojos), pendiente de la opinión del usuario. Está en la rama `nuevo-modelo-3d`, sin fusionar
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
