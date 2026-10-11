# 0003. Mascota: perro mediano de color negro

- **Fecha:** 2026-10-11
- **Estado:** aceptada
- **Decide:** el usuario

## Contexto
El tipo de criatura condiciona la dificultad del modelo 3D y de las animaciones.

## Opciones consideradas
1. Criatura inventada de formas redondas (la más fácil de modelar por código; era la recomendación inicial).
2. Gato.
3. Perro.
4. Dejar la elección a la investigación.

## Decisión
El usuario eligió un **perro mediano de color negro**, respuesta propia fuera de las opciones propuestas.

## Consecuencias
- Es un cuadrúpedo: el esqueleto y el caminar son más difíciles que en una criatura sin patas. Esto motivó preferir un modelo base ya riggeado (decisión 0005).
- El pelaje negro se pierde sobre fondos oscuros y aplana el sombreado. Hacen falta medidas específicas: gris muy oscuro en lugar de negro puro, borde de luz, contorno claro y detalles de contraste (collar, lengua, ojos). Ver `docs/investigacion.md`, "Pelaje negro legible sobre cualquier fondo".
