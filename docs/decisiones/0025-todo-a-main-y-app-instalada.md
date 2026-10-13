# 0025. Todo lo pendiente pasa a `main`, se sube a GitHub y se instala

- **Fecha:** 2026-10-13
- **Estado:** hecha
- **Decide:** el usuario

## Lo que pidió el usuario
> ahora pushea todo a main y actualiza la pp que tengo instalada

## Qué había pendiente
`main` estaba en el modelo nuevo (`d4d48c7`, decisión 0018) y GitHub, más atrás, en la mano al arrastrar (`1122ca1`). Por encima había seis propuestas, cada una en su rama y cada rama saliendo de la anterior, sin fusionar ni subir:

| Decisión | Rama | Qué trae |
|---|---|---|
| [0019](0019-cama-del-perro.md) | `cama-del-perro` | La cama que aparece al coger al perro |
| [0020](0020-menu-de-mascotas.md) | `menu-de-mascotas` | El menú para cambiar de mascota |
| [0021](0021-mascota-wingman.md) | `mascota-wingman` | Wingman, la segunda mascota |
| [0022](0022-elegir-pantalla.md) | `elegir-pantalla` | Elegir pantalla desde la bandeja |
| [0023](0023-cama-sin-cruces.md) | `cama-sin-cruces` | El perro duerme en la cama sin cruzarse con ella |
| [0024](0024-el-perro-se-llama-blacky.md) | `nombre-blacky` | El perro se llama Blacky |

## Decisión
"Todo" son esas seis. Como las ramas van una encima de otra, la última las contiene a todas: `main` avanza hasta ella sin commit de fusión y se sube tal cual. La app instalada se actualiza con el instalador generado de ese mismo código.

Con esto las seis quedan **en `main` por orden del usuario**. No las ha comentado una a una: lo que cada una dejaba "a su criterio" sigue como estaba propuesto.

## Lo que se miró antes de subir
El repositorio es público (decisión 0014), y subir no se deshace.

| Qué | Resultado |
|---|---|
| El modelo de Wingman, que es de Riot Games | Fuera de git, como fijó la 0021: ni `assets/source/riot/Wingman.glb` ni `public/models/wingman.glb` están entre los ficheros versionados. Sube su código, su script y su nota de procedencia |
| Capturas que se publican por primera vez (diez, en `docs/capturas/`) | Ninguna es de Wingman. Una es del escritorio real (`cama-escritorio.png`): se ve el pie de una página web en negro, sin datos |
| Claves, contraseñas o correos en lo que sube | Ninguno |
| El instalador | No se versiona (`.gitignore`) |

## Wingman en la app instalada
El instalador se genera en este equipo, donde sí está el modelo de Wingman, así que **la app instalada lo lleva dentro** (por eso pesa 3,24 MB y no 2,39). La 0021 distingue los dos casos: para uso propio en este equipo no cambia nada; repartir ese instalador a otras personas sí, y eso lo decide el usuario. El instalador se queda en la carpeta raíz del proyecto, sin subir.

## Qué se hizo

| Paso | Cómo | Resultado |
|---|---|---|
| Avanzar `main` | `git merge --ff-only nombre-blacky` | De `d4d48c7` a `795fdf9`, sin commit de fusión |
| Subir | `git push origin main`, a las 15:58 | `1122ca1..795fdf9`: 18 commits |
| Generar el instalador | `npm run installer` | `DesktopFriend_0.1.0_x64-setup.exe`, 3 396 648 bytes, a las 16:00 |
| Instalar | El instalador con `/S` | Código 0. La app instalada era del 11 de octubre a las 16:49 y no estaba abierta |
| Arrancar | Acceso del menú Inicio | En marcha desde las 16:01 |

## Verificación de la app instalada
| Comprobación | Resultado |
|---|---|
| El ejecutable instalado es el recién compilado | Mismo tamaño (11 143 680 bytes) y todos los bytes iguales menos 3: la marca de tipo de paquete que Tauri escribe al empaquetar |
| Lleva el código nuevo | Arrancada una vez con el puerto de depuración, su JavaScript contiene "Blacky", el giro 1,62 y el sitio −0,25 de la decisión 0023 |
| No expone el acceso de depuración | `typeof pet` es `undefined`, como debe en la versión empaquetada |
| Se ve | Captura de su ventana: el perro, andando. Después se cerró y se volvió a abrir desde el menú Inicio, ya sin puerto de depuración |

## Qué no se ha probado
- **La cama, el menú de mascotas, Wingman y el cambio de pantalla en la versión empaquetada.** Están verificados en la de desarrollo (decisiones 0019 a 0024), que usa el mismo código. La empaquetada no tiene el acceso de depuración con el que se les dan órdenes, y probarlos a mano habría sido mover el ratón del usuario.
- El arranque con Windows después de reinstalar.

## Consecuencias
- `desarrollo` avanza en este equipo hasta el mismo commit que `main`, como las otras veces. **En GitHub no**: el usuario pidió `main`, y `origin/desarrollo` sigue en `1122ca1`.
- Las ramas de las propuestas se quedan en este equipo; ninguna se ha subido ni borrado.
