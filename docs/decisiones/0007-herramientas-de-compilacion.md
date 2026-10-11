# 0007. Herramientas: Build Tools 2022, Rust estable y Blender 5.2

- **Fecha:** 2026-10-11
- **Estado:** aceptada
- **Decide:** el agente

## Contexto
Tauri compila con Rust, que en Windows necesita el enlazador de MSVC. winget ofrece las Build Tools de Visual Studio 2017, 2019, 2022 (17.14.41) y 2026 (18.10.2). Para Blender ofrece 5.2.2 y las LTS 4.2 y 4.5.

## Opciones consideradas
- **Build Tools 2022 frente a 2026.** Las dos sirven a Rust. La 2022 es la que citan los requisitos de Tauri y la más rodada con la cadena de Rust; la 2026 es más nueva y no aporta nada a este proyecto.
- **Blender 5.2.2 frente a LTS 4.5.** La investigación se hizo sobre la API de 5.x; 5.2 es además LTS con dos años de soporte.

## Decisión
- `Microsoft.VisualStudio.2022.BuildTools` con la carga de trabajo `Microsoft.VisualStudio.Workload.VCTools`.
- `Rustlang.Rustup` con la cadena estable.
- `BlenderFoundation.Blender` 5.2.2.

## Consecuencias
- Las Build Tools ocupan varios GB y piden permisos de administrador.
- Los scripts del modelo quedan fijados a la API de Blender 5.2.
