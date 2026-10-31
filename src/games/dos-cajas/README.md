# Dos cajas

Juego 4 (§12). Clasificar tarjetas en la caja A o B.

- Una tarjeta por ronda; el shell lleva el tiempo de cada una (`getRounds`).
- Se arrastra a una caja, se toca la caja, o `←` (A) / `→` (B). Cada caja tiene color + forma + letra.
- Envío automático al terminar la última tarjeta.
- Pista: frase del servidor con la diferencia clave.

| Nivel | Tarjetas | Tiempo por tarjeta |
| ----- | -------- | ------------------ |
| 1     | 6        | 6 s                |
| 2     | 8        | 5 s                |
| 3     | 10       | 4 s                |

**Decisiones:** sin `KeyboardSensor` (con teclado se usan las flechas o los botones de cada caja). El mock da por correcto el reto con ≥ 75 % de aciertos.
