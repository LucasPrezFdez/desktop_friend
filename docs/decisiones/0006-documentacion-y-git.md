# 0006. Registro: documentación en `docs/` y git con un commit por hito

- **Fecha:** 2026-10-11
- **Estado:** aceptada
- **Decide:** el usuario

## Contexto
El usuario exige que cada decisión y cada acción queden documentadas.

## Opciones consideradas
1. Documentos en `docs/` más git con un commit por hito.
2. Los mismos documentos, sin git.

## Decisión
Opción 1. En español:
- `docs/investigacion.md`: hechos y fuentes, con su fiabilidad marcada.
- `docs/decisiones/NNNN-titulo.md`: una decisión por fichero. No se reescriben: si una cambia, se añade otra que la sustituye.
- `docs/bitacora.md`: registro cronológico de acciones.
- `CLAUDE.md`: fija esta regla para sesiones futuras.

Git: commit inicial en `main`, trabajo en la rama `desarrollo`, un commit por hito verificado.

## Consecuencias
Ningún hito se cierra sin actualizar la bitácora y las decisiones. El historial de git respalda la bitácora.
