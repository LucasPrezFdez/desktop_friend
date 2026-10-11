# 0017. Una mano coge al perro del collar para llevarlo

- **Fecha:** 2026-10-11
- **Estado:** aceptada por el usuario el 2026-10-11 en su segunda versión (ver "Revisión 2" y "Resolución" al final). La revisión 2 sustituye a lo descrito antes sobre la pose, la orientación y el guante
- **Decide:** el usuario pide el efecto; el diseño lo propone el agente

## Lo que pidió el usuario
- Al agarrar al perro aparece una mano que lo coge del collar y lo levanta.
- Mientras se le mueve, se balancea levemente de lado a lado.
- **No debe parecer maltrato animal**, sino una manera divertida de moverlo.
- Rama nueva; preguntar si le gusta antes de incorporarlo.

## El problema de diseño
Un perro colgado del cuello se lee enseguida como un perro ahorcado. Todo el diseño parte de evitar esa lectura.

| Riesgo | Cómo se evita |
|---|---|
| Una mano realista agarrando a un animal | La mano es un **guante blanco de dibujos animados**: gordo, de tres dedos, con puño abullonado y pespuntes, flotando sin brazo |
| Agarre por la garganta | Lo coge **por detrás del collar, en la nuca**, como se lleva a un cachorro |
| Cuerpo inerte colgando | El perro queda **erguido y activo**: patalea en el aire alternando las patas, mueve la cola a tope y saca la lengua |
| Tirones | La mano baja primero y lo levanta después, con suavizado; el balanceo es un péndulo amortiguado y pequeño |
| Dejarlo caer como un peso muerto | Al soltarlo sigue con las patas recogidas mientras baja, se posa y da su saltito de alegría |

## Cómo está hecho

### Modelo (`tools/model/build_dog.py`)
- **Clip nuevo `Carry`** (1,2 s en bucle): cuerpo inclinado 35° girando alrededor de la nuca, cuello enderezado para que mire al frente, patas colgando y pataleo. Para las patas se añadió al script un modo "en el aire": los pies ya no se quedan plantados en el suelo, sino que cuelgan del hombro o de la rodilla.
- **Hueso nuevo `Nape`**, sin malla, en la nuca sobre el collar. La app lo lee para saber dónde está el punto de agarre en cualquier pose. El esqueleto pasa de 49 a 50 huesos.

### Mano (`src/props.ts`)
Hecha con formas básicas de Three.js, como el cuenco: palma, tres dedos de dos falanges, pulgar, puño y tres pespuntes. Se descartó modelarla en Blender porque no necesita esqueleto ni animación propia y así no depende del pipeline del modelo.

### Movimiento (`src/behavior.ts`)
- Al cogerlo: la mano aparece desde arriba creciendo, el perro gira casi de perfil (es como mejor se ve el agarre), pasa al clip `Carry` y sube 0,45 unidades.
- **Balanceo**: péndulo amortiguado que gira al perro y a la mano alrededor de la nuca. Lo empuja la velocidad horizontal del arrastre, con un máximo de unos 11°, más un vaivén de 2° cuando se le sostiene quieto.
- Al soltarlo: la mano se retira al momento; el perro mantiene la postura recogida durante la caída y la deshace al llegar al suelo.
- Para poder inclinarlo, el giro del perro pasa a guardarse en el comportamiento (`yaw`) en lugar de leerse del modelo.

## Verificación
Con `tools/verify/carry.mjs`, que da las órdenes sin tocar el ratón real y captura la secuencia:

| Comprobación | Resultado |
|---|---|
| En brazos | Clip `Carry`, subido 0,45, cola al 0,90 |
| Balanceo arrastrando a 500 px/s | 6,9° a un lado y 11,2° al otro |
| Quieto en el aire | De 8,7° baja a 2,1° en 1,6 s |
| Tras soltarlo | Contento, en el suelo, sin inclinación |
| Con el ratón real (`input.ps1`) | quieto → cogido → cae → contento; mano visible solo mientras se le lleva; balanceo de 5,1° |

- `npx tsc --noEmit` sin errores, 26 pruebas en verde, `npm run model` valida 14 clips.
- Capturas en `docs/capturas/`: `mano-secuencia-completa.png`, `mano-agarre-y-suelta.png`, `mano-fondos.png` y `mano-primer-plano.png` (esta última es de antes de agrandar la mano).

## Ajustes hechos durante el trabajo
| Problema visto en las capturas | Arreglo |
|---|---|
| El guante quedaba medio tapado detrás del cuello | Perro casi de perfil al cogerlo y mano un 30 % más grande |
| Apenas parecía levantado | Altura de 0,36 a 0,45 |
| Al soltarlo, las patas traseras se cortaban por abajo un instante | El perro sigue recogido durante la caída |

## Incidencias
- La primera pasada de la prueba dio resultados sin sentido: el perro ya estaba cogido antes de empezar. Lo más probable es que el usuario lo estuviera arrastrando con el ratón real en ese momento; no se ha confirmado. Repetida, salió bien.
  - **Actualización:** volvió a ocurrir en la revisión 2 y se investigó. Con un espía puesto, en tres rondas nada soltó al perro por su cuenta; y en las dos capturas fallidas el perro aparecía cogido y balanceándose antes de que la prueba diera la orden de agarrar, cosa que solo produce un arrastre real. Era el usuario probándolo. No es un fallo de la app.
- Una captura del escritorio real mostró al perro semitransparente. Repetida tres veces salió opaco siempre; se considera un artefacto de aquella captura.

## Qué no se ha probado
- Arrastres muy rápidos o bruscos con el ratón real.
- Cogerlo mientras come, duerme o está tumbado, más allá de que el código lo trata igual.

## Pendiente de la opinión del usuario
Si resulta simpático o no es un juicio suyo. Cosas fáciles de retocar: tamaño y color del guante, altura, cuánto se balancea, la pose en el aire y si debe añadirse algún gesto más de alegría.

## Revisión 2: retoques pedidos por el usuario
Al ver la primera versión, el usuario dijo que le gustaba con retoques:

1. El guante tiene que ser **más pequeño**.
2. El perro tiene que estar **de frente, con las patas colgando**, mientras se le mueve.

### Qué implicaba
La primera versión estaba pensada para verse de perfil. Girar al perro de frente sin más no servía, por dos motivos comprobados con capturas:
- La pose, de frente, parecía un perro de pie y no uno colgando.
- La nuca queda detrás de la cabeza, así que el guante desaparecía tras ella.

### Cambios
| Aspecto | Primera versión | Ahora |
|---|---|---|
| Orientación al cogerlo | Casi de perfil | De frente a la cámara |
| Pose `Carry` | Cuerpo inclinado 35°, pataleo hacia delante y atrás | Cuerpo casi vertical (62°) con la barriga hacia delante, cabeza mirando al frente, patas delanteras colgando flojas ante el pecho y traseras colgando algo abiertas. El pataleo pasa a ser un sube y baja alterno, que es lo que se aprecia de frente |
| Tamaño del guante | 1,3 | 0,85 |
| Posición del guante | En la nuca, visible de perfil | Entra en diagonal por un lado e inclinado; asoman la palma y el puño junto al cuello, a la altura del collar, y los dedos se pierden por detrás |
| Altura | 0,45 | 0,70 |

### Lo que se probó y se descartó
| Intento | Por qué no |
|---|---|
| Guante en la nuca, con el perro de frente | La cabeza lo tapa casi entero |
| Guante encima de la cabeza, con los dedos bajando por detrás (dos alturas) | **Parecía un gorro de cocinero**, y tocaba el borde superior de la ventana |
| Guante en diagonal junto al cuello (elegido) | Se lee como una mano que coge el collar por detrás, que es lo que se pidió |

### Verificación de esta versión
| Comprobación | Resultado |
|---|---|
| En brazos | Clip `Carry`, subido 0,70, cola al 0,90 |
| Balanceo arrastrando a 500 px/s | 8,6° a cada lado en la pasada de la captura (12,8° de máximo en otra) |
| Quieto en el aire | De 6,7° baja a 2,1° (de 10,2° a 1,3° en otra pasada) |
| Tras soltarlo | Contento, en el suelo, sin inclinación |
| Con el ratón real | quieto, cogido, cae, contento, quieto; balanceo de 5,2°; mano oculta al final |

- `npx tsc --noEmit` sin errores, 26 pruebas en verde, `npm run model` sin errores de validación.
- Capturas nuevas: `docs/capturas/mano-v2-secuencia.png` y `mano-v2-fondos-y-detalle.png`. Las `mano-*.png` anteriores son de la primera versión.

### Límite conocido
La ventana mide 340 px de alto y el perro colgando en vertical ocupa unos 270. Con la altura actual queda a unos 30 px del suelo y sus orejas a unos 28 px del borde superior: no se le puede levantar mucho más sin agrandar la ventana.

## Resolución
El usuario probó la segunda versión y la aprobó ("Me gusta, impleméntalo").

- La rama `mano-al-arrastrar` se fusiona en `desarrollo` y `main` y se sube a GitHub.
- Se regenera el instalador y se actualiza la app instalada.

### Verificación en la app instalada
- Clics que atraviesan: correctos (verdadero, falso, verdadero), aunque la prueba avisó de que el ratón se movió durante la medición.
- Arrastre con el ratón real: **verificación parcial**. La captura, hecha con retraso, muestra al perro ya en el suelo, de frente y con la lengua fuera, que es el estado posterior a soltarlo y solo se alcanza tras cogerlo. El arrastre simulado se cortó antes de tiempo, probablemente porque el usuario estaba usando el ratón, y no se capturó la mano en el aire. No se insistió para no interferir con su cursor.
- El mismo código quedó verificado dos veces con ratón real en la versión de desarrollo (acciones 119 y 128 de la bitácora).
