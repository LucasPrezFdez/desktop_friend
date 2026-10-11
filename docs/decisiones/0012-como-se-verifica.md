# 0012. Cómo se verifica una app que es una ventana transparente

- **Fecha:** 2026-10-11
- **Estado:** aceptada
- **Decide:** el agente

## Contexto
La app no tiene una página que abrir en un navegador ni una salida de texto: es una ventana transparente sobre el escritorio que reacciona al ratón. Hacía falta una forma de comprobarla que no dependiera de "parece que funciona".

## Decisión
Cuatro niveles, cada uno con su herramienta en el repositorio:

| Nivel | Herramienta | Qué comprueba |
|---|---|---|
| Lógica | `npx vitest run` | Necesidades, tiempo con la app cerrada, elección de actividad (24 pruebas) |
| Modelo | `npm run model` | Que están los 13 clips, que ninguno está vacío, validación glTF y hoja de contactos |
| App por dentro | `tools/verify/cdp.mjs` | Se conecta al puerto de depuración de WebView2: fuerza actividades, lee el estado y captura lo que se dibuja sobre el fondo que se le pida |
| App por fuera | `tools/verify/clickthrough.ps1`, `input.ps1`, `screenshot.ps1` | Preguntan a Windows qué ventana recibiría un clic, mueven el ratón de verdad y capturan el escritorio |

`tools/verify/sheet.ps1` une varias capturas en un mosaico para revisarlas de una vez.

## Alternativas descartadas
- **Solo capturas de pantalla del escritorio.** No permiten forzar un estado concreto ni probar fondos distintos.
- **Probar solo el frontend en un navegador.** No ejercita la ventana transparente ni los clics que atraviesan, que eran el mayor riesgo.

## Consecuencias
- Las pruebas de `input.ps1` y `clickthrough.ps1` mueven el cursor real uno o dos segundos y lo devuelven a su sitio. Si se toca el ratón mientras tanto, `clickthrough.ps1` lo detecta y avisa.
- El acceso de depuración (`window.pet`) solo existe en modo desarrollo; la versión empaquetada no lo incluye.

## Qué queda sin verificar automáticamente
- El menú de la bandeja (dar de comer, traer aquí, mostrar u ocultar, salir) y la casilla de arranque con Windows: requieren pulsar en el área de notificación.
- El comportamiento con varios monitores de distinta escala: el equipo de desarrollo tiene uno.
