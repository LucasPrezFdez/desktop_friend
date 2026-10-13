# 0024. El perro se llama Blacky

- **Fecha:** 2026-10-13
- **Estado:** decidida por el usuario. Hecha en la rama `nombre-blacky`. En `main` y en GitHub desde el 2026-10-13 por orden del usuario ([0025](0025-todo-a-main-y-app-instalada.md))
- **Decide:** el usuario
- **Depende de:** la rama `cama-sin-cruces` (decisión 0023), de la que sale esta y que no está aprobada todavía
- **Sustituye a:** el punto 3 de "Decisiones que el usuario no especificó" de la [0020](0020-menu-de-mascotas.md), que le ponía el nombre de la especie, "Perro"

## Lo que pidió el usuario
> Cambia el nombre del perro por Blacky

## Decisión
En el menú de mascotas el perro se llama **Blacky**. Es el único sitio de la app donde sale su nombre: bajo su retrato y en el texto que aparece al dejar el cursor encima ("Blacky · es la que tienes ahora", "Cambiar a Blacky").

## Lo que cambia
Una línea de `src/pets.ts`: `name: 'Perro'` pasa a `name: 'Blacky'`.

Lo que **no** cambia:

| Qué | Por qué |
|---|---|
| El identificador `dog` | Es lo que se guarda en `pet.json` (`chosenPet`) y lo que elige el modelo. Cambiarlo haría que una app ya instalada no reconociera la mascota guardada |
| El nombre de la app, DesktopFriend | El usuario pidió el nombre del perro |
| Los nombres de ficheros, clases y materiales (`dog.glb`, `Dog`, `build_dog.py`) | Son del código, no se ven |
| La palabra "perro" en comentarios y documentos | Sigue siendo un perro |
| `tests/pets.test.ts` | Usa su propia lista de ejemplo ("Perro" y "Gato"), no la de la app |

## Verificación
| Comprobación | Resultado |
|---|---|
| `node tools/verify/menu.mjs`, con la app de desarrollo | Las 20 comprobaciones, correctas. Los círculos son "Blacky, Wingman, Pronto" y el de la mascota actual, "Blacky" |
| Captura del menú abierto | Se lee "Blacky" entero bajo su retrato |
| `npx tsc --noEmit`, `npx vitest run` | Sin errores; 40 pruebas |

## Qué no se ha probado
- La versión empaquetada: no se ha regenerado el instalador.

## Consecuencias
- `docs/capturas/menu-mascotas.png` sigue mostrando "Perro": es de la decisión 0020 y no se ha rehecho.
