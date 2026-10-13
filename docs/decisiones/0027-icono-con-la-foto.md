# 0027. El icono de la app es una foto del perro del usuario

- **Fecha:** 2026-10-13
- **Estado:** hecha en la rama `icono-foto` y puesta en la app instalada. **Sin subir a GitHub**: lo decide el usuario (ver "La foto y el repositorio público")
- **Decide:** el usuario pide el icono y da la foto; el recorte lo propone el agente

## Lo que pidió el usuario
> pon esta imagen como icono de la app

Con una foto suya, `C:\Users\lucas\Pictures\icono.jpeg`: su perro tumbado sobre una manta de cuadros, con una diadema roja de astas de reno. 1536 × 2048 píxeles, sin datos EXIF (ni fecha, ni lugar, ni cámara).

## Lo que había
El icono era un render de la cabeza del modelo anterior, el Husky pintado de negro con collar rojo, sobre un círculo ámbar (bitácora, fila 67). La decisión 0018 ya dejó anotado que no correspondía al perro nuevo.

## Decisión
El icono es la foto, recortada en un cuadrado alrededor de la cabeza y enmarcada **en un círculo con el fondo transparente**, como el anterior.

### El recorte
Un icono tiene que ser cuadrado y la foto es vertical: hay que elegir qué parte.

| Recorte | Resultado |
|---|---|
| **La cabeza con las dos astas enteras** (cuadrado de 1266 px desde el punto 270, 170) | **Elegido.** Es la foto que mandó, entera en lo que importa. La cara ocupa algo más de la mitad del círculo |
| Algo más cerrado (1198 px) | Descartado: el hocico quedaba pegado al borde del círculo |
| Solo la cara, cortando las astas | Descartado: la cara se ve mayor en pequeño, pero pierde lo que hace reconocible la foto |

A 16 y 32 píxeles, que es como se ve en la bandeja y en la barra, una foto no se lee como un dibujo: queda una mancha oscura con el rojo de la diadema y las astas. Se distingue de otros iconos, pero no se reconoce al perro hasta los 48.

### Redondo y no cuadrado
Sobre la barra de tareas, un cuadrado de manta de cuadros llama más la atención que el perro. El círculo, además, es lo que había.

## Cómo se hace
- `tools/icon.ps1` (nuevo) recorta, deja el cuadrado en 1024 px y pinta el círculo. Escribe `assets/icon.png`, la fuente del icono.
- `npx tauri icon assets/icon.png` genera de ahí todos los tamaños de `src-tauri/icons/`. Crea también carpetas para Android e iOS, que esta app no usa: se han borrado, como estaban.

```
powershell -File tools/icon.ps1 -In C:\Users\lucas\Pictures\icono.jpeg -X 270 -Y 170 -Side 1266
npx tauri icon assets/icon.png
```

**La foto original no se copia al repositorio.** Solo el recorte.

## La foto y el repositorio público
`assets/icon.png` y `src-tauri/icons/` se versionan: hacen falta para compilar. El repositorio es público (decisión 0014), así que **subir esta rama publica el recorte de la foto en GitHub**, y eso no se deshace del todo.

En el recorte se ve el perro, la diadema y la manta. No sale ninguna persona, ni nada de la casa que se reconozca, y el fichero no lleva metadatos. Aun así es una foto personal: la rama se queda en este equipo hasta que el usuario diga si la sube.

## Verificación
| Comprobación | Resultado |
|---|---|
| El recorte, visto a 512, 48, 32 y 16 px sobre fondo oscuro y claro | La cabeza y las dos astas caben en el círculo |
| `npx tauri icon` | Los 17 ficheros de `src-tauri/icons/` regenerados; `icon.ico` con 6 imágenes |
| Icono que Windows saca del ejecutable instalado (`ExtractAssociatedIcon` sobre una copia recién hecha) | La foto |
| El acceso del menú Inicio | Usa el icono del ejecutable (no tiene uno propio) |
| La app instalada | Reinstalada con `/S` a las 16:17, código 0, y en marcha |

## Qué no se ha probado
- **El icono en la bandeja, en el menú Inicio y en el instalador, vistos en pantalla.** Mirarlos habría sido mover el ratón del usuario o capturarle el escritorio. La bandeja usa el icono por defecto de la ventana, que sale del mismo sitio.
- Windows guarda los iconos en una caché. Se le ha pedido que la renueve (`ie4uinit.exe -show`), pero el menú Inicio puede seguir enseñando el anterior hasta que se cierre la sesión.

## Incidencias
- **La primera compilación no llevaba el icono nuevo.** `npm run installer` recompiló la app pero reutilizó el recurso de Windows que ya tenía (`resource.lib`, de las 15:59): cambiar los ficheros de `src-tauri/icons/` no hace que se vuelva a generar. Se vio al extraer el icono del ejecutable instalado, que seguía siendo el viejo. Arreglo: `cargo clean -p desktopfriend --release` y volver a compilar. La app instalada estuvo dos minutos con el icono viejo.
- Ese `cargo clean` se pasó también al perfil de desarrollo: el siguiente `npm run tauri dev` tardará más.
- La segunda vez el icono se extrajo de una copia del ejecutable con otro nombre, para que no pudiera salir de la caché de iconos de Windows.

## Consecuencias
- El icono ya no sale del modelo: si el perro de la app cambia, el icono no cambia con él.
- La app instalada va por delante de `main`: lleva este icono y `main` no.
