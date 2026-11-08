# 0029. El instalador se publica en GitHub, como release, con Wingman dentro

- **Fecha:** 2026-10-31
- **Estado:** hecha y deshecha el mismo día, por orden del usuario: la release se borró a las 01:01:33 ([0030](0030-instalador-retirado-de-github.md))
- **Decide:** Lucas Pérez Fernández
- **Resuelve:** lo que dejaron pendiente la [0021](0021-mascota-wingman.md) y la [0028](0028-carpeta-para-instalar-en-otro-equipo.md): si el instalador que se reparte lleva a Wingman
- **Matiza:** la [0014](0014-publicacion-en-github.md), que decía que el instalador no se sube. Sigue fuera de git, pero ya se descarga desde GitHub

## Lo que pidió el usuario
> quiero que subas el .exe para que se descargue rápidamente desde github y no sea necesario bajarse el proyecto para instalarlo

## Dónde se sube

| Opción | A favor | En contra |
|---|---|---|
| **Una release de GitHub, con el instalador como fichero adjunto** (elegida) | Es el sitio que tiene GitHub para esto. Enlace directo de descarga, sin clonar ni iniciar sesión. Cada versión queda con su etiqueta y su commit | Nada que se note a esta escala |
| Versionar el `.exe` en el repositorio | Se ve al entrar | Es un fichero generado (decisión 0014): cada versión engorda el historial para siempre, y descargarlo desde la lista de ficheros es más rebuscado que desde una release |
| Otro alojamiento (una web propia, una nube) | | Más piezas y otra cuenta, para lo mismo |

## Con Wingman o sin él
El repositorio es público, así que la release la puede descargar cualquiera. Antes de subir se le preguntó al usuario, recordándole lo que recoge la 0021 sobre la política de Riot (no usar su propiedad intelectual en aplicaciones sin permiso):

| Opción | Resultado |
|---|---|
| Un instalador aparte, sin Wingman | Recomendada por el agente. No se eligió |
| **El instalador que ya había, con Wingman** | **Elegida por el usuario** |

### Consecuencias
- **El modelo de Riot queda publicado** dentro del instalador, en un repositorio con el nombre del usuario. Riot puede pedir que se retire. Si lo pide, se borra el fichero de la release (`gh release delete-asset v0.1.0 DesktopFriend_0.1.0_x64-setup.exe`) y se sube uno sin Wingman, compilado apartando `public/models/wingman.glb`. Lo que ya se haya descargado no se puede recuperar.
- **El código fuente sigue sin el modelo.** `.gitignore` no cambia: quien clone el repositorio sigue sin Wingman. Solo lo lleva el instalador.
- **El aviso de Riot va en la release**, en inglés, como pide su política, además del que ya estaba en el README.

## Cómo queda

| Qué | Valor |
|---|---|
| Release | [`v0.1.0`](https://github.com/LucasPrezFdez/desktop_friend/releases/tag/v0.1.0), "DesktopFriend 0.1.0", marcada como la última, ni borrador ni versión previa |
| Etiqueta | `v0.1.0`, en `2b9a503`, **el commit del que se compiló el instalador**. Entre ese commit y `main` solo hay documentación (decisión 0028), así que el código fuente que ofrece la release es el del instalador |
| Fichero | `DesktopFriend_0.1.0_x64-setup.exe`, 3 495 550 bytes, SHA-256 `8bcebb59…27291`. Es el de las 16:17 del 2026-10-13: el instalado en este equipo y el de la carpeta de la 0028 |
| Enlace directo | `https://github.com/LucasPrezFdez/desktop_friend/releases/download/v0.1.0/DesktopFriend_0.1.0_x64-setup.exe` |
| Descripción | En español: los pasos para instalar (con el aviso de SmartScreen y las casillas del instalador en inglés), cómo se usa en corto, cómo se desinstala y el SHA-256 para comprobar la descarga. Al final, el aviso de Riot |
| README | La sección "Instalar" pasa arriba, con el enlace de descarga y el aviso de SmartScreen. En los créditos se dice que el instalador sí lleva a Wingman |

### El enlace del README apunta a la v0.1.0, no a "la última"
GitHub tiene un enlace que siempre baja la última versión (`releases/latest/download/<nombre>`), pero solo funciona si el fichero se llama igual en todas, y el nombre del instalador lleva la versión. Con el enlace a la `v0.1.0`, el README no se rompe nunca; cuando haya otra versión, hay que cambiarlo. El enlace a la lista de releases también está, y esa siempre está al día.

### Cómo se desinstala
La descripción dice: Configuración → Aplicaciones → Aplicaciones instaladas → DesktopFriend. Sale del script de NSIS (`WriteRegStr SHCTX "${UNINSTKEY}"`, en modo `currentUser`), y en este equipo la clave está en `HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\DesktopFriend`, con su `UninstallString`.

## Verificación

| Comprobación | Resultado |
|---|---|
| El instalador corresponde al código | El de la carpeta raíz y el de `src-tauri/target/release/bundle/nsis/` tienen el mismo SHA-256 que anotó la 0028; `git diff --stat 2b9a503 main` solo toca `docs/` |
| La release existe y es pública | `gh release view v0.1.0`: publicada a las 23:54:03 UTC del 30 (00:54 del 31 en hora de aquí), sin borrador ni versión previa |
| Lo que se descarga es lo que se subió | Descargado con `curl` sin iniciar sesión desde el enlace directo: código 200, 3 495 550 bytes, mismo SHA-256. GitHub da el mismo resumen en su campo `digest` |
| Es la última | `releases/latest` lleva a `releases/tag/v0.1.0` |
| La etiqueta está donde debe | `git rev-parse v0.1.0^{commit}` da `2b9a503527c3250db754c369adf72d13c19b73a0` |

## Qué no se ha probado
- **Instalarlo desde la descarga en otro equipo**, como ya decía la 0028: ni el aviso de SmartScreen, ni Windows 10, ni un equipo sin WebView2. Al bajarlo con un navegador, Windows le pone la marca de "descargado de internet", y es con esa marca con la que sale el aviso de SmartScreen; `curl` no la pone, así que el aviso no se ha visto.
- **La página de la release y el README vistos en el navegador.** Se han comprobado por la API y con `curl`, no a ojo.
