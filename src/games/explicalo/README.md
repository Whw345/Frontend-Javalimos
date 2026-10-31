# Explícalo en una frase

Juego 10 (§12). Explicar la idea con tus palabras; un LLM la compara con la fuente **después** del intento.

- `Textarea` con contador; `Ctrl+Enter` / `⌘+Enter` o **Comprobar** envía. Al enviar, el temporizador se detiene y el botón muestra "Evaluando…" (`submittingLabel`).
- La revisión muestra tu texto, el del material, las ideas clave que usaste y las que faltaron.

| Nivel | Tiempo | Máx. caracteres |
| ----- | ------ | --------------- |
| 1     | 60 s   | 150             |
| 2     | 50 s   | 120             |
| 3     | 45 s   | 100             |

**Decisiones:** sin backend, el mock sustituye al LLM con una comparación por ideas clave (palabras con contenido de la `definicion`) y 1.5 s de latencia. La solución (`reference`, `matched`, `missing`) es el contrato propuesto para la respuesta del LLM.
