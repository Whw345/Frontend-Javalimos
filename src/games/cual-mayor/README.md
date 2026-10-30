# ¿Cuál es mayor?

Juego 9 (§12). Comparar dos valores por ronda.

- Dos tarjetas lado a lado (apiladas en móvil); se toca una o `←` / `→`. El shell lleva el tiempo de cada ronda.
- Los valores (`8 h`, `46 cromosomas`) solo llegan en la solución, después de responder.
- Pista: frase del servidor con una referencia útil.

| Nivel | Rondas | Tiempo por ronda |
| ----- | ------ | ---------------- |
| 1     | 5      | 8 s              |
| 2     | 6      | 6 s              |
| 3     | 8      | 5 s              |

**Decisiones:** solo se comparan átomos con la misma `valor.etiqueta`; la pregunta ("¿Cuál dura más?") depende de esa etiqueta. El mock da por correcto el reto con ≥ 75 % de aciertos.
