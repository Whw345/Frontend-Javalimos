# Hueco

Juego 5 (§12). Completar una oración con la ficha correcta.

- Se toca una ficha, se arrastra al hueco o se usa `1`–`4`. Se envía sola tras 400 ms para que se vea la ficha en el hueco.
- Pista: la letra inicial del término.

| Nivel | Opciones | Tiempo |
| ----- | -------- | ------ |
| 1     | 3        | 20 s   |
| 2     | 3        | 15 s   |
| 3     | 4        | 12 s   |

**Decisiones:** el payload trae `before` / `after` (la oración sin el término) y las opciones; los distractores salen de `relacionados`. Sin `KeyboardSensor`: `Enter` sobre una ficha la elige.
