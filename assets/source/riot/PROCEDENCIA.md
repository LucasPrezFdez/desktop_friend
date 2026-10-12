# Modelo de Wingman (Riot Games)

En esta carpeta va `Wingman.glb`, el modelo del que sale `public/models/wingman.glb` con `tools/model/build_wingman.py` (`npm run model:wingman`). **El fichero no se versiona** (está en `.gitignore`): es de Riot Games, no un asset libre como el perro. Ver `docs/decisiones/0021-mascota-wingman.md`.

| Dato | Valor |
|---|---|
| Qué es | Wingman, la criatura de la habilidad Q del agente Gekko de VALORANT |
| Nombre dentro del juego | `ShooterGame/Content/Characters/AggroBot/S0/Ability_Q/1P/Models/AB_AggroBot_S0_Q_Spikebot_Skelmesh` |
| De dónde lo sacó el usuario | De los ficheros del juego instalado, con CUE4Parse (la biblioteca de FModel), en `C:\Users\lucas\valorant-extract`. No lo hizo el agente en esta sesión |
| Fichero que se copió aquí | `C:\Users\lucas\valorant-extract\Wingman\Wingman.glb`, con fecha 2026-10-11 17:39, 2 386 792 bytes |
| SHA-256 | `277086402ef6569e9f3d658ec0c8bd67a90a07148312c90556d2dbe46a1d2750` |
| Qué trae | Una malla de 3649 vértices, 21 huesos, dos materiales con las mismas tres texturas de 1024 × 1024 (color, normales y metal-rugosidad) y **ninguna animación** |

- **Titular:** Riot Games, Inc. VALORANT y Wingman son marcas y obras suyas.
- **Licencia:** ninguna libre. Riot tolera los proyectos de aficionados bajo su política "Legal Jibber Jabber" (https://www.riotgames.com/en/legal), con condiciones: gratuitos, con un aviso concreto y sin usar su propiedad intelectual en juegos o aplicaciones salvo permiso. Lo que dice y lo que no está en `docs/investigacion.md`, parte 6.
- **Animaciones:** las de la app las crea `build_wingman.py`; no son las del juego.
