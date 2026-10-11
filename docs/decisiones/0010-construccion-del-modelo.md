# 0010. Cómo se construye el modelo: decisiones del script de Blender

- **Fecha:** 2026-10-11
- **Estado:** aceptada
- **Decide:** el agente

## Contexto
`tools/model/build_dog.py` convierte `Husky.glb` en `public/models/dog.glb`. Al escribirlo hubo que resolver varios puntos que la investigación y el plan dejaban abiertos o planteaban de otra forma.

## Decisiones

### Parpadeo sin shape key (cambia lo previsto en el plan)
El plan preveía una shape key que aplastase los ojos. El modelo no tiene párpados: los ojos son polígonos sueltos, y aplastarlos podía abrir huecos en la cabeza. En su lugar la app **pinta los ojos del color del pelaje** durante el parpadeo, cambiando los materiales `EyeWhite` y `EyePupil`. Sobre un perro negro se lee como ojo cerrado, no toca la geometría y no necesita exportar morph targets.

### Cinemática inversa propia para las patas
Los pies cuelgan de huesos de control sueltos (`IKFrontLeg`, `IKBackLeg`), así que al bajar el cuerpo hay que recalcular las patas. Opciones:
1. Restricciones de IK de Blender y horneado. Descartada: el importador deja los huesos con una longitud mínima que no llega hasta el pie, y alargarlos cambiaría su orientación y rompería los clips del pack.
2. **Resolver en el script la cinemática de dos huesos** (elegida): ley de los cosenos, con el codo y el corvejón doblando siempre hacia atrás.

### Poses descritas en coordenadas de mundo
Las poses se escriben como desplazamientos y giros en ejes de mundo (cabeceo, giro, balanceo), independientes de cómo esté orientado cada hueso. La armadura del pack está girada 90° y escalada ×100, así que el script pasa cada matriz a mundo, la transforma y la devuelve.

### Piezas añadidas unidas a la malla del perro
Collar, chapa y lengua se generan por código y se unen a la malla principal con peso completo sobre un hueso (cuello o cabeza). Cada una tiene su material, de modo que la app puede mostrar u ocultar la lengua por nombre. El collar se ajusta midiendo la sección real del cuello.

### Colores
| Material | Uso | Color lineal |
|---|---|---|
| `Fur` | Lomo y manto | 0.016, 0.016, 0.020 |
| `FurLight` | Patas, vientre y máscara (blancos en el Husky) | 0.050, 0.048, 0.056 |
| `Nose` | Trufa | 0.004, 0.004, 0.005 |
| `EyeWhite`, `EyePupil` | Ojos | claro y marrón oscuro |
| `Collar`, `Tag`, `Tongue` | Piezas añadidas | rojo, dorado, rosa |

Las zonas blancas del Husky pasan a un gris apenas más claro que el manto: el perro se ve negro, pero conserva relieve. Los colores definitivos en pantalla los fija la app, que sustituye estos materiales por los suyos.

### Clips
| Clip | Origen | Uso |
|---|---|---|
| `Idle`, `IdleLook`, `Sniff`, `Walk`, `Run`, `Eat` | Pack (renombrados) | Reposo, mirar, olfatear, caminar, correr, comer |
| `SitDown`, `Sit` | Código | Transición y reposo sentado |
| `LieDown`, `Lie` | Código | Transición y reposo tumbado |
| `Sleep` | Código | Dormir |
| `Happy` | Código | Saltito de alegría |
| `Sad` | Código | Cabeza baja, orejas atrás, cola caída |

Para levantarse se reproducen `SitDown` y `LieDown` hacia atrás. Mover la cola, la respiración extra, el parpadeo y la reacción a las caricias se hacen en la app, encima del clip activo.

## Errores encontrados y corregidos
| Error | Causa | Arreglo |
|---|---|---|
| Al tumbarse, el perro avanzaba en vez de bajar | La armadura está girada 90° y el giro se guarda como cuaternión; la primera medición lo leyó como cero | Todo el cálculo pasa por coordenadas de mundo |
| Las patas traseras se plegaban bajo el suelo | La dirección de plegado se heredaba de la pose, que ya tenía el muslo girado | Dirección de plegado fija, hacia atrás |
| La chapa quedaba en la nuca | Producto vectorial en el orden contrario | Orden corregido |
| La lengua flotaba delante del hocico | Posición estimada demasiado adelantada | Recolocada bajo el hocico y comprobada con un primer plano |

## Verificación
- `npm run model` comprueba que están los 13 clips y que ninguno dura cero, y ejecuta `gltf-transform validate`: sin errores, con un aviso (`NODE_SKINNED_MESH_NON_ROOT`) que ya tiene el modelo original y no afecta.
- Hoja de contactos `tools/model/out/dog_sheet.png` revisada: sentado, tumbado, dormido, feliz y triste con las patas apoyadas en el suelo.
- Resultado: 777 KB, 4322 vértices, 8 materiales, 49 huesos.
