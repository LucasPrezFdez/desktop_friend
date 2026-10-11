# 0005. Modelo 3D: base libre de Quaternius retocada y animada con Blender en modo script

- **Fecha:** 2026-10-11
- **Estado:** aceptada, pendiente de la inspección del asset (hito 3)
- **Decide:** el usuario, sobre la recomendación de la investigación

## Contexto
El modelo lo tiene que producir un agente que trabaja con texto y línea de comandos, sin manejar un editor gráfico. Hace falta un perro negro en GLB con animaciones de reposo, parpadeo, cola, feliz, comer, triste, sentarse, dormir y caminar. Comparativa completa en `docs/investigacion.md`, parte 2.

## Opciones consideradas
| Opción | A favor | En contra |
|---|---|---|
| Base libre + Blender en modo script | Malla, esqueleto y caminar hechos por un artista; reproducible | Depende de un asset de terceros; la descarga puede requerir un clic |
| 100 % por código en Blender | Totalmente propio y reproducible | Acabado más sencillo; caminar menos natural |
| Procedural en Three.js | Nada que instalar | Aspecto de juguete articulado |
| IA generativa (Tripo) | Riggea cuadrúpedos por API | Cuenta y clave; coste por intento; no reproducible |

## Decisión
Partir del Husky o del Shiba Inu del "Ultimate Animated Animal Pack" de Quaternius y transformarlo con `tools/model/build_dog.py`: pelaje negro, detalles de contraste, parpadeo y los clips de mascota que el pack no trae.

## Condición y alternativa
Antes de comprometerse se inspecciona el glTF (clips, huesos, materiales). Si el estilo, los clips o los materiales no sirven, se pasa al modelado 100 % por código en el mismo pipeline. El resultado de esa inspección se registrará en una decisión nueva.

## Consecuencias
- Hay que instalar Blender 5.2 LTS.
- Los scripts deben usar la API de Blender 5.x (acciones con slots, sin `action.fcurves`).
- Se guardan en `assets/source/` la licencia, la URL y la fecha de descarga del asset. La licencia es ambigua (CC0 en la página del pack, licencia propia en la página de licencia); ambas permiten incluir el modelo en la app, pero no se publicará el asset original suelto.

## Fuentes
- https://quaternius.com/packs/ultimateanimatedanimals.html
- https://quaternius.com/license.html
- https://developer.blender.org/docs/release_notes/5.0/python_api/
