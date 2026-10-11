# 0004. Framework: Tauri 2 + Three.js (TypeScript + Vite)

- **Fecha:** 2026-10-11
- **Estado:** aceptada
- **Decide:** el usuario, sobre la recomendación de la investigación

## Contexto
La app necesita una ventana transparente siempre encima, clics que atraviesen donde no hay mascota, render 3D con fondo transparente y bajo consumo. Comparativa completa en `docs/investigacion.md`, parte 1.

## Opciones consideradas
| Opción | A favor | En contra |
|---|---|---|
| Tauri 2 + Three.js | Instalador de pocos MB; plugins oficiales de bandeja, autostart y persistencia; existe un proyecto abierto reciente (bonggu-desktop-pet) que resuelve el mismo caso | Sin click-through por píxel nativo; exige instalar Rust y las Build Tools de C++; primera compilación lenta |
| Electron + Three.js | Nada que instalar; reenvío de clics nativo | Instalador de unos 90 MB; ese reenvío tuvo fallos en Windows 11 corregidos el 9-10-2026 |
| Godot 4 | Motor 3D nativo | Click-through hacia otras aplicaciones difícil; consumo base alto |
| Unity | Probado en mascotas de escritorio | Depende de un editor gráfico; restricciones de D3D11 |
| Bevy | Ejemplo oficial de mascota | API inestable; compilación lenta |

## Decisión
Tauri 2 + Three.js, con TypeScript y Vite. Electron queda como segunda opción.

## Consecuencias
- El click-through se implementa sondeando la posición del cursor y leyendo el alpha del píxel con `gl.readPixels`.
- Todo acceso a la API de Tauri se aísla en `src/desktop.ts`, para poder ejecutar el frontend en un navegador y para que migrar a Electron sea barato.
- El hito 2 es un prototipo que valida este punto antes de construir el resto. Si no cumple, se documenta y se pasa a Electron.
- El ahorro de memoria frente a Electron en Windows es pequeño (ambos usan Chromium); la ventaja real es el tamaño del instalador.

## Fuentes
- https://github.com/dbwk10317/bonggu-desktop-pet
- https://github.com/tauri-apps/tauri/issues/6164
- https://github.com/tauri-apps/tauri/issues/9250
- https://github.com/electron/electron/pull/52633
