# 0013. Empaquetado, consumo medido y estado final

- **Fecha:** 2026-10-11
- **Estado:** aceptada
- **Decide:** el agente

## Empaquetado
- Instalador NSIS generado con `npm run tauri build`: `src-tauri/target/release/bundle/nsis/DesktopFriend_0.1.0_x64-setup.exe`, **2,38 MB**. El ejecutable ocupa 9,8 MB.
- Se instala por usuario en `%LOCALAPPDATA%\DesktopFriend`, sin permisos de administrador, con acceso en el menú Inicio y desinstalador.
- No lleva WebView2 dentro: usa el que ya trae Windows 11.
- **Sin firma de código.** En otro equipo, Windows SmartScreen avisará al ejecutar el instalador. Firmarlo exige un certificado de pago; no se ha hecho.
- **Sin actualizador automático.** No estaba en el alcance; para actualizar se instala la versión nueva encima.

## Consumo medido en reposo
Medido con `tools/verify/usage.ps1` sobre la versión empaquetada, sumando el proceso de la app y los seis de WebView2 que cuelgan de él. El equipo tiene 12 hilos.

| Medida | CPU (de un núcleo) | CPU (del equipo) | Memoria privada |
|---|---|---|---|
| Modo desarrollo, prototipo con una esfera | 13,8 % | 1,2 % | no medida (403 MB de RAM en uso) |
| Empaquetada, 30 fotogramas por segundo siempre | 15,5 % | 1,3 % | 194 MB |
| Empaquetada, sin el halo CSS (experimento) | 15,8 % | 1,3 % | 188 MB |
| **Empaquetada, fotogramas ajustados por actividad** | **12,8 %** | **1,1 %** | **183 MB** |

Reparto de la CPU en la última medida: 5,5 % el proceso que dibuja la página, 4,9 % el de la GPU y el resto entre los demás.

### Decisiones tomadas a partir de las medidas
- **Fotogramas por segundo según la actividad:** 30 al pasear, comer, saltar o recibir caricias; 20 de pie, sentado, tumbado o triste; 10 dormido. Antes eran 30 siempre y 15 dormido.
- **Se mantiene el halo CSS.** El experimento de quitarlo no cambió el consumo y es lo que separa al perro negro de un fondo oscuro.
- **Se acepta el consumo actual.** Alrededor del 1 % del equipo y 183 MB es lo que cuesta tener una página web con 3D abierta; la investigación ya advertía de que en Windows Tauri no ahorra memoria frente a Electron. La ventaja de Tauri se confirma en el instalador: 2,4 MB frente a los 85 a 96 MB que citaba la investigación para Electron.

### Si hiciera falta bajarlo más
No se ha hecho; son opciones para el futuro:
1. Dejar de dibujar del todo cuando el perro duerme y el cursor está lejos.
2. Mover el sondeo del cursor a Rust para no cruzar a JavaScript varias veces por segundo.
3. Quitar el suavizado de bordes del renderer.

La primera medida de la versión empaquetada dio 32,7 % de un núcleo. Se tomó a los pocos segundos de arrancar y no se repitió en las siguientes; se atribuye al arranque, sin haberlo demostrado.

## Errores encontrados solo en la versión empaquetada
| Error | Causa | Arreglo |
|---|---|---|
| El perro quedaba 39 px bajo y pisaba la barra de tareas | La ventana se medía antes de que Windows le quitase la barra de título (301 px de alto en vez de 340). En desarrollo no ocurría porque la página tarda más en cargar | `Behavior.relayout()`: se vuelve a apoyar en el suelo al mostrarse la ventana y cada vez que cambia de tamaño |

## Verificación final
Todo sobre la versión empaquetada o instalada:

| Comprobación | Resultado |
|---|---|
| `npx tsc --noEmit` y `npx vitest run` | Sin errores; 26 pruebas en verde |
| Clics que atraviesan (`clickthrough.ps1`), 3 veces empaquetada y 1 instalada | Correcto, entre 59 y 165 ms |
| Sin botón en la barra de tareas | Correcto (captura de la barra) |
| El perro se apoya en el borde de la barra de tareas | Correcto tras el arreglo (ventana en y = 1052 con zona útil hasta 1392) |
| Dar de comer guarda el estado al momento | Saciedad +35,0 en el fichero |
| Tiempo con la app cerrada (3 horas simuladas) | Saciedad −24,1, felicidad −15,0, energía hasta el tope de 100 |
| Orden de la bandeja "dar de comer" | Correcta (evento enviado al frontend) |
| Segunda instancia | No se abre otra; la primera trae al perro a su sitio |
| Instalación silenciosa | Código 0; ejecutable, desinstalador, acceso en el menú Inicio y entrada de desinstalación |
| Arranque desde el menú Inicio | Correcto |

## Qué no se ha verificado
- Pulsar de verdad en el menú de la bandeja, incluida la casilla "Arrancar con Windows" (la clave de registro está sin crear, como corresponde antes de marcarla).
- Varios monitores y escalas distintas de 100 %.
- Un día entero de uso: la deriva de necesidades solo está probada con pruebas unitarias y con el salto simulado de 3 horas.

## Estado en el equipo de desarrollo
La app ha quedado **instalada y en marcha**. Para quitarla: Configuración → Aplicaciones → DesktopFriend → Desinstalar, o ejecutar `%LOCALAPPDATA%\DesktopFriend\uninstall.exe`. El estado de la mascota está en `%APPDATA%\dev.desktopfriend.pet\pet.json`.
