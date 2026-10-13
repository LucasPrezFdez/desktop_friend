# DesktopFriend

Una mascota de escritorio para Windows 11: un perro negro en 3D (o Wingman, si tienes su modelo) que vive sobre la barra de tareas. Pasea, se sienta, se tumba, duerme, y hay que cuidarlo: **acariciarlo**, **darle de comer** y **acostarlo en su cama**.

## Cómo se usa

| Quieres | Haz |
|---|---|
| Acariciarlo | Frota el cursor sobre él, sin pulsar. En la cabeza le gusta más |
| Darle de comer | Haz clic sobre él y pulsa el círculo 🍖, o usa el menú del icono de la bandeja |
| Ver cómo está | Haz clic sobre él: salen tres círculos con su saciedad 🍖, felicidad ❤️ y energía ⚡. El anillo de cada uno marca el nivel |
| Moverlo | Púlsalo y arrástralo: una mano lo coge del collar, lo levanta de cara a ti y lo lleva balanceándose. Al soltarlo baja y se posa |
| Acostarlo | Al cogerlo aparece su cama a un lado. Suéltalo encima: se echa del todo, con la cabeza apoyada en el borde, se duerme y recupera energía mucho más deprisa que durmiendo en el suelo. Cuando está descansado se levanta solo y la cama se guarda |
| Cambiar de mascota | Clic derecho sobre él, o **Cambiar de mascota** en el menú de la bandeja: sale un círculo por mascota, con su retrato. Están el perro y Wingman; las dos comparten hambre, felicidad y energía |
| Cambiarlo de pantalla | Si tienes varias: **Cambiar de pantalla** en el menú de la bandeja, o arrástralo hasta la otra. Al volver a abrir la app sigue en la que estaba |
| Traerlo de vuelta | Clic en el icono de la bandeja, o **Traer aquí** en su menú |
| Ocultarlo, arrancarlo con Windows o salir | Clic derecho en el icono de la bandeja |

Donde no hay perro, los clics llegan a lo que haya debajo: no estorba.

Con el tiempo le entra hambre, se aburre y se cansa. Si tiene hambre o está triste se le nota: baja la cabeza y la cola. Cuando se queda sin energía, duerme donde esté; en su cama descansa el triple. No se muere: si pasas días sin abrir la app, lo encontrarás hambriento y alicaído, nada más.

## Instalar

Ejecuta `DesktopFriend_0.1.0_x64-setup.exe`, que está en la carpeta raíz del proyecto. Se vuelve a generar con `npm run installer`.

## Desarrollo

Requisitos: Node 24, Rust (cadena `stable-msvc`), Build Tools de C++ de Visual Studio 2022 y, solo para regenerar el modelo, Blender 5.2.

```
npm install
npm run tauri dev      # la app real, con recarga en caliente
npm run dev            # solo el frontend, en el navegador (el escritorio se simula)
npx vitest run         # pruebas unitarias
npm run model          # regenera public/models/dog.glb con Blender
npm run model:bed      # regenera public/models/bed.glb (la cama) con Blender
npm run model:wingman  # regenera public/models/wingman.glb con Blender (hace falta el modelo de origen)
npm run installer      # compila y deja el instalador en la carpeta raíz
```

### Estructura

| Ruta | Qué hay |
|---|---|
| `src/desktop.ts` | Puente con Tauri. Es el único módulo que lo toca |
| `src/clickThrough.ts` | Clics que atraviesan la ventana donde no hay perro |
| `src/scene.ts`, `src/blackFur.ts`, `src/props.ts` | Escena 3D, pelaje, cuenco, mano y cama |
| `src/pet.ts`, `src/dog.ts`, `src/wingman.ts`, `src/loadPet.ts` | Lo común a todas las mascotas, lo propio del perro y de Wingman, y cómo se carga cada una |
| `bed.html`, `src/bedWindow.ts` | Segunda ventana, que dibuja la cama mientras se lleva al perro |
| `src/needs.ts` | Necesidades de la mascota (funciones puras) |
| `src/behavior.ts`, `src/interaction.ts`, `src/ui.ts` | Comportamiento, gestos del ratón e interfaz |
| `src/pets.ts`, `src/petMenu.ts`, `src/portrait.ts` | Lista de mascotas, menú para cambiar entre ellas y retrato que sale en él |
| `src-tauri/` | Parte nativa: ventanas, bandeja, arranque con Windows |
| `tools/model/` | Generación de los modelos 3D (perro, Wingman y cama) con Blender |
| `tools/verify/` | Herramientas de verificación de la app en marcha |
| `assets/source/` | Modelos originales y su procedencia |
| `docs/` | Investigación, decisiones y bitácora |

### Verificar la app en marcha

Arranca la app con el puerto de depuración y usa las herramientas de `tools/verify/`:

```
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=9223"
npm run tauri dev

node tools/verify/cdp.mjs --eval "pet.behavior.force('sit')" --wait 1500 --shot sentado.png
node tools/verify/bed.mjs                                # toda la secuencia de la cama
node tools/verify/nap.mjs                                # mide si la mascota y la cama se cruzan
node tools/verify/menu.mjs                               # el menú para cambiar de mascota
node tools/verify/cdp.mjs --page bed --shot cama.png     # la ventana de la cama
powershell -File tools/verify/clickthrough.ps1
powershell -File tools/verify/input.ps1 -Action rub
```

Las dos últimas mueven el cursor real un par de segundos.

## Documentación

- [`docs/investigacion.md`](docs/investigacion.md): comparativa de frameworks y de formas de crear el modelo 3D, con fuentes.
- [`docs/decisiones/`](docs/decisiones/): cada decisión tomada, con sus alternativas y motivos.
- [`docs/bitacora.md`](docs/bitacora.md): registro de todas las acciones realizadas.

## Créditos

El perro parte del Husky del "Ultimate Animated Animal Pack" de [Quaternius](https://quaternius.com), publicado como CC0. Ver [`assets/source/quaternius/PROCEDENCIA.md`](assets/source/quaternius/PROCEDENCIA.md).

Wingman es un personaje de VALORANT, de Riot Games. Su modelo **no está en este repositorio**: quien lo tenga puede ponerlo en `assets/source/riot/Wingman.glb` y generar la mascota con `npm run model:wingman`; sin él, la app sigue funcionando con el perro. Ver [`assets/source/riot/PROCEDENCIA.md`](assets/source/riot/PROCEDENCIA.md).

DesktopFriend was created under Riot Games' "Legal Jibber Jabber" policy using assets owned by Riot Games. Riot Games does not endorse or sponsor this project.
