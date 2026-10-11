# 0015. Arreglo: la cabeza se deformaba al acariciar la cara

- **Fecha:** 2026-10-11
- **Estado:** aceptada
- **Decide:** el agente, a petición del usuario

## Síntoma
El usuario observó que, al acariciar la cara del perro, a veces la animación fallaba y la cabeza empezaba a deformarse.

## Reproducción
Con `tools/verify/pet-face.mjs`, que acaricia la cara con un cursor virtual (eventos inyectados en la página, sin mover el ratón real) y mide cuánto se aparta el giro de la cabeza del que tenía al empezar. Una caricia la levanta y la ladea unos 12 grados.

| Postura | Giro máximo de la cabeza | Giro que queda al dejar de acariciar |
|---|---|---|
| Sentado (`Sit`) | 179,9° | 34 a 37° |
| Tumbado (`Lie`) | 179,6° | 29° |
| De pie (`Idle`) | 18,1° | 0,2° |

Sentado y tumbado la cabeza daba vueltas y se quedaba torcida. De pie no fallaba: por eso ocurría "a veces".

## Causa
La app gira la cabeza encima de lo que deja el clip de animación (`Dog.enjoyPetting`). Ese código daba por hecho que el mezclador de Three.js reescribe cada hueso en cada fotograma. No es así: `PropertyMixer.apply` solo escribe en el hueso **si su valor ha cambiado** respecto al fotograma anterior.

Cuando el clip deja la cabeza quieta, el mezclador no la toca, el hueso conserva el giro de la caricia del fotograma anterior y el del fotograma actual se suma encima. A 20 o 30 fotogramas por segundo, la cabeza da vueltas.

Comprobaciones que lo confirman:
1. El código de Three.js (`node_modules/three/src/animation/PropertyMixer.js`, comentario "value has changed -> update scene graph").
2. La pista de la cabeza es constante exactamente en los clips donde falla (`Sit`, `Lie`, y también `LieDown`, `Eat` y `Run`) y variable en los que no (`Idle`, `IdleLook`, `Walk`).
3. Las medidas de la tabla.

La cola usa el mismo mecanismo y tenía el mismo fallo, menos visible porque su giro es una onda que casi se cancela: tras acariciarlo sentado, su tercer hueso quedaba entre 43 y 67° de su giro inicial, cuando un meneo normal lo mueve unos 5°.

## Opciones consideradas
1. **Devolver cada hueso al giro del clip antes de que actúe el mezclador** (elegida). Se guarda el giro que dejó el clip y se restaura al empezar el fotograma siguiente. Si el mezclador escribe, manda su valor; si no, queda el del clip, sin lo añadido.
2. Forzar al mezclador a reescribir siempre. Exigiría tocar sus datos internos, que no son API pública.
3. Añadir movimiento a las pistas fijas al generar el modelo. Taparía el síntoma en esos clips y lo dejaría latente en cualquier clip futuro o en un fotograma congelado.

## Decisión
Opción 1, en `src/dog.ts`: una lista `layered` con los siete huesos que la app gira (seis de la cola y la cabeza) y tres líneas en `update()`. Es el único cambio en el código de la app.

## Verificación
La misma prueba, con el arreglo:

| Postura | Giro máximo de la cabeza | Giro que queda | Cola (tercer hueso) |
|---|---|---|---|
| Sentado, 4 s | 12,0° | 0,0° | 0,1 a 5,1° |
| Tumbado, 4 s | 12,1° | 0,0° | 0,2 a 9,4° |
| Tumbado, 12 s | 12,0° constante | 0,0° | 0,1 a 6,4° |
| De pie, 4 s | 18,5° | 1,5° | 2,5 a 11,2° |

- Capturas antes y después del arreglo revisadas: con el arreglo la cabeza se levanta sin deformarse y vuelve a su postura.
- En dos pasadas sentado (6 y 12 s) el perro se levantó durante la prueba; el giro fue de 12° constantes mientras estuvo sentado, y el cambio posterior corresponde al cambio de postura.
- `npx tsc --noEmit` sin errores y 26 pruebas unitarias en verde.

## Qué no se ha probado
Acariciarlo mientras come o corre, donde la pista de la cabeza también es fija. El arreglo actúa sobre el mecanismo común, no sobre clips concretos, pero no hay medida directa de esos dos casos.

## Consecuencias
- Se añaden `tools/verify/pet-face.mjs` y `tools/verify/cdp-client.mjs`, que sirven de prueba de regresión.
- Instalador regenerado y app instalada actualizada con el arreglo.
