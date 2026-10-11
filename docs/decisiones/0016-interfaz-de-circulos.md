# 0016. Propuesta: el estado de la mascota como tres círculos que salen del perro

- **Fecha:** 2026-10-11
- **Estado:** propuesta, en revisión por el usuario (rama `interfaz-circulos`)
- **Decide:** el usuario pide el diseño; los detalles no especificados los propone el agente
- **Sustituiría a:** el panel de estado descrito en la decisión 0011

## Lo que pidió el usuario
- Al hacer clic para ver las estadísticas aparecen, con una animación, tres círculos: uno por cada necesidad.
- Salen desde el perro hacia fuera.
- Cada uno lleva su emoticono en el centro, y el nivel es un anillo de color alrededor.
- Sin nada por detrás: solo los círculos, un poco transparentes pero opacos a la vez.
- Se trabaja en una rama nueva y se enseña el resultado antes de decidir si se incorpora.

## Cómo se ha resuelto
| Aspecto | Solución |
|---|---|
| Disposición | En arco sobre el perro: 🍖 saciedad a la izquierda, ❤️ felicidad arriba, ⚡ energía a la derecha. Círculos de 60 px |
| Aparición | Nacen diminutos en el centro del cuerpo del perro y salen a su sitio con un pequeño rebote, uno tras otro (70 ms de diferencia) |
| Nivel | Anillo de 5 px que empieza arriba y se llena en el sentido del reloj cuando el círculo ya ha llegado. Naranja, rosa y azul, los mismos colores que tenían las barras |
| Nivel bajo | Por debajo del 25 %, el anillo parpadea suavemente |
| Fondo | Ninguno. Cada círculo es un disco oscuro al 72 % de opacidad |
| Cierre | Vuelven al perro encogiéndose, más rápido y sin rebote. Se cierran solos a los 6 segundos o con otro clic |
| Clics | Solo el círculo captura el clic; entre círculos y en las esquinas de su caja, el clic llega a lo que haya debajo |

## Decisiones que el usuario no especificó
Quedan a su criterio en la revisión:

1. **Dar de comer.** El panel anterior tenía un botón "Dar de comer". Sin panel, se da de comer **pulsando el círculo de la comida**. Si el perro está lleno, aparece el aviso "Está lleno". El menú de la bandeja sigue funcionando igual.
   - Alternativas: un cuarto círculo solo para dar de comer, o dejarlo únicamente en el menú de la bandeja.
2. **El texto de ánimo** ("Está feliz", "Tiene hambre") desaparece, porque no hay panel donde ponerlo. El ánimo se sigue viendo en el propio perro.
3. **Sin porcentaje numérico** en los círculos. Aparece al dejar el cursor encima.

## Verificación
- `npx tsc --noEmit` sin errores y 26 pruebas en verde.
- Animación de apertura capturada fotograma a fotograma: `docs/capturas/interfaz-circulos-apertura.png` (niveles de prueba 62 %, 88 % y 18 %).
- Sobre fondo claro, oscuro y el escritorio real, y animación de cierre: `docs/capturas/interfaz-circulos-fondos-y-cierre.png`.
- Con cursor virtual: pulsar el círculo de la comida da de comer (saciedad de 40 a 75) y cierra los círculos; con el perro lleno muestra el aviso y no hace nada más.
- Captura de clics: verdadero en el centro de un círculo, falso en la esquina de su caja y entre dos círculos, falso con los círculos cerrados.

## Cambios
`src/ui.ts` (los círculos sustituyen al panel), `src/style.css` (sus estilos) y `src/main.ts` (indica a la interfaz dónde está el centro del perro). No cambia nada del comportamiento ni del modelo.
