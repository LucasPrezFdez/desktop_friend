# 0030. El instalador con Wingman se retira de GitHub

- **Fecha:** 2026-10-31
- **Estado:** hecha
- **Decide:** Lucas Pérez Fernández
- **Sustituye a:** la [0029](0029-instalador-en-github.md), que lo había publicado unos minutos antes

## Motivo
Preferí no tener nada que ver con Riot para evitar problemas, así que lo devolví todo al estado anterior.

## Decisión
Se deshace la 0029 entera y todo queda como estaba antes de ella:

| Qué | Cómo queda |
|---|---|
| La release `v0.1.0`, con el instalador | Borrada |
| La etiqueta `v0.1.0` | Borrada en GitHub y en este equipo |
| `README.md` | Como en `ec7af82`: la sección "Instalar" vuelve a su sitio y remite a la carpeta raíz del proyecto, y los créditos ya no dicen que haya un instalador con Wingman |
| `CLAUDE.md` | Sin la línea de las releases. En su lugar, una que dice que el instalador de aquí lleva a Wingman y no se publica, para que no se vuelva a subir por descuido |
| Lo que no cambia | El modelo sigue fuera de git (decisión 0021) y el instalador sigue en la carpeta raíz, en este equipo, sin versionar. La app instalada no se toca |

Las decisiones 0028 y 0029 no se borran: se les añade en el estado que esto se deshizo. Quedan publicadas en `docs/`, como el resto, y cuentan que el instalador estuvo en GitHub; no llevan nada de Riot.

### Por qué la release entera y no solo el fichero
Bastaba con quitar el fichero para que no se pudiera descargar, pero la release vacía seguiría diciendo que la app trae a Wingman y llevaría el aviso de Riot. Volver al estado anterior es que no haya release.

## Consecuencias
- **Ya no se puede descargar la app desde GitHub.** Para instalarla hay que compilarla, como antes, o pasar el instalador a mano (decisión 0028).
- **Estuvo publicada de 00:54:03 a 01:01:33**, unos siete minutos y medio. El contador de descargas de GitHub marcaba 0 justo antes de borrarla, pero tampoco contaba mis dos descargas de prueba: no sirve para asegurar que nadie más la bajó. Si alguien lo hizo, esa copia no se puede recuperar.
- **El repositorio sigue sin nada de Riot dentro**: ni el modelo, ni texturas, ni capturas de Wingman (decisión 0021). Lo que sí sigue es lo que nombra a Wingman: su código (`src/wingman.ts`), el script que lo genera (`tools/model/build_wingman.py`), `assets/source/riot/PROCEDENCIA.md`, el aviso de Riot en el README y la documentación. Todo eso está escrito en este proyecto, pero lleva el nombre del personaje. Quitar también eso no entraba en esta decisión; queda pendiente de valorar.

## Una alternativa que no se ha hecho
Publicar un instalador **sin Wingman**, compilado apartando `public/models/wingman.glb`, que era la opción más prudente en la 0029. La app arranca con el perro y el círculo de Wingman sale sin retrato en el menú de mascotas. Daría la descarga rápida sin nada de Riot. De momento no lo he hecho.

## Verificación

| Comprobación | Resultado |
|---|---|
| `gh release delete v0.1.0 --cleanup-tag --yes` | Sin errores, a las 01:01:33 |
| `gh release list` | Vacía |
| `git ls-remote --tags origin` | Sin etiquetas. En este equipo, `git tag -l` solo da `modelo-revision-7`, que ya estaba |
| El enlace directo de descarga y la página de la release | 404 los dos, con `curl` |
| `releases/latest` | Lleva a la lista de releases, vacía |
| El fichero, por la API (`releases/assets/693800670`) | 404 |
| `README.md` y `CLAUDE.md` | Sacados de `ec7af82` con `git checkout`; a `CLAUDE.md` se le añade la línea de arriba |

## Qué no se ha comprobado
- Si alguna caché fuera de GitHub guardó el fichero en esos siete minutos.
