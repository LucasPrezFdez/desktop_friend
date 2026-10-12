# Investigación: cómo construir una mascota de escritorio 3D

Fecha: 11 de octubre de 2026.
Método: dos investigaciones web en paralelo (una sobre el framework de la app y otra sobre la creación del modelo 3D), contrastadas después con el estado real del equipo de desarrollo.

Leyenda de fiabilidad de cada dato:

- **[V]** verificado en la fuente citada.
- **[I]** inferencia de la investigación, no confirmada en una fuente.
- **[NV]** no se pudo verificar, o las fuentes se contradicen.

No se encontró ningún benchmark riguroso de RAM y CPU en Windows para una mascota 3D en ninguna pila; las cifras de consumo son orientativas.

## Punto de partida

| Elemento | Estado el 11-10-2026 |
|---|---|
| Carpeta del proyecto | Vacía, sin git |
| Sistema | Windows 11 Pro 10.0.26200, 16 GB de RAM, 74 GB libres en C: |
| GPU | NVIDIA GeForce RTX 2060 SUPER |
| Instalado | Node 24.21.0, npm 11.19.0, Git 2.56.0, VS Code 1.141.0, winget 1.29, WebView2 154.0 |
| No instalado | Rust, Build Tools de C++ de Visual Studio, Blender, Godot, .NET, Python real |

---

# Parte 1. Framework de la aplicación

## Requisitos que debe resolver cualquier candidato

1. Ventana transparente, sin bordes, siempre encima, sin entrada en la barra de tareas y con icono en la bandeja.
2. Clics que atraviesan la ventana donde no hay mascota y se capturan donde sí la hay (click-through por píxel). Es el punto más delicado.
3. Render 3D con fondo realmente transparente y carga de glTF/GLB con animaciones de esqueleto y blend shapes.
4. Consumo bajo en reposo: la app está abierta todo el día.
5. Instalador, actualización y arranque con Windows.
6. Persistencia del estado y del tiempo transcurrido con la app cerrada.

## Tabla comparativa

| Candidato | 1. Ventana y bandeja | 2. Click-through por píxel | 3. 3D con alpha y glTF | 4. Consumo en reposo | 5. Instalador, update, autostart | 6. Persistencia | Apto para desarrollo por agente |
|---|---|---|---|---|---|---|---|
| **Tauri 2 + Three.js** | Todo por configuración: `transparent`, `decorations`, `alwaysOnTop`, `skipTaskbar`, `shadow`; bandeja con la feature `tray-icon` [V] | `setIgnoreCursorEvents` afecta a toda la ventana y no tiene `forward` (issue #6164 abierto). Se resuelve sondeando `cursorPosition()` y leyendo el alpha con `gl.readPixels` [V] | WebGL sobre WebView2 con `alpha: true`; GLTFLoader, AnimationMixer y morph targets [V] | WebView2 es Chromium: RAM similar a Electron según el issue #5889 [V] | Hello-world de unos 3 MB (fuente débil); NSIS o MSI, plugins `updater` y `autostart` [V] | `tauri-plugin-store` (JSON) [V] | Muy alto: todo es código y `tauri dev/build` [I] |
| **Electron + Three.js** | `transparent`, `frame: false`, `alwaysOnTop`, `skipTaskbar`, `focusable` [V] | `setIgnoreMouseEvents(true, {forward: true})`, nativo. Con fallos en Windows 11 hasta el PR #52633, fusionado el 9-10-2026 [V] | El mismo código Three.js [I] | 128 MB frente a 109 MB de Tauri en una prueba en macOS [V] | Hello-world de 85 a 96 MB (fuente débil) | `electron-store` o JSON propio [I] | Muy alto [I] |
| **Godot 4.7** | Flags de `Window`; hay API de indicador de estado [V] | `mouse_passthrough_polygon`: un solo polígono y, en Windows, lo de fuera no se dibuja [V] | Motor 3D nativo; glTF de serie [I] | Proyecto vacío exportado: unos 200 MB (D3D12) o 400 MB (Vulkan) según un hilo del foro [V] | Export por defecto de unos 93 MB; sin updater ni autostart integrados [V] [I] | `ConfigFile` o JSON en `user://` [I] | Medio-alto [V] |
| **Unity** | Vía Win32 o la librería UniWindowController (MIT) [V] | UniWindowController hace hit-test por opacidad o raycast [V] | Excelente, pero la transparencia no funciona en D3D12 [V] | Mate Engine: unos 200 MB con un modelo de texturas grandes [V] | No verificado | PlayerPrefs o JSON [I] | Bajo: escenas y ajustes dependen del editor [I] |
| **Bevy 0.19** | `transparent: true`, `WindowLevel::AlwaysOnTop` [V] | `CursorOptions.hit_test` conmutado cada frame (ejemplo oficial `desk_toy`) [V] | glTF nativo [I]; fondo negro en Windows con NVIDIA sin configurar el panel [V] | Sin datos | Binario único; sin updater ni autostart [I] | serde a fichero [I] | Alto en texto, pero compilación lenta y API cambiante [I] |

Otros candidatos, con poca evidencia: Wails v3 (sin documentación sobre click-through), Flutter (`window_manager` tiene `setIgnoreMouseEvents`, pero sin evidencia de 3D glTF sobre superficie transparente), raylib (flags de ventana transparente y passthrough [V], blend shapes sin verificar) y WPF, PySide6 o Qt (los proyectos encontrados son 2D).

## Cómo resuelve cada uno el click-through

- **Tauri.** El mantenedor considera "casi imposible" detectar zonas transparentes desde el framework (#2090) y recomienda sondear la posición del cursor y calcular la intersección en la app (#9250) [V]. `cursorPosition()` devuelve coordenadas de escritorio aunque la ventana ignore el ratón [V]. Otra vía es un hook global con el crate `rdev` [V].
- **Electron.** `forward: true` más hit-test en `mousemove`. El PR #52633 cierra varios fallos de Windows 11 (`:hover` atascado, entre otros) [V]. La versión estable 44.7.0 es del 7 de octubre, así que probablemente aún no lo incluye [I]. El issue #33281 (el reenvío falla con ciertas ventanas en foco) se cerró sin arreglar [V].
- **Godot.** Las fuentes se contradicen sobre si el polígono deja pasar clics a otras aplicaciones [V]. La solución aceptada en el foro usa Win32 desde C# [V].
- **Unity.** En D3D11 hay que desactivar el modelo flip de DXGI; en URP, desactivar HDR [V].
- **Bevy.** `desk_toy` activa `hit_test` solo cuando el cursor está sobre el logo [V].

## Proyectos de referencia

| Proyecto | Pila | Qué aporta |
|---|---|---|
| [dbwk10317/bonggu-desktop-pet](https://github.com/dbwk10317/bonggu-desktop-pet) | Tauri ^2.12 + three ^0.186.1 + Vite ^8.3.1 | La referencia más cercana: modelo GLB, click-through por alpha, bandeja, instalador NSIS [V] |
| [not-elm/desktop-homunculus](https://github.com/not-elm/desktop-homunculus) | Bevy + VRM | Alpha temprana; aviso de NVIDIA en Windows [V] |
| [shinyflvre/Mate-Engine](https://github.com/shinyflvre/Mate-Engine) | Unity + VRM | Regiones táctiles y sistema de comida [V] |
| [moeru-ai/airi](https://github.com/moeru-ai/airi) | Electron + Three.js/Live2D | Migró de Tauri a Electron por audio en WebKit y DevTools, no por la ventana [V] |
| [ayangweb/BongoCat](https://github.com/ayangweb/BongoCat) | Tauri + Live2D | Mascota Tauri madura en Windows y macOS [V] |
| [NovusEdge/goob](https://github.com/NovusEdge/goob) | Godot 4.3+, 2D | Overlay con passthrough recortado [V] |

## Recomendación de la investigación

1. **Tauri 2 + Three.js.** Existe un proyecto abierto de este mismo mes que resuelve el punto delicado con código legible; todo es texto y línea de comandos; en Windows el motor es Chromium, así que WebGL se comporta como en Electron [I]; instalador pequeño y plugins oficiales. El ahorro de RAM frente a Electron en Windows es pequeño: la ventaja real es el tamaño del instalador.
2. **Electron + Three.js.** Reenvío de clics nativo y mismo Chromium en todos los sistemas, a cambio de mucho más peso y de fallos recientes en Windows.

Descartados como primera opción: Godot (click-through hacia otras aplicaciones difícil y consumo base alto), Unity (dependencia del editor y restricciones de D3D11) y Bevy (demasiado inestable).

## Datos técnicos para Tauri

- **Versiones [V]:** `tauri` y `@tauri-apps/api` 2.12.3, `tauri-cli` 2.12.2, `three` r186, `tauri-plugin-updater` 2.13.3, `tauri-plugin-single-instance` 2.5.3. Los plugins `store` y `autostart` requieren Rust 1.90 o superior.
- **Ventana (`app.windows[0]`) [V]:** `transparent`, `decorations: false`, `alwaysOnTop`, `skipTaskbar`, `shadow: false`, `resizable: false`, `visible: false`, `focus: false`. `shadow: false` es obligatorio: con `true`, una ventana sin decorar recibe un borde blanco de 1 px en Windows 11.
- **Permisos [V]:** `core:default`, `core:window:allow-set-ignore-cursor-events` (no está en el conjunto por defecto), `core:window:allow-cursor-position`, `core:window:allow-start-dragging`, `core:window:allow-set-position`, `store:default`, `autostart:allow-enable`, `autostart:allow-disable`, `autostart:allow-is-enabled`.
- **Renderer [V]:** `new THREE.WebGLRenderer({ alpha: true, antialias: true })`, `setClearColor(0x000000, 0)`, `setPixelRatio(devicePixelRatio)` reaplicado al cambiar de monitor, límite de 30 FPS y delta acotado a 0,1 s.
- **Algoritmo de click-through [V]:**
  1. Arrancar con `setIgnoreCursorEvents(true)`.
  2. Sondear `cursorPosition()` cada 50 ms y restar el origen de la ventana.
  3. Leer con `gl.readPixels` el alpha del píxel bajo el cursor tras cada render.
  4. Capturar solo si el alpha supera 128 y llamar a la API solo cuando cambie el estado.
  5. Mantener la captura durante un arrastre.
  6. Para saber qué parte del modelo se toca, usar un `Raycaster`, recalculando antes las cajas envolventes de cada `SkinnedMesh`.
- **Empaquetado [V]:** `tauri build --bundles nsis`; el modo WebView2 por defecto no añade peso.

## Riesgos conocidos

1. Latencia del sondeo: el primer clic tras entrar rápido puede atravesar la mascota [I].
2. Al cruzar a un monitor con otra escala, cursor y buffer pueden discrepar uno o dos frames [V].
3. Destello o fondo blanco al crear la ventana (issues #14515, #10318, #8133) [V].
4. Una ventana a pantalla completa da problemas con la barra de tareas (#7328) [V]: mejor una ventana pequeña que se mueva.
5. WebView2 lanza varios procesos [V].
6. Chromium ralentiza JS en ventanas ocluidas [V]: la simulación debe basarse en marcas de tiempo.
7. Una ventana en modo click-through no recibe arrastres del sistema [V]: la comida debe ser un objeto de la escena.
8. Enumerar ventanas ajenas puede disparar sistemas antitrampas de algunos juegos [V].

---

# Parte 2. Creación del modelo 3D

Objetivo: que un agente que trabaja solo con texto y línea de comandos produzca un perro mediano negro en formato GLB, con animaciones de reposo, parpadeo, mover la cola, feliz, comer, triste, sentarse, dormir y caminar.

## Tabla comparativa

| Vía | Calidad visual | Control y reproducibilidad | Automatizable por el agente | Coste | Riesgo de licencia | Animaciones |
|---|---|---|---|---|---|---|
| 1. Blender en modo script, perro procedural | Media; buena con diseño chibi simple [I] | Máximo | Sí [I] | 0 | Ninguno | Todas por código; caminar es lo difícil [I] |
| 2. Blender MCP | Igual que 1 | Menor: estado vivo en una sesión con interfaz | No del todo | 0 | Ninguno | Igual que 1 |
| 3. Procedural en Three.js, sin esqueleto | Media-baja para un cuadrúpedo [I] | Máximo | Sí | 0 | Ninguno | Todo en tiempo de ejecución [I] |
| 4. IA generativa alojada (Meshy, Tripo, Rodin) | Variable | Baja: no determinista | Sí, con clave y créditos | Céntimos a pocos dólares por intento | Medio | Tripo riggea cuadrúpedos por API [V] |
| 5. IA generativa local (Hunyuan3D, TRELLIS.2) | Variable; solo malla | Media | Solo con GPU grande | 0 más hardware | Hunyuan excluye la UE [V] | Ninguna |
| 6. Asset libre con rig y clips, retocado en Blender | Alta | Alta tras la descarga | Casi: la descarga puede requerir un clic [I] | 0 | Bajo | Caminar y reposo incluidos; faltan las de mascota |
| 7. Auto-rigging externo (Mixamo, AccuRIG) | Depende de la malla | Baja-media | No: interfaz gráfica y solo bípedos [V] | 0 a caro | Bajo-medio | Solo algunos admiten cuadrúpedos |

## Recomendación de la investigación

1. **Vía 6 + vía 1 (híbrida).** Un rig con buenos pesos y un caminar de cuadrúpedo son lo más difícil de hacer bien por código; un asset los trae resueltos. Los clips que faltan son de pose a pose con pocos huesos. Candidato: Shiba Inu o Husky del "Ultimate Animated Animal Pack" de Quaternius. Condición: inspeccionar antes el glTF, porque no se pudieron verificar los nombres de los clips ni el tipo de material.
2. **Vía 1 pura** si el asset no convence. Comparte todo el pipeline con la primera.

Descartadas: IA generativa (no determinista, coste por intento), Three.js sin esqueleto (aspecto de juguete), Blender MCP (no aporta nada frente a scripts con render de previsualización, y el socket no está autenticado [V]).

## Qué animar por código y qué obtener hecho [I]

| Animación | Por código | Nota |
|---|---|---|
| Reposo y respiración | Sí | Escala del pecho y leve balanceo |
| Parpadeo | Sí | Mejor en tiempo de ejecución, con temporizador aleatorio |
| Mover la cola | Sí | Seno con desfase por hueso, aditivo |
| Feliz | Sí | Cola rápida, rebote, lengua fuera |
| Triste o hambriento | Sí | Cabeza baja, orejas atrás, cola caída |
| Comer | Sí | Cabeza abajo y mandíbula cíclica |
| Sentarse | Sí | Cuidar la penetración de las patas traseras |
| Tumbarse y dormir | Sí | Pose más respiración lenta |
| Caminar | Mejor ya hecha | Coordinación de cuatro patas y deslizamiento de pies |

## Blender en modo script: hechos clave

- **Versión:** Blender 5.2.2 LTS (15-09-2026) [V]. Paquete winget `BlenderFoundation.Blender` [V].
- **Línea de comandos [V]:** `-b`, `-P`, `--python-exit-code`, `--factory-startup` y `--` para pasar argumentos.
- **Cambios que rompen scripts antiguos:**
  - 4.4: acciones con slots. Tras `animation_data.action = act` hay que comprobar `animation_data.action_slot` [V].
  - 5.0: eliminados `action.fcurves`, `action.groups` y `action.id_root`; el motor pasa a llamarse `BLENDER_EEVEE` [V].
  - 5.1: Python 3.13 [V].
- **Exportador glTF:** `export_animation_mode='ACTIONS'` [V]; `export_apply=True` impide exportar shape keys [V]; una acción se exporta si es la activa o está apilada en una pista NLA [V parcial].
- **Rigify:** existe metarig de lobo, no de perro [V]. No se recomienda: genera cientos de huesos de control [I].
- **Pesos automáticos:** `parent_set(type='ARMATURE_AUTO')`; el error "Bone Heat Weighting" es conocido [V].
- **Render de previsualización:** posible con `bpy.ops.render.render(write_still=True)`; no hay confirmación de que EEVEE funcione sin interfaz en Windows, Cycles en CPU es la alternativa segura [NV].

## Perros con licencia libre

| Modelo | Licencia | Animaciones | Notas |
|---|---|---|---|
| Quaternius "Ultimate Animated Animal Pack" (Shiba Inu, Husky, Wolf) | CC0 en la página del pack y en Poly Pizza [V] | Más de 12 por animal; lista exacta [NV] | FBX, OBJ, Blend y glTF [V] |
| Quaternius "Dog" en Poly Pizza | CC0 [V] | Sin lista [NV] | FBX y glTF |
| "Low poly Black dog" de Nulla_ (Sketchfab) | CC BY 4.0 [V] | Walk, idle, inclinar la cabeza [V] | 876 triángulos; etiquetado NoAI |
| "Black Shiba Inu" de elkiotbear (Poly Pizza) | CC BY 3.0 [V] | Sin lista [NV] | GLB |
| Gobkit Free Animal Pack (corgi) | CC0 1.0 [V] | idle, attack, dead, walk en una sola pista [V] | Atlas de color horneado |

La página de licencia de Quaternius muestra ahora una "Quaternius Asset License v1.0" (28-08-2026) que permite el uso comercial dentro de productos y prohíbe redistribuir los assets como tales, mientras que las páginas de los packs siguen diciendo CC0 [V]. Ambas permiten incluir el GLB en la app [I].

## IA generativa y auto-rigging

| Herramienta | Rig de cuadrúpedo | Local |
|---|---|---|
| Tripo | Sí por API (tipo `quadruped`) [V] | No |
| Meshy | En la web sí ("Quadruped Dog"); por API solo humanoides [V] | No |
| Rodin / Hyper3D | No [NV] | No |
| Hunyuan3D 2.1 | No | 10 a 29 GB de VRAM [V] |
| TRELLIS.2 | No | 24 GB de VRAM, solo Linux [V] |
| Mixamo, AccuRIG 2 | Solo bípedos [V] | Interfaz gráfica |

## Herramientas glTF por línea de comandos

- **glTF Transform** (`@gltf-transform/cli` 4.5.0): `inspect`, `validate`, `optimize`, entre otros [V].
- **gltfpack:** `-kn` conserva los nodos con nombre [V].
- **glTF-Validator** de Khronos, con paquete npm [V].

## Pelaje negro legible sobre cualquier fondo [I]

- Albedo gris muy oscuro con tinte azulado, no negro puro: con negro las bandas del sombreado toon desaparecen.
- Rampa toon cuyo tono mínimo no sea cero, con filtro `NearestFilter` [V].
- Luz de contorno trasera y `HemisphereLight` para levantar el vientre.
- Borde fresnel sumado a la emisión: no depende de las luces.
- Contorno claro en lugar del negro por defecto.
- Halo CSS doble (claro y oscuro) sobre el canvas.
- Detalles de contraste: ojos con brillo, lengua rosa, collar saturado, cejas y hocico más claros.

## Riesgos del modelo

| Riesgo | Mitigación |
|---|---|
| Scripts de ejemplo anteriores a Blender 4.4 o 5.0 | Fijar 5.2 LTS, usar `keyframe_insert` y `--python-exit-code 1` |
| Acción asignada sin slot: el clip sale vacío | Comprobar `action_slot`; verificar con `inspect` |
| Solo se exporta la acción activa | Apilar todas en pistas NLA |
| Faltan las shape keys en el GLB | `export_apply=False` |
| Los huesos no animados heredan la pose del clip anterior | Clave en todos los huesos en el frame 0 |
| Render sin interfaz en negro | Cycles en CPU, o capturar el GLB desde un navegador |
| No se conocen los clips reales del asset | Inspeccionar antes de comprometerse |
| Licencia de Quaternius ambigua | Guardar URL, fecha y licencia; no publicar el asset suelto |

---

# Parte 3. El modelo nuevo (12 de octubre de 2026)

Datos reunidos para la decisión 0018. Aquí [V] significa medido con una herramienta o visto directamente en las fotos.

## El perro de las fotos
Cuatro fotos del usuario, que no se guardan en el repositorio.

- Perro pequeño de pelo negro, de tipo spaniel. [V] La raza o mezcla exacta no se conoce. [NV]
- Orejas caídas, largas y anchas, con flecos ondulados; arrancan a los lados del cráneo, por debajo de su punto más alto. [V]
- Hocico corto y ancho con canas: casi blanco en labios y barbilla, gris hacia los ojos; la caña sigue negra. Canas también alrededor de los ojos. [V]
- Sobre cada ojo, canas sueltas y cortas que salen del párpado de arriba y suben tendidas hacia la sien; más densas sobre la mitad de dentro, sin formar un borde continuo y distintas en cada ojo (`2.jpeg`, adjunta el 2026-10-12). [V]
- Ojos grandes y redondos, marrón oscuro, con el centro velado de azul grisáceo en las cuatro fotos. [V] La causa no se conoce y no hace falta para el modelo. [NV]
- Mancha blanca y gris pequeña en el pecho; pelo ondulado en cuello y pecho. [V]
- Cola con flecos largos; en la foto en que se le ve sentado desde arriba la lleva levantada. [V]
- Flecos detrás de las patas. [V]
- De pie (foto 2), el hueco entre la barriga y el suelo es bastante menos de la mitad de su altura. [I] Las fotos están tomadas desde arriba y no permiten medirlo.

## La malla del Husky
Medido con scripts de Blender sobre `assets/source/quaternius/Husky.glb`.

- 3900 vértices y 1920 caras tal como se importa; soldando los vértices coincidentes quedan 955 vértices y 1906 triángulos, en una sola isla y sin bordes abiertos. [V]
- Mira hacia -Y; mide 3,89 de largo y 3,19 de alto hasta la punta de las orejas; el lomo queda a 2,3 y la barriga a 1,2. [V]
- Los ojos son caras diminutas dentro de la propia malla; su contorno usa el material de la trufa. [V]
- El cráneo no pesa solo sobre `Head`: los lados y la parte de arriba pesan sobre `Ear1` y la nuca sobre `Neck3`. [V]
- Los huesos de las orejas cuelgan de `Neck3`, no de `Head`. [V]
- El grupo `Tail1` incluye la grupa, no solo el arranque de la cola. [V]

## La cabeza del perro, medida
Medido por un segundo agente sobre las cuatro fotos (1536 × 2048 píxeles), para la revisión 4 de la decisión 0018. Todo en anchos de cráneo (el ancho de costado a costado donde nacen las orejas).

- El ancho del cráneo no se ve limpio en ninguna foto: las orejas lo tapan. Se toma como 1,5 veces la separación entre los centros de los ojos, con un margen de 1,4 a 1,75. [I]
- No hay foto de perfil ni de frente sin perspectiva. La foto 1 es la única con la cámara casi a la altura de la cabeza, y al ser un primer plano agranda hocico y barbilla un 10–15 %. [I]
- Separación entre los centros de los ojos: 0,67. [V]
- Diámetro del ojo visible: 0,15; disco azulado: 0,12. [V]
- La línea de los ojos cae entre el 39 % y el 47 % del alto de la cabeza, contando desde arriba. [V]
- Visto de frente, lo alto del cráneo es un arco ancho y rebajado: en la foto 1 la pendiente no pasa de 10° en los 0,9 anchos centrales. [V]
- Las orejas nacen unos 0,15 por debajo de la coronilla (entre 0,10 y 0,25) y 0,37 por encima de la línea de los ojos. [V]
- De la coronilla a la oreja la silueta es un solo arco convexo; no hay entrante en ninguna de las cuatro fotos. [V]
- Las orejas miden de 0,97 a 1,01 de largo con flecos; la punta queda de 0,47 a 0,52 por debajo de la línea de los ojos, a la altura de la boca; lo más ancho está poco por debajo de los ojos. [V]
- Ancho total de la cabeza con orejas: 1,71 en reposo y de 1,9 a 2,1 con las orejas abiertas. [V]
- Ancho de la trufa: 0,31; proporción ancho/alto de 1,6 a 1. [V]
- Ancho del hocico: de 0,60 a 0,67 en las fotos, unos 0,55 a 0,60 descontando la perspectiva. [I]
- El largo del hocico y la inclinación de la frente no se pueden determinar con estas fotos. [NV]

Medido por el agente principal sobre recortes de las mismas fotos, para la revisión 8. Todo en separaciones entre los centros de los ojos, que se miden directamente en las cuatro; valores de las fotos 1, 2, 3 y 4. Son medidas a ojo sobre los recortes, con un error de unas décimas.

- Ancho del hocico: 1,3 / 0,87 / 1,05 / 0,93. La foto 1 es un primer plano y lo agranda. [V]
- Ancho de la trufa: 0,57 / 0,41 / 0,48 / 0,41. [V]
- Diámetro del ojo: 0,25 en las cuatro; la abertura es redonda. [V]
- De la coronilla a la línea de ojos: 0,75 / 0,81 / 1,13 / 1,06. Crece cuanto más alta está la cámara, porque se suma el largo del cráneo. [V]
- De la línea de ojos al centro de la trufa: 0,47 / 0,67 / 0,80 / 0,86. [V]
- Con las proporciones del modelo, esas cuatro últimas cifras corresponden a una cámara unos 10°, 25°, 37° y 43° por encima del eje del hocico. [I]
- Sobre cada ojo hay un abultamiento, con un surco en medio de la frente (fotos 1 y 3); el stop queda entre los ojos. [V]
- La caña del hocico es negra hasta la trufa; las canas están a los lados de la trufa, en los labios y en la barbilla (fotos 2 y 3). [V]

## Cómo cambiar la malla sin romper los clips
- Los clips guardan, para cada hueso, un giro respecto a su postura de reposo. Si un hueso solo se traslada en reposo, o se gira junto con su malla, los clips siguen valiendo. [V] Comprobado con las orejas (trasladadas y colgadas de otro hueso) y la cola (girada 38°).
- Un escalado no uniforme del nodo raíz afecta por igual a la malla, al esqueleto y a los clips: los pies siguen coincidiendo con sus huesos de control. [V] Comprobado en la hoja de poses con suelo.
- Cambiar la longitud de los huesos de las patas rompería esa coincidencia, porque los pies cuelgan de huesos de control que no dependen del cuerpo. [I] No se llegó a probar.
- `bmesh.ops.holes_fill` rellena el hueco de cada oreja; un abanico desde el centro (`poke`) deja un pico en la nuca porque el hueco no es plano. [V]
- El cálculo automático de normales puede dejar del revés una pieza abierta, y Blender la dibuja igual por las dos caras. Activando el descarte de caras traseras en el render se ve como en la app. [V]

# Parte 4. La cama y su ventana (12 de octubre de 2026)

Hechos comprobados al añadir la cama (decisión 0019). No hubo búsqueda en la web: salen del código de las dependencias instaladas en este equipo y de medidas sobre la app en marcha.

## Ventanas en Windows con Tauri 2.12 y tao 0.37
- Una ventana ya creada que se muestra con `show()` se **activa**: tao llama a `ShowWindow` con `SW_SHOW`, y solo usa `SW_SHOWNOACTIVATE` en la primera aparición de una ventana creada con `focus: false`. [V] Fuente: `tao-0.37.1/src/platform_impl/windows/window_state.rs` y `window.rs`, en el registro de Cargo de este equipo.
- `focusable: false` añade el estilo `WS_EX_NOACTIVATE`, que impide activar la ventana con un clic, pero no que `SW_SHOW` la active. [V] Medido: con esa opción, la ventana de la cama pasó a ser la ventana en primer plano al mostrarla durante un arrastre (`GetForegroundWindow`), y quedó por encima de la del perro.
- `SetWindowPos` con `SWP_SHOWWINDOW | SWP_NOACTIVATE` y la ventana del perro como "insertar después de" la muestra sin activarla y justo debajo. [V] Medido con la misma prueba: el perro por delante y la cama sin el foco.
- tao recuerda por su cuenta si una ventana está visible y solo actúa cuando ese dato cambia. Una ventana mostrada por fuera de tao no se oculta con su `hide()`: hay que ocultarla también por fuera. [V] Fuente: `set_visible` y `apply_diff` en los mismos ficheros. [I] No se llegó a probar el fallo; se evitó.
- `skipTaskbar` quita el botón de la barra de tareas con `ITaskbarList::DeleteTab`, pero deja el estilo `WS_EX_APPWINDOW`. [V] Fuente: `set_skip_taskbar` en `window.rs`; estilo extendido de la ventana del perro, `0x000C0138`.
- Una ventana con `WS_EX_TOOLWINDOW` y sin `WS_EX_APPWINDOW` no sale en la barra de tareas ni en Alt+Tab. [NV] Es el comportamiento documentado de Windows; aquí solo se ha comprobado que la ventana de la cama queda con ese estilo (`0x080801B8`).
- Los permisos de eventos (`core:event:default`) bastan para que una ventana reciba órdenes de otra y conteste. Los comandos propios de la app no necesitan permiso. [V] Probado.
- Tauri 2.12.3 depende del crate `windows` 0.62.2 con `Win32_UI_WindowsAndMessaging` activado. [V] Fuente: `src-tauri/Cargo.lock` y el `Cargo.toml` de `tauri`.

## Dos páginas con Vite 8
- Con `build.rolldownOptions.input` y una lista de ficheros HTML, Vite genera las dos páginas y un trozo de código común. [V] `npm run build`: `index.html`, `bed.html` y `scene-*.js` de 659 kB, que comparten.

## Coste de la segunda ventana
- En desarrollo, con la cama guardada: 47 MB de memoria privada en su proceso y 0,0 % de procesador. El total de la app, 290 MB y 19,6 % de un núcleo con el perro sentado. [V] `tools/verify/usage.ps1`, 15 segundos, a las 19:57.
- En la versión empaquetada no se ha medido. [NV]

## La cámara y la forma de la cama
- La cámara de la app está a 1,5 de altura y a 5,4 de distancia, mirando a 1,2: ve el suelo casi de canto. Un objeto bajo y ancho, como una cama en forma de rosquilla, se ve como una franja. [V] Captura de la primera versión de la cama en la app.

## La pose de dormir
- La página de Dreamstime que el usuario dio como referencia (`es.dreamstime.com/photos-images/dibujo-animado-de-perro-durmiendo.html`) no se puede leer sin navegador: responde HTTP 403 con un captcha de PerimeterX. [V] `curl` con tres agentes de usuario distintos y la herramienta de lectura web, el 12 de octubre de 2026.
- Un perro con el pecho a 0,68 unidades del suelo se ve agachado aunque tenga las patas dobladas debajo; con el pecho a 0,37, las patas delanteras estiradas y la cabeza horizontal, se ve tumbado. De pie lo tiene a 1,56. [V] Renders de las dos versiones del clip `Nap` y alturas del hueso `FrontUpperLeg.L` que imprime `DOG_DEBUG=1`.
- Para bajar la cabeza hasta el suelo hay que doblar el cuello unos 100° y enderezar después la cabeza casi 80°. [V] Valores de `NAP` en `tools/model/build_dog.py`.

# Parte 5. El menú de mascotas (12 de octubre de 2026)

Hechos comprobados al hacer el menú (decisión 0020). No hubo búsqueda en la web: son medidas sobre la app en marcha.

## El retrato, sacado del canvas de WebGL
- Lo dibujado en un canvas de WebGL se puede copiar a otro canvas con `drawImage` si se hace justo después de dibujar, en la misma tarea, sin activar `preserveDrawingBuffer`. La copia conserva el fondo transparente. [V] `src/portrait.ts`; retrato de 160 × 160 guardado desde la app.
- Funciona también con la ventana todavía oculta, que es cuando la app lo saca. [V] Retrato leído por depuración nada más recargar la app.
- El filtro CSS del canvas (el halo del perro) no pasa a la copia. [V] El mismo retrato.

## Recargar la ventana de Tauri
- `location.reload()` en la ventana del perro vuelve a arrancar el frontend sin cerrar la app: relee lo guardado con el plugin `store` y la ventana no cambia de sitio. [V] Cambio de mascota con dos mascotas ficticias.

## Pruebas con el protocolo DevTools
- Un clic con el botón derecho inyectado con `Input.dispatchMouseEvent` (`mousePressed` y `mouseReleased`) lanza el evento `contextmenu` de la página. [V] `tools/verify/menu.mjs`.
- Un evento de Tauri emitido desde la propia página con `emit` llega a los `listen` de esa página: sirve para simular las órdenes de la bandeja. [V] La misma prueba.

## El servidor de desarrollo
- Con dos ediciones muy seguidas de un mismo fichero, Vite 8 recargó la app con la versión intermedia y siguió sirviéndola después, con el fichero ya correcto en disco. [V] Visto dos veces con `src/portrait.ts`; `curl` al servidor devolvía la versión vieja. Volver a tocar el fichero lo arregla. [I] Parece que el vigilante de ficheros se pierde el segundo cambio; no se ha investigado.

# Fuentes

## Tauri
- https://github.com/tauri-apps/tauri/issues/6164
- https://github.com/tauri-apps/tauri/issues/2090
- https://github.com/tauri-apps/tauri/issues/9250
- https://github.com/tauri-apps/tauri/issues/14515
- https://github.com/tauri-apps/tauri/issues/10318
- https://github.com/tauri-apps/tauri/issues/8133
- https://github.com/tauri-apps/tauri/issues/7328
- https://github.com/tauri-apps/tauri/issues/5889
- https://github.com/tauri-apps/tauri/releases
- https://v2.tauri.app/reference/config/
- https://v2.tauri.app/reference/javascript/api/namespacewindow/
- https://v2.tauri.app/learn/system-tray/
- https://v2.tauri.app/plugin/autostart/
- https://v2.tauri.app/plugin/store/
- https://v2.tauri.app/distribute/windows-installer/
- https://github.com/codecnmc/tauri2-transparent-through
- https://github.com/dbwk10317/bonggu-desktop-pet

## Electron
- https://www.electronjs.org/docs/latest/tutorial/custom-window-interactions
- https://github.com/electron/electron/issues/51521
- https://github.com/electron/electron/issues/33281
- https://github.com/electron/electron/pull/52633

## Godot, Unity y Bevy
- https://docs.godotengine.org/en/stable/classes/class_window.html
- https://forum.godotengine.org/t/mousepassthrough-for-non-same-applications/49284
- https://forum.godotengine.org/t/default-memory-usage-concerns-200mb-400mb-for-empty-project/129801
- https://github.com/kirurobo/UniWindowController
- https://docs.rs/bevy/0.19.0/src/desk_toy/desk_toy.rs.html

## Consumo y tamaños
- https://betterstack.com/community/guides/scaling-nodejs/tauri-vs-electron-vs-deno-vs-electrobun/

## Blender
- https://www.blender.org/download/
- https://developer.blender.org/docs/release_notes/4.4/python_api/
- https://developer.blender.org/docs/release_notes/5.0/python_api/
- https://developer.blender.org/docs/release_notes/5.2/python_api/
- https://docs.blender.org/api/current/bpy.ops.export_scene.html
- https://docs.blender.org/manual/en/latest/advanced/command_line/arguments.html
- https://github.com/blender/blender/tree/main/scripts/addons_core/rigify/metarigs/Animals
- https://github.com/ahujasid/blender-mcp
- https://www.blender.org/lab/mcp-server/

## Three.js
- https://threejs.org/docs/pages/MeshToonMaterial.html
- https://threejs.org/docs/pages/OutlineEffect.html
- https://github.com/mrdoob/three.js/releases

## IA generativa y rigging
- https://docs.meshy.ai/en/api/rigging-and-animation
- https://developers.tripo3d.com/en/models/rig
- https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1
- https://github.com/microsoft/TRELLIS.2
- https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html

## Assets libres
- https://quaternius.com/packs/ultimateanimatedanimals.html
- https://quaternius.com/license.html
- https://poly.pizza/bundle/Animated-Animal-Pack-ILAPXeUYiS
- https://poly.pizza/m/y4wdQpg767 (Shiba Inu)
- https://poly.pizza/m/wcWiuEqwzq (Husky)
- https://sketchfab.com/3d-models/low-poly-black-dog-ccb46d74399f442aad3f70341fd823ac
- https://gobkit.itch.io/gobkit-free-animal-pack

## Herramientas glTF
- https://gltf-transform.dev/cli
- https://meshoptimizer.org/gltf/
- https://github.com/KhronosGroup/glTF-Validator

## Fuentes que no se pudieron abrir
El manual actual del exportador glTF de Blender, la página de precios de Tripo, la documentación de la API de Poly Pizza y el fichero de licencia oficial de Hunyuan3D. Los datos correspondientes están marcados [NV] o proceden de una fuente alternativa.
