# 0011. Diseño de la interacción, las necesidades y el comportamiento

- **Fecha:** 2026-10-11
- **Estado:** aceptada
- **Decide:** el agente

## Contexto
La petición fija dos interacciones (acariciar y dar de comer) y que haya una mascota a la que cuidar. El resto del diseño quedaba abierto.

## Gestos
| Gesto | Efecto | Por qué |
|---|---|---|
| Frotar el cursor sobre el perro, sin pulsar | Acariciar | Es el gesto natural y no choca con arrastrar |
| Pulsar y mover más de 6 px | Coger al perro y llevarlo a otro sitio | Permite recolocarlo; al soltarlo cae al suelo |
| Clic o clic derecho | Abrir el panel de estado | El panel contiene el botón de dar de comer |
| Botón "Dar de comer" o menú de la bandeja | Dar una ración | Arrastrar comida desde fuera no es posible: una ventana que deja pasar los clics no recibe arrastres del sistema |

Las caricias distinguen zona: en la **cabeza** el perro la levanta, la ladea y cierra los ojos; en el **lomo** solo mueve la cola. La zona se decide por la distancia en pantalla a la cabeza (58 px), no con un rayo contra la malla, que era lo previsto en el plan: da el mismo resultado visible con mucho menos coste.

## Necesidades
Tres valores de 0 a 100: **saciedad**, **felicidad** y **energía** (`src/needs.ts`, funciones puras con 20 pruebas).

| Situación | Saciedad | Felicidad | Energía |
|---|---|---|---|
| Despierto, por hora | −12 | −8 | −6 |
| Dormido, por hora | −6 | −2 | +30 |
| App cerrada, por hora | −8 | −5 | +10 |

- Una ración sube la saciedad 35 puntos y la felicidad 5. Con más de 92 de saciedad no quiere comer.
- Acariciar sube un punto de felicidad cada 120 px frotados. El primer valor (45 px) llenaba la felicidad en cinco segundos y se subió tras medirlo con el ratón real.
- **La mascota no muere.** Con la app cerrada el tiempo cuenta como mucho 12 horas y las necesidades no bajan de 10.
- Todo se calcula con marcas de tiempo, nunca contando fotogramas.
- Si el equipo se suspende con la app abierta (un salto del reloj de más de un minuto), ese rato cuenta como app cerrada. Sin esto, ocho horas de suspensión se aplicarían como ocho horas despierto y el perro amanecería sin comida.
- El estado se guarda cada 20 segundos, al dar de comer, al soltar al perro y al salir.

## Comportamiento
Máquina de estados en `src/behavior.ts`. El ánimo sale de las necesidades (el sueño manda sobre el hambre y el hambre sobre la tristeza) y decide qué hace:

| Ánimo | Qué tiende a hacer |
|---|---|
| Con sueño (energía < 20) | Se tumba y duerme hasta recuperar 85 de energía |
| Con hambre o triste (< 25) | Alicaído la mayor parte del tiempo, con un bocadillo (🍖 o 💔) |
| Tranquilo o feliz | Alterna estar de pie, pasear, sentarse y tumbarse |

- Antes de pasear o comer se levanta, reproduciendo hacia atrás los clips de sentarse o tumbarse.
- Acariciarlo dormido lo despierta sin levantarlo; acariciarlo mientras pasea lo detiene.
- Al comer aparece un cuenco junto al hocico que se va vaciando; al terminar salta contento con la lengua fuera.

## Ventana
- Ventana de 420×340 que se mueve con el perro, apoyada en el borde de la barra de tareas. El perro está siempre en el centro de la escena y **pasea moviendo la ventana**. Una ventana a pantalla completa habría dado problemas con la barra de tareas y más coste de composición.
- Se recuerda la posición horizontal entre sesiones.
- 30 fotogramas por segundo, 15 mientras duerme.

## Aspecto del perro negro
Valores finales tras ver las capturas (`src/blackFur.ts`):
- Pelaje `#1b1b21` y zonas claras `#2b2b33`. Los primeros (`#2a2a34`, `#3e3e4a`) con el borde de luz al 50 % daban un perro gris azulado.
- Rampa de tres tonos (140, 200, 255 sobre 255), borde de luz al 30 % solo en el contorno, y luz trasera fría.
- Halo CSS doble (claro y oscuro) alrededor del canvas: es lo que separa al perro de un fondo oscuro.
- Comprobado sobre fondo claro, gris, azul marino y sobre el fondo de escritorio real.

## Bandeja y arranque con Windows
El menú de la bandeja y el arranque con Windows se gestionan en Rust (`src-tauri/src/lib.rs`), no en el frontend: así no hace falta dar al frontend permisos sobre el arranque automático.

## Consecuencias
- El paseo no sincroniza exactamente la velocidad con la zancada: puede notarse un ligero deslizamiento de las patas.
- En equipos con monitores de distinta escala, el arrastre usa coordenadas físicas pedidas a Tauri para no depender de la escala del navegador.
