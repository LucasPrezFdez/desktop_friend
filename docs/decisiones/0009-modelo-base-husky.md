# 0009. Modelo base: el Husky de Quaternius, por delante del Shiba Inu

- **Fecha:** 2026-10-11
- **Estado:** aceptada
- **Decide:** el agente, tras la inspección prevista en la decisión 0005

## Contexto
La decisión 0005 dejaba pendiente inspeccionar el asset antes de comprometerse. Se descargaron los dos candidatos desde Poly Pizza (licencia mostrada: CC0 1.0) y se inspeccionaron con `tools/model/inspect.mjs` y con renders de `tools/model/preview.py`.

## Qué se encontró
| | Husky | Shiba Inu |
|---|---|---|
| Vértices | 3900 | 3966 |
| Huesos | 49 | 46 |
| Materiales | 5, de color plano, sin texturas | 6, de color plano, sin texturas |
| Clips | 12 (duplicados con otro nombre): `Idle`, `Idle_2`, `Idle_2_HeadLow`, `Walk`, `Gallop`, `Gallop_Jump`, `Jump_ToIdle`, `Eating`, `Attack`, `Death` y dos de impacto | Los mismos |
| Cola | Recta y levantada, 6 huesos | Enroscada |
| Mandíbula y párpados | No tiene | No tiene |

Esto resuelve lo que la investigación no pudo verificar: los materiales son de color plano (recolorear es cambiar un valor) y el pack trae caminar, reposo y también **comer**.

## Opciones consideradas
1. Husky.
2. Shiba Inu.
3. Descartar ambos y modelar por código (alternativa de la decisión 0005).

## Decisión
Husky. Los dos sirven; la cola recta de seis huesos hace que mover la cola, la señal más expresiva de un perro, se lea con claridad, mientras que la enroscada apenas cambiaría de silueta. No hace falta la alternativa por código.

## Consecuencias
- Clips que se reutilizan: `Idle`, `Idle_2`, `Idle_2_HeadLow`, `Walk`, `Gallop`, `Eating`. Se descartan los de ataque, muerte e impacto y los duplicados.
- Clips que hay que crear por código: sentarse, tumbarse, dormir, feliz y triste.
- Las patas dependen de huesos de control (`IKFrontLeg`, `IKBackLeg`) que no cuelgan del cuerpo: al bajar el cuerpo para sentarse o tumbarse hay que recalcular las patas. El script resolverá esa cinemática inversa por su cuenta.
- Sin mandíbula, la boca no se abre: la lengua será una pieza añadida que se muestra u oculta.
- Sin párpados, el parpadeo será una shape key que aplana los ojos.
- El modelo trae una malla suelta sobrante (`Icosphere`) que se elimina.

## Procedencia
- Husky: https://poly.pizza/m/wcWiuEqwzq, fichero https://static.poly.pizza/611d25c7-430f-4bb5-ab2c-d8f5f3cb9712.glb, SHA-256 `a1e107ec4c2c62ce8cad86f750a7f6f9f2065c691dc6f88fce39667d3f4877eb`.
- Shiba Inu: https://poly.pizza/m/y4wdQpg767, SHA-256 `9cbd4f1e12f85024126eab6a2c5706c099196df1a10db74e6c8b67bac3fff54a`.
- Descargados el 2026-10-11. Autor: Quaternius.
