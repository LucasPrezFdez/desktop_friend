# 0028. Una carpeta con lo necesario para instalar la app en otro equipo

- **Fecha:** 2026-10-13
- **Estado:** hecha. Si el instalador que se reparte lleva a Wingman lo decide el usuario (ver más abajo). Lo decidió el 2026-10-31: con Wingman, y publicado en GitHub ([0029](0029-instalador-en-github.md))
- **Decide:** el usuario pide la carpeta; qué lleva dentro lo propone el agente

## Lo que pidió el usuario
Una carpeta en el escritorio con todo lo necesario para instalar la app en el ordenador de otra persona.

## Qué hace falta de verdad
Solo el instalador. Se comprobó en el script que Tauri le pasa a NSIS (`src-tauri/target/release/nsis/x64/installer.nsi`):

| Duda | Lo que hay |
|---|---|
| ¿Hace falta ser administrador? | No: `INSTALLMODE` es `currentUser`. Se instala en `%LOCALAPPDATA%\DesktopFriend` |
| ¿Hace falta instalar WebView2 aparte? | No. Windows 11 lo trae. Si falta, `INSTALLWEBVIEW2MODE` es `downloadBootstrapper`: el instalador lo descarga, y entonces sí necesita internet |
| ¿Hace falta Node, Rust o Blender? | No: son para compilar, no para usar |
| ¿En qué idioma sale? | En inglés: solo lleva `English.nsh` |

## Decisión
La carpeta `Instalar DesktopFriend`, en el escritorio del usuario, con dos ficheros:

| Fichero | Qué es |
|---|---|
| `DesktopFriend_0.1.0_x64-setup.exe` | El instalador de las 16:17, el mismo que está instalado en este equipo: lleva el icono de la foto, a Blacky y la cama en la esquina. Entre el commit del que se compiló y `main` solo hay cambios de documentación |
| `LEEME.txt` | Instrucciones en español para quien lo instala: qué necesita, los pasos, el aviso de SmartScreen, cómo se usa, el menú de la bandeja y cómo se quita |

La carpeta **no está en el repositorio**: el instalador no se versiona, y el `LEEME.txt` vive con él.

### Lo que explica el `LEEME.txt` y no es evidente
- **El aviso azul de SmartScreen.** El instalador no está firmado (decisión 0013), así que en otro equipo Windows dice "Windows protegió su PC". Hay que pulsar "Más información" y "Ejecutar de todas formas". Sin esa explicación, lo normal es no instalarlo.
- **El instalador está en inglés**, y las dos casillas de la última pantalla ("Run DesktopFriend" y "Create desktop shortcut") conviene dejarlas marcadas.
- Está hecho y probado en Windows 11. En Windows 10 debería funcionar, pero no se ha probado.

## Wingman va dentro del instalador
El instalador se compila en este equipo, donde está el modelo de Wingman, que es de Riot Games. La decisión 0021 dejó dicho que para uso propio no cambia nada, pero que repartir el instalador con Wingman dentro lo decide el usuario, y la 0025 se lo recordó.

Se ha copiado el instalador tal cual, con Wingman, porque es la app que el usuario tiene y pide. Dárselo a una persona no es publicarlo, pero la decisión es suya.

| Opción | Resultado |
|---|---|
| **El instalador que hay, con Wingman** | El que está en la carpeta |
| Uno sin Wingman | Se compila apartando `public/models/wingman.glb`. La app arranca con el perro y, en el menú de mascotas, el círculo de Wingman sale sin retrato (decisión 0021) |

## Verificación
| Comprobación | Resultado |
|---|---|
| La copia del instalador es idéntica al de la carpeta raíz | Mismo SHA-256 (`8BCEBB59…`) |
| El instalador corresponde al código de `main` | `git diff` entre el commit del que se compiló (`2b9a503`) y `main` no toca `src`, `src-tauri`, `public` ni `assets` |
| Ese mismo instalador funciona | Es el que se instaló en este equipo a las 16:17, y la app está en marcha |
| El `LEEME.txt` se lee bien en el Bloc de notas | UTF-8 con marca de orden de bytes y saltos de línea de Windows |

## Qué no se ha probado
- **Instalarlo en otro equipo.** No hay ninguno a mano: ni el aviso de SmartScreen, ni un Windows 10, ni un equipo sin WebView2.
- Las pantallas del instalador, vistas: aquí siempre se ha instalado en silencio (`/S`). Los nombres de los botones y de las casillas salen de su script.
