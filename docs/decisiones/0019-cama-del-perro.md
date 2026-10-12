# 0019. Una cama que aparece al coger al perro, para que duerma y recupere energía

- **Fecha:** 2026-10-12
- **Estado:** propuesta en la rama `cama-del-perro`, pendiente de que el usuario la pruebe
- **Decide:** el usuario pide la función; el diseño y los detalles no especificados los propone el agente

## Lo que pidió el usuario
- Al agarrar al perro aparece una cama de perro, modelada por el agente o sacada de internet.
- Si se deja al perro en la cama, tiene una animación de dormir.
- Dormir en la cama sirve para recuperar su energía.

## El problema de diseño
La ventana de la app mide 420 × 340 píxeles y **va detrás del cursor** mientras se lleva al perro. La cama, en cambio, tiene que quedarse quieta en el escritorio para poder llevar al perro hasta ella. No puede dibujarse en la misma ventana.

| Opción | Resultado |
|---|---|
| **Una segunda ventana transparente solo para la cama** | **Elegida.** La cama se queda en su sitio y el perro pasa por delante |
| Agrandar la ventana del perro a todo el monitor mientras se le lleva | Descartada sin probar: habría que redimensionar una ventana transparente con WebGL en pleno arrastre y recolocar la cámara, y no cubre llevarlo a otro monitor |
| La cama siempre en su ventana, también con el perro dentro | Descartada: el perro quedaría dibujado entero por delante de la cama, no dentro de ella |

Lo que se hace es un **relevo**: mientras se lleva al perro, la cama la dibuja su propia ventana; cuando el perro cae dentro, su ventana se coloca exactamente donde estaba la de la cama y pasa a dibujarla ella, debajo de él, con el borde delantero tapándole las patas. Las dos ventanas tienen el mismo tamaño y usan la misma cámara y la misma clase (`Bed`), así que la cama no se mueve ni un píxel en el cambio. Durante tres fotogramas se dibuja en las dos, para que no haya un instante sin cama.

## Modelarla o descargarla
Se ha **modelado**, con un script de Blender (`tools/model/build_bed.py`), igual que el perro (decisión 0005).

- No hay licencia ni procedencia que vigilar.
- La forma se puede ajustar a la cámara de la app, que mira casi a ras de suelo, y eso resultó necesario (ver "Lo que se probó y se descartó").
- Se regenera con `npm run model:bed`, que además la valida y renderiza una hoja de revisión.

Es un colchón ovalado dentro de un reborde acolchado, alto por detrás como un respaldo y bajo por delante, con costuras cada cierto tramo y un vivo. Mide 1,82 × 1,18 × 0,42 unidades de la escena (el perro mide 1,12 de alto). 2785 vértices, 102 508 bytes, tres materiales (`BedRim`, `BedCushion`, `BedPiping`). Los colores los pone la app: mostaza con el colchón crema y el vivo marrón, que contrasta con el perro negro y hace juego con el collar lila.

## Cómo funciona

| Momento | Qué pasa |
|---|---|
| Se coge al perro | La cama aparece creciendo, apoyada en el suelo del escritorio, a 300 px del perro hacia el lado con más sitio |
| Se le suelta lejos de la cama | Cae al suelo como siempre y la cama se guarda |
| Se le suelta encima (hasta 105 px a cada lado de su centro, a cualquier altura) | Se centra sobre ella mientras cae, aterriza en el colchón, se tumba y se duerme hecho un ovillo |
| Duerme en la cama | Recupera 90 puntos de energía por hora, el triple que dormido en el suelo, y no pierde felicidad |
| Se le acaricia en la cama | Salen corazones y sube la felicidad, pero no se despierta |
| Se le coge de la cama | La cama se queda donde estaba; se le puede volver a dejar en ella |
| Energía al 100 % (y al menos 20 s dormido) | Se levanta de un salto y la cama se guarda |
| Se le da de comer o se le trae con la bandeja estando en la cama | Sale de ella y la cama se guarda |

### Modelo del perro (`tools/model/build_dog.py`)
**Clip nuevo `Nap`** (4 s en bucle). La pose de dormir que había (`Sleep`) es estirada: no cabe en la cama. `Nap` parte de la de tumbado y baja la grupa hasta el colchón, recoge las patas delanteras, curva el lomo y el cuello hacia su derecha y recoge la cola por delante. En la app se le ve desde ese lado, así que la cabeza queda vuelta hacia quien mira, apoyada en el borde de la cama. El modelo pasa de 14 a 15 clips.

### Necesidades (`src/needs.ts`)
El desgaste ya no distingue dormido de despierto con un sí o no, sino con tres estados: `awake`, `asleep` (en el suelo) y `bed`. Sigue calculándose con marcas de tiempo.

### Comportamiento (`src/behavior.ts`)
Actividad nueva `nap`. La cama está en uno de tres sitios: guardada, fuera en su ventana (`bedSpot`) o dibujada bajo el perro (`inBed`). Dónde sale y si el perro cae dentro son dos funciones puras con pruebas (`bedSpotX`, `landsInBed`).

### La segunda ventana (`bed.html`, `src/bedWindow.ts`, `src-tauri/`)
- Se crea al arrancar, oculta. No recibe nunca el ratón, no se puede activar y no sale en la barra de tareas.
- Casi siempre está quieta: solo dibuja mientras la cama aparece o desaparece, y un fotograma en cada relevo.
- La ventana del perro le manda órdenes numeradas por eventos de Tauri y espera a que conteste que ya está dibujada (`showBed` y `hideBed` en `src/desktop.ts`, que sigue siendo el único módulo que importa Tauri).
- **Se muestra y se oculta con la API de Windows**, no con la de Tauri (ver la primera fila de la tabla siguiente).

## Lo que se probó y se descartó

| Intento | Por qué no |
|---|---|
| Mostrar la ventana de la cama con `show()` de Tauri | **Le quitaba el foco a la ventana del perro en pleno arrastre y quedaba por delante de él**, aunque estaba marcada como no activable. Lo detectó la prueba con el ratón real. Ahora la muestra el lado nativo con `SetWindowPos`, sin activarla y justo debajo de la del perro |
| Cama en forma de rosquilla baja | Vista casi a ras de suelo, como la ve la app, era un aro plano: no se le veía el interior. Se le subió el reborde por detrás |
| Dormir en la cama con el clip `Sleep` | El perro, estirado, es más largo que la cama: las patas y la cabeza colgaban por fuera |
| Primera versión de `Nap` | La grupa quedaba en alto; después, con la cabeza más baja, el morro y una pata atravesaban el reborde. Se agrandó la cama un 10 %, se recogieron las patas y el perro se coloca 0,2 unidades más atrás dentro de ella |
| Cola poco recogida | La punta atravesaba el reborde por detrás |

## Decisiones que el usuario no especificó
Quedan a su criterio; todas son un número o una línea en `src/behavior.ts` o `src/needs.ts`.

1. **Dónde sale la cama**: a 300 px, hacia el lado con más sitio. Así nunca sale debajo del perro, y soltarlo donde estaba no lo manda a dormir sin querer.
2. **Cuánto recupera**: 90 puntos por hora. De 20 a 100 tarda 53 minutos; en el suelo, a 30 por hora, tarda más de dos horas y media.
3. **Cuándo se despierta**: con la energía al 100 %. Si ya estaba descansado, duerme 20 segundos y se levanta.
4. **Las caricias no lo despiertan** en la cama (en el suelo sí, como hasta ahora).
5. **Sigue durmiéndose solo en el suelo** cuando se queda sin energía. La cama es la forma de mandarlo a descansar antes y de que descanse mejor.
6. **La cama no se queda en el escritorio**: se guarda cuando no se usa.
7. **Color**: mostaza y crema.

## Verificación
Con la app de desarrollo y las herramientas de `tools/verify/`:

| Comprobación | Resultado |
|---|---|
| `node tools/verify/bed.mjs` (órdenes inyectadas, sin tocar el ratón) | 15 comprobaciones correctas: la cama sale a 300 px, se guarda si se le suelta lejos, duerme si se le suelta encima (clip `Nap`, ojos cerrados), su ventana queda donde estaba la cama, recupera energía (de 50,038 a 50,238 en 8 s: 90 puntos por hora), las caricias no lo despiertan, la cama no se mueve al cogerlo de ella y se guarda al despertar |
| Arrastre con el ratón real hasta la cama (`input.ps1 -Action drag -DX -300 -DY -160`) | El perro acaba dormido en la cama, con su ventana en la posición de esta. En el aire: el perro por delante de la cama y la cama sin el foco |
| Cogerlo de la cama con el ratón real y volver a soltarlo | La cama se queda en (1760, 1052) y el perro vuelve a dormirse. Un primer intento no llegó a pulsar: el clic habría atravesado al perro dormido; repetido, correcto |
| Se despierta solo | Ocurrió durante el trabajo: tras varias siestas de prueba la energía llegó a 100 y el perro se levantó y se fue andando |
| Arrastre de siempre (`carry.mjs`) | Sin cambios: balanceo máximo de 11,1°, contento al soltarlo, cama guardada |
| Clics que atraviesan (`clickthrough.ps1`) | Correcto dos veces (de 78 a 153 ms); una tercera con el ratón del usuario en movimiento |
| `npx tsc --noEmit`, `npx vitest run` | Sin errores; 32 pruebas en verde (6 nuevas) |
| `npm run model:bed`, `npm run model` | Cama sin errores ni avisos de validación; perro con 15 clips, sin errores y el aviso de siempre |
| `npm run build` | Genera las dos páginas, `index.html` y `bed.html` |

Capturas en `docs/capturas/`: `cama-secuencia.png` (la secuencia en la app), `cama-escritorio.png` (en el escritorio real, en brazos sobre la cama y dormido) y `cama-modelo.png` (la cama y la pose `Nap` en Blender).

## Consecuencias
- **Memoria**: la segunda ventana es otro proceso de WebView2. En desarrollo, con la cama guardada, ocupa 47 MB de memoria privada y no gasta procesador (290 MB en total). No se ha medido en la versión empaquetada.
- **Dependencia nueva en Rust**: el crate `windows` 0.62, que ya era dependencia de Tauri.
- La cama cuenta como "perro" para los clics cuando el perro está dentro, igual que el cuenco: pulsar sobre ella es pulsar sobre él.
- Las herramientas de depuración distinguen ahora las dos ventanas (`cdp.mjs --page bed`).
- En el navegador (`npm run dev`) no hay segunda ventana: la cama solo se ve cuando el perro ya está dentro.

## Qué no se ha probado
- **La versión empaquetada.** No se ha regenerado el instalador ni actualizado la app instalada: se hará si el usuario aprueba la propuesta.
- Varios monitores, o monitores con distinta escala. La cama sale en el monitor donde se coge al perro y solo cuenta en ese.
- Que la ventana de la cama no aparezca en Alt+Tab: se ha comprobado su estilo de ventana (`WS_EX_TOOLWINDOW`, sin `WS_EX_APPWINDOW`), no la lista.
- El frontend en el navegador con estos cambios.

## Incidencias
- Las pruebas han movido la energía guardada del perro. Estaba en 95 al empezar; se ha dejado en 95 al terminar. La felicidad ha subido a 100 por las caricias de prueba.
- `clickthrough.ps1` falló con su punto por defecto, el centro de la ventana: desde el modelo nuevo (decisión 0018), más pequeño, ahí ya no hay perro. No tiene que ver con la cama. Se ha bajado el punto por defecto.
- Con el perro dormido la app dibuja 10 fotogramas por segundo, y una vez el clic simulado llegó antes de que la ventana empezara a capturar el ratón. Ya pasaba al dormir en el suelo; no se ha investigado.
