# 0014. Publicación en GitHub: todo el proyecto, modelos incluidos, en `main`

- **Fecha:** 2026-10-11
- **Estado:** aceptada
- **Decide:** el usuario
- **Sustituye en parte a:** las decisiones 0005 y 0009, que preveían no publicar los modelos originales sueltos

## Contexto
El usuario creó el repositorio público https://github.com/LucasPrezFdez/desktop_friend y añadió el remoto `origin`, pero el repositorio seguía vacío: hasta ahora solo se habían hecho commits locales, y todo el trabajo estaba en la rama `desarrollo` (`main` tenía solo el commit inicial).

Al ser público había que decidir dos cosas.

## Ramas
| Opción | Efecto |
|---|---|
| **Fusionar `desarrollo` en `main` y subir ambas** (elegida) | Quien abra el repositorio ve el proyecto completo |
| Subir las ramas tal cual | `main` mostraría solo la documentación inicial |
| Subir solo `desarrollo` | `main` se quedaría en el equipo |

La fusión es un avance rápido: `main` pasa a apuntar al último commit de `desarrollo`, sin reescribir nada.

## Modelos 3D
El repositorio contiene `assets/source/quaternius/Husky.glb` y `ShibaInu.glb` (originales) y `public/models/dog.glb` (derivado).

| Opción | A favor | En contra |
|---|---|---|
| **Subir todo** (elegida) | El repositorio se compila tal cual; la página de descarga (Poly Pizza) y la del pack los publican como CC0 | La página general de licencia de Quaternius muestra desde el 28-08-2026 una licencia propia que prohíbe redistribuir los modelos como ficheros sueltos |
| Subir sin ningún modelo | Elimina la duda | Reescribe el historial local y obliga a tener Blender para compilar |
| Hacer antes privado el repositorio | Elimina la duda sin tocar nada | El proyecto deja de ser público |

Quitar solo los originales no habría resuelto nada: el perro negro derivado contiene la misma malla y las mismas animaciones.

## Decisión
Fusionar en `main` y subir todo, modelos incluidos.

## Consecuencias
- Se asume el riesgo, bajo pero no nulo, de que Quaternius considere aplicable su licencia nueva a estos modelos. La procedencia, la licencia mostrada el día de la descarga y los créditos están en `assets/source/quaternius/PROCEDENCIA.md` y en el README.
- Si Quaternius lo pidiera, la salida es la segunda opción: retirar los modelos y hacer que el script los descargue y regenere.
- El instalador no se sube: está en `.gitignore` porque es un fichero generado.
- El historial publicado incluye el nombre y el correo configurados en git en este equipo, como en cualquier repositorio.
