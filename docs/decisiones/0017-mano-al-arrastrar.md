# 0017. Propuesta: una mano coge al perro del collar para llevarlo

- **Fecha:** 2026-10-11
- **Estado:** propuesta, en revisión por el usuario (rama `mano-al-arrastrar`)
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
- Una captura del escritorio real mostró al perro semitransparente. Repetida tres veces salió opaco siempre; se considera un artefacto de aquella captura.

## Qué no se ha probado
- Arrastres muy rápidos o bruscos con el ratón real.
- Cogerlo mientras come, duerme o está tumbado, más allá de que el código lo trata igual.

## Pendiente de la opinión del usuario
Si resulta simpático o no es un juicio suyo. Cosas fáciles de retocar: tamaño y color del guante, altura, cuánto se balancea, la pose en el aire y si debe añadirse algún gesto más de alegría.
