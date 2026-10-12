# 0018. Modelo nuevo: un retrato del perro del usuario, con collar lila

- **Fecha:** 2026-10-12
- **Estado:** propuesta en su segunda versión (ver "Revisión 2" al final), pendiente de la opinión del usuario. Está en la rama `nuevo-modelo-3d`, sin fusionar
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
