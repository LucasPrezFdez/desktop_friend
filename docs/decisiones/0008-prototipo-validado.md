# 0008. Se mantiene Tauri: el prototipo de clics que atraviesan funciona

- **Fecha:** 2026-10-11
- **Estado:** aceptada
- **Decide:** el agente, con las mediciones del hito 2

## Contexto
La decisión 0004 condicionaba Tauri a que un prototipo demostrase el punto más arriesgado: una ventana transparente siempre encima cuyos clics atraviesen donde no hay mascota. Si fallaba, había que pasar a Electron.

## Qué se probó
Ventana de 420×340 con una esfera 3D en el centro, en la app real (`npm run tauri dev`), con `tools/verify/clickthrough.ps1` y `tools/verify/screenshot.ps1`.

| Comprobación | Resultado |
|---|---|
| Fondo transparente, sin borde ni marco | Correcto (captura de pantalla sobre el escritorio y sobre otra ventana) |
| Siempre encima | Correcto |
| Sobre la esfera, la ventana recibe el clic | Sí, en 61 a 149 ms |
| En zona transparente, el clic llega a lo que hay debajo | Sí, en 56 a 72 ms |
| Vuelve a capturar después de soltar | Sí, en 61 a 76 ms |
| Estabilidad con el cursor quieto 2 s en cada zona | Sin oscilaciones (muestreo cada 50 ms) |
| Compilación de Rust | A la primera, 2 min 8 s |

Consumo en reposo en modo desarrollo (compilación de depuración y servidor de Vite): unos 400 MB sumando los siete procesos y un 14 % de un núcleo. No es representativo; se volverá a medir con la versión empaquetada.

## Incidencia
Las tres primeras ejecuciones de la prueba dieron resultados incoherentes (capturaba a la primera y no a la tercera). No se reprodujo en las ocho ejecuciones siguientes ni en el muestreo continuo. La causa más probable es que el ratón real se moviera durante la medición, así que la prueba ahora comprueba que el cursor sigue donde lo puso y avisa si no. No se ha demostrado que esa fuese la causa.

## Decisión
Se mantiene Tauri 2 + Three.js. No se pasa a Electron.

## Consecuencias
- El peor caso de latencia (unos 150 ms) se da cuando el cursor llega de lejos de un salto. Con un ratón real el cursor cruza antes el margen de 80 px en el que el sondeo ya es rápido.
- El consumo en reposo queda como punto a vigilar: bajar los FPS cuando el perro duerma y medir la versión empaquetada en el hito 7.
- `skipTaskbar` no se puede comprobar por los estilos de la ventana (Tauri lo aplica por otra vía); se verificará visualmente.
