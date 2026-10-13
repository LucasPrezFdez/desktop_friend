# 0026. La cama aparece en la esquina derecha de la pantalla

- **Fecha:** 2026-10-13
- **Estado:** propuesta en la rama `cama-en-la-esquina`. El sitio lo decide el usuario; la excepción de más abajo la propone el agente y está pendiente de su opinión
- **Decide:** el usuario
- **Sustituye a:** de la [0019](0019-cama-del-perro.md), dónde sale la cama (la primera fila de "Cómo funciona" y el punto 1 de "Decisiones que el usuario no especificó"): a 300 px del perro, hacia el lado con más sitio

## Lo que pidió el usuario
> ahora quiero que la cama aparezca enla esquina derecha de la pantalla por defecto.

## Decisión
Al coger al perro, la cama aparece **en la esquina inferior derecha de la pantalla en la que está**, apoyada en el suelo del escritorio (el borde de la barra de tareas), esté donde esté el perro.

### La excepción: cuando el perro ya está junto a esa esquina
El perro vive ahí. Su sitio al arrancar por primera vez, y al que vuelve con "Traer aquí", está a 80 px de la esquina derecha, junto a la bandeja. Una cama en la esquina le saldría debajo, y cogerlo y soltarlo sin moverlo lo acostaría: cae dentro si se le suelta a menos de 105 px del centro de la cama.

Por eso, **si la ventana del perro está a menos de 300 px de la esquina, la cama sale 300 px a su izquierda**, como hasta ahora. Es la regla que ya traía la 0019 ("nunca sale debajo del perro, y soltarlo donde estaba no lo manda a dormir sin querer"), reducida a ese caso.

| Dónde está el perro al cogerlo | Dónde sale la cama |
|---|---|
| A 300 px o más de la esquina derecha | En la esquina derecha |
| A menos de 300 px de ella | 300 px a su izquierda |
| En una pantalla tan estrecha que no hay 300 px a ningún lado | En el extremo que le quede más lejos |

Una consecuencia que se nota: cuando el perro se despierta en la cama de la esquina, se queda de pie en la esquina. Si se le vuelve a coger antes de que se vaya andando, la cama sale a su izquierda, no en la esquina.

### Opciones para ese caso
| Opción | Resultado |
|---|---|
| **La cama a la izquierda del perro** | **Elegida.** Mantiene lo que ya había y no acuesta al perro sin querer |
| La cama siempre en la esquina, sin excepción | Descartada: con el perro en su sitio de siempre, levantarlo y soltarlo lo mandaría a dormir cada vez |
| Siempre en la esquina, pero sin acostarlo si no se le ha movido | Descartada sin probar: la cama taparía al perro al aparecer, y habría que explicar por qué a veces soltarlo encima no lo acuesta |

Si el usuario la prefiere siempre en la esquina, es dejar `bedSpotX` en una línea.

## "Por defecto"
Hoy es el único sitio: no hay ningún ajuste para elegir otro. Si se quiere uno (la esquina izquierda, o donde estaba antes), iría en el menú de la bandeja, como el de la pantalla (decisión 0022).

## Cuánto se acerca a la esquina
La cama se dibuja centrada en una ventana de 420 px, y esa ventana queda pegada al borde derecho de la pantalla. La cama mide unos 255 px, así que su borde queda a unos 82 px del de la pantalla. No se ha pegado más porque, cuando el perro duerme en ella, su ventana ocupa ese mismo sitio, y la ventana del perro no puede salirse de la pantalla: en un equipo con dos pantallas asomaría por la de al lado.

## Lo que cambia
- `src/behavior.ts`: la función `bedSpotX`, que es pura, y el comentario de `BED_DISTANCE`, que pasa de ser la distancia a la que sale a la mínima a la que puede salir.
- `tests/behavior.test.ts`: las pruebas de `bedSpotX`.
- `tools/verify/bed.mjs`: coloca al perro en mitad de la pantalla y junto a la esquina antes de cogerlo, comprueba dónde sale la cama en cada caso y al terminar lo devuelve a donde estaba.
- `README.md`: "aparece su cama en la esquina derecha de la pantalla".

## Verificación
Con la app de desarrollo, en una pantalla de 2560 × 1392 útiles a escala 1, a las 16:08 (salida de las herramientas):

| Comprobación | Resultado |
|---|---|
| `node tools/verify/bed.mjs` | Las 18 comprobaciones (3 nuevas), correctas. Con el perro en mitad de la pantalla, la ventana de la cama sale en (2140, 1052): su borde derecho en 2560 y el inferior en 1392, la esquina de la zona útil. Con el perro a 80 px de la esquina, sale 300 px a su izquierda y soltarlo donde estaba no lo acuesta |
| Captura de la ventana de la cama en el escritorio real | La cama, en la esquina inferior derecha |
| `node tools/verify/nap.mjs`, con la cama en la esquina | Las 8, correctas: los mismos números que en la decisión 0023 |
| `node tools/verify/carry.mjs` | Sin cambios |
| `npx tsc --noEmit`, `npx vitest run`, `npm run build` | Sin errores; 42 pruebas (2 nuevas); las dos páginas |

## Qué no se ha probado
- **Con el ratón real**: las órdenes se han inyectado, como en la 0023.
- **La versión empaquetada.** No se ha regenerado el instalador: la app instalada sigue sacando la cama a 300 px del perro.
- Dos pantallas, u otra escala. La regla usa los límites de la pantalla en la que está el perro, y eso tiene pruebas unitarias con una pantalla a la izquierda de la principal, pero no se ha visto en una de verdad.

## Incidencias
- Para abrir la app de desarrollo hubo que cerrar la instalada, que estaba en marcha: solo puede haber una. Al terminar se ha vuelto a abrir desde el menú Inicio.
- Las pruebas han movido la energía guardada del perro de 99,6 a 99,5.
