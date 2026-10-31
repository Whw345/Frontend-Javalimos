# ¿Quién soy?

Juego 7 (§12). Adivinar el concepto con pistas cada vez más claras.

- Cada pista es una ronda del shell: al agotarse su tiempo aparece la siguiente (`ejemplos` → `relacionados` → `definicion` sin el término).
- Niveles 1–2: 4 opciones (`1`–`4`) y **Comprobar** (`Enter`). Nivel 3: texto libre + `Enter` (sin tildes ni mayúsculas importantes).
- Si se acaban las pistas, se envía lo que haya.
- Pista: número de letras y letra inicial.

| Nivel | Respuesta   | Tiempo por pista |
| ----- | ----------- | ---------------- |
| 1     | 4 opciones  | 8 s              |
| 2     | 4 opciones  | 6 s              |
| 3     | Texto libre | 6 s              |

**Decisiones:** la respuesta incluye `cluesSeen`, para que el backend pueda dar más puntos si se adivina antes (decisión pendiente #1, §20). El mock usa 10 pts fijos (opción a).
