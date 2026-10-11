# 0002. Plataforma: solo Windows 11

- **Fecha:** 2026-10-11
- **Estado:** aceptada
- **Decide:** el usuario

## Contexto
La parte más delicada de una mascota de escritorio (clics que atraviesan la ventana) se comporta distinto en cada sistema operativo. El equipo de desarrollo es Windows 11 y es el único donde se puede verificar.

## Opciones consideradas
1. Solo Windows.
2. Windows ahora, con una pila portable para después.
3. Windows, macOS y Linux desde el principio.

## Decisión
Opción 1: se optimiza y se prueba solo para Windows 11.

## Consecuencias
- Se puede usar código específico de Windows cuando haga falta.
- Pierde peso el principal inconveniente de Tauri (los motores web distintos en macOS y Linux); ver la decisión 0004.
- Portar la app más adelante exigirá revisar el click-through en cada sistema.
