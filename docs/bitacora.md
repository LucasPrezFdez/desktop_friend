# Bitácora de acciones

Registro cronológico de todo lo que se hace en el proyecto. Cada fila indica la acción, cómo se hizo, el resultado y la decisión o el commit relacionados. Las decisiones están en `docs/decisiones/`.

## 2026-10-11

### Investigación y planificación (sin cambios en el equipo)

| Nº | Acción | Cómo | Resultado | Referencia |
|---|---|---|---|---|
| 1 | Revisar la carpeta del proyecto | Listado de ficheros | Vacía, sin git | `investigacion.md`, punto de partida |
| 2 | Revisar las herramientas instaladas | Consulta de versiones en PowerShell | Hay Node 24.21.0, npm 11.19.0, Git 2.56.0, VS Code, WebView2 154 y GPU RTX 2060 SUPER. Faltan Rust, Blender, Godot, .NET y Python | `investigacion.md`, punto de partida |
| 3 | Investigar el framework de la app | Agente de búsqueda web: 95 consultas a documentación, issues y repositorios | Recomienda Tauri 2 + Three.js y, como segunda opción, Electron + Three.js | `investigacion.md`, parte 1 |
| 4 | Investigar la creación del modelo 3D | Agente de búsqueda web: 109 consultas. Se reorientó a mitad al saber que la mascota sería un perro negro | Recomienda un asset libre de Quaternius retocado con Blender en modo script | `investigacion.md`, parte 2 |
| 5 | Preguntar al usuario alcance, mascota y plataforma | Tres preguntas | Construir la app completa; perro mediano negro; solo Windows | Decisiones 0001, 0002, 0003 |
| 6 | Comprobar requisitos de compilación | Consulta de `vswhere`, winget, disco y memoria | Sin Build Tools de C++ ni rustup; winget 1.29; 74 GB libres; 16 GB de RAM | Decisión 0007 |
| 7 | Preguntar al usuario framework, modelo y registro | Tres preguntas | Tauri 2 + Three.js; base libre + Blender; docs en el repo + git | Decisiones 0004, 0005, 0006 |
| 8 | Escribir y aprobar el plan | Plan de ocho hitos | Aprobado por el usuario | Decisión 0001 |

### Hito 0: documentación inicial y repositorio

| Nº | Hora | Acción | Cómo | Resultado | Referencia |
|---|---|---|---|---|---|
| 9 | 14:52 | Crear el repositorio | `git init -b main` | Repositorio vacío en `main` | Decisión 0006 |
| 10 | 14:52 | Confirmar identificadores de winget | `winget search` | `Rustlang.Rustup` 1.29.1, `Microsoft.VisualStudio.2022.BuildTools` 17.14.41 (también existe la 2026, 18.10.2), `BlenderFoundation.Blender` 5.2.2 | Decisión 0007 |
| 11 | 14:55 | Escribir `.gitignore` y `CLAUDE.md` | Ficheros nuevos | `CLAUDE.md` fija la regla de documentación y las convenciones | Decisión 0006 |
| 12 | 15:00 | Escribir el informe de investigación | `docs/investigacion.md` | Dos partes, con tablas, fiabilidad de cada dato y fuentes | |
| 13 | 15:05 | Registrar las decisiones 0001 a 0007 | `docs/decisiones/` | Siete decisiones | |

### Hito 1: herramientas

| Nº | Hora | Acción | Cómo | Resultado | Referencia |
|---|---|---|---|---|---|
| 14 | 14:54 | Lanzar la instalación de Blender, Rust y Build Tools 2022 | `winget install` en segundo plano, en ese orden | En curso | Decisión 0007 |
