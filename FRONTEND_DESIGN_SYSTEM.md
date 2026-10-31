# Design System y Estándares de Frontend

> Documento vivo del equipo. Todo lo que se construya en el frontend (pantallas, componentes y minijuegos) debe seguir este estándar. Si algo no está aquí, se propone en un PR que modifique este archivo antes de implementarlo.

**Producto:** plataforma de minijuegos semanales para universidades, generados desde los PDFs del curso, con leaderboard por sección y práctica sin IA.
**Público:** estudiantes universitarios peruanos (18–25 años), principalmente desde laptop; también en móvil y tablet en tiempos libres cortos.
**Base de diseño:** laptop/desktop (1280 × 720). Móvil y tablet son adaptaciones obligatorias, no opcionales.
**Posicionamiento:** "Duolingo para el estudio universitario: la IA prepara la práctica y se apaga durante el reto".
**Responsables frontend:** Luis y William · **Versión:** 0.3 · **Fecha:** 30/10/2026

> **Cambios en v0.3:** nueva arquitectura con pipeline de IA (MarkItDown → LLM de decisión → plantillas JSON → LLM de relleno → render), stack centrado en Next.js con Vercel AI SDK, repositorio en contenedores desplegado en Google Cloud (§2) y nueva paleta **negro + naranja** alineada al logotipo (§3–4).

---

## 1. Principios de diseño

1. **Recordar, no reconocer.** Cada pantalla de juego obliga a producir o decidir, nunca a releer. Nada de material de consulta visible durante un reto.
2. **Rápido por diseño.** Un reto dura entre 20 y 90 segundos. El estudiante lo juega entre tareas en su laptop, o desde el celular en un tiempo muerto, y sale con puntos.
3. **Errar no castiga, enseña.** Una respuesta incorrecta suma lo que tuvo de correcto, al menos 2 puntos, y trae una explicación clara. Nunca se restan puntos ni se usa rojo agresivo a pantalla completa.
4. **Progreso siempre visible.** Puntos, racha, retos restantes de la semana y posición en el leaderboard deben verse en máximo un toque.
5. **Un solo foco en el juego.** Dentro de un reto solo existen el enunciado, la interacción, el temporizador y el botón de acción. Las ilustraciones y decoraciones viven fuera del área de juego, y el cuy frontal solo aparece en las transiciones del reto, nunca mientras corre el temporizador (§3.2).
6. **Desktop como base, responsive siempre.** Cada pantalla se diseña primero a 1280 × 720 (laptop) y luego se adapta a tablet (768) y móvil (360). Ninguna pantalla se da por terminada sin sus tres versiones. Ver §6.0 para la diferencia entre "base de diseño" y "estrategia de CSS".
7. **Consistencia antes que creatividad.** Todos los juegos comparten el mismo shell, los mismos estados y el mismo feedback. La creatividad va en la mecánica, no en reinventar botones.
8. **Teclado como ciudadano de primera.** En laptop el estudiante tiene las manos en el teclado: todo juego se puede jugar completo con atajos (§11.5), además de mouse y táctil.

---

## 2. Stack y arquitectura

### 2.6 Riesgos y cómo manejarlos

- **El temporizador y la respuesta correcta los controla el servidor.** El navegador nunca recibe la solución antes de responder y el tiempo se valida en el servidor (`startedAt` + `deadline`). Si no, cualquier estudiante puede leer la respuesta desde las DevTools y el ranking pierde valor.
- **PDFs escaneados, con fórmulas o tablas.** MarkItDown extrae el texto que el PDF ya trae; si el PDF es una imagen escaneada, o tiene fórmulas o tablas complejas, el Markdown sale pobre. Probar desde ya con PDFs reales de los cursos y mostrar al docente la vista previa del `.md` (§2.5).
- **Documentos largos.** Un PDF de 80 páginas no entra bien en un solo prompt. Dividir el `.md` por semana o por sección antes del LLM 1.
- **Respuestas inválidas del modelo.** Siempre validar con zod, reintentar una vez y, si vuelve a fallar, marcar el reto como "No se pudo generar". El docente revisa todo antes de publicar (gobernanza docente, uno de los diferenciadores del benchmark).
- **Costos.** Generar por lote al subir el material y guardar el resultado; nunca generar por estudiante ni durante el juego. Poner un límite de gasto en el gateway.
- **Arranque en frío de Cloud Run.** Ver §2.4. Mostrar siempre un skeleton, nunca una pantalla en blanco.
- **Versiones.** Fijar versiones exactas en `package.json` y `requirements.txt` al iniciar el repo y actualizarlas solo en PRs dedicados.

---

## 3. Dirección visual y marca

**Concepto: "Modo reto", negro + naranja.** La paleta sigue la del logotipo: negro para concentrarse y naranja mandarina para la energía y la competencia. Transmite urgencia, que encaja con retos de pocos segundos, y es cálida. Además se diferencia en edtech, donde dominan los azules y violetas.

| Color | Hex | Rol |
| --- | --- | --- |
| Negro | `#121212` / `#1E1E1E` | Fondo y tarjetas: todo el foco en el contenido |
| Naranja mandarina | `#FF6B2C` | Marca, botones, selección y foco |
| Amarillo | `#FFD23F` | Leaderboard, puntos, rachas y logros |
| Verde suave | `#7EE081` | Acierto |
| Rosa-rojo | `#FF4D6D` | Temporizador y error |
| Crema | `#FFF4EA` | Cuerpo del cuy, nombre del logotipo y texto principal |
| Chocolate | `#7A4E36` | Tercer color del cuy. Solo en ilustración: no tiene contraste suficiente para texto |

**De las plantillas de referencia se toma la composición, no la paleta.**

| Referencia | Qué tomamos | Qué no tomamos |
| --- | --- | --- |
| Bosque nocturno (plantilla 1) | Tarjetas con glow suave, barra de navegación tipo píldora | Paleta violeta, texto pequeño y denso |
| Paisaje espacial (plantilla 2) | Íconos en contenedores cuadrados redondeados, titulares grandes y limpios | Fondos índigo, CTA verde menta |
| Cards de aventura (plantilla 3) | **Tarjetas de selección numeradas (01, 02, 03)** → selector de minijuegos y semanas | Tipografía condensada en mayúsculas para todo |
| Landing ilustrada (plantilla 4) | Timeline numerado vertical ("How it works") → progreso por semana del sílabo; secciones con ilustración + texto alternados | Exceso de secciones de marketing |

**Reglas de aplicación**

- Tema **oscuro por defecto**. El tema claro se define en tokens (§4.2) para el panel docente y para quien lo prefiera.
- **Naranja = acción. Amarillo = recompensa.** Nunca un botón amarillo ni puntos en naranja.
- El texto sobre naranja o amarillo siempre es oscuro (`#121212`): el blanco sobre `#FF6B2C` no llega al contraste mínimo (≈ 2.8:1).
- Naranja y rosa-rojo son cercanos: el temporizador y los errores siempre llevan ícono y texto, nunca solo color.
- El glow naranja se usa con moderación: solo en el elemento seleccionado, el botón principal en foco y las celebraciones.
- Ilustraciones solo en: onboarding, estados vacíos, pantalla de resultados, perfil y landing. **Nunca dentro del área de interacción del juego.** La única excepción es el cuy frontal, en los momentos de §3.2.

### 3.1 Marca: el cuy

El cuy tiene dos papeles que no se intercambian: **de perfil es la marca** (identifica al producto) y **de frente es el personaje** (acompaña al estudiante durante las dinámicas de los minijuegos).

| | Cuy de perfil | Cuy frontal |
| --- | --- | --- |
| Papel | Marca principal | Personaje que reacciona |
| Expresión | Siempre la misma | Cambia según lo que pasa en el reto |
| Dónde | Fuera de los juegos: navegación, login, favicon, documentos, landing, carga inicial | Dentro del flujo del reto: intro, feedback, resultado y esperas |
| Componente | `<Logo />` | `<CuyFrontal expresion="…" />` |

**Piezas del logotipo (lámina "Logo Cuy v3")**

| Pieza | Cómo es | Dónde se usa en el producto |
| --- | --- | --- |
| Logotipo principal | Cuy tricolor de perfil con birrete + nombre en Archivo Black (crema) + lema "Ponte a prueba." en naranja | Login, landing para universidades, pantalla de carga inicial, portada de documentos y presentaciones |
| Logotipo compacto | Cuy de perfil de 32 px + nombre en Archivo Black de 18 px, sin lema | Arriba de la barra lateral en desktop |
| Ícono de app | Cuy de perfil sobre un cuadrado negro redondeado, sobre fondo naranja | Favicon, ícono de la app instalable (PWA), ícono dentro del aula virtual |
| Sobre fondo claro | Cuy dentro de un círculo negro + nombre en negro | Documentos, aula virtual, panel docente en tema claro |
| Monocromo | Silueta naranja del cuy con birrete | Stickers, merch, sellos, marca de agua de reportes y certificados |
| Tamaños pequeños | Silueta + birrete: se pierden detalles, no la forma | 24 px: favicon y pestañas · 48 px: barra lateral colapsada · 96 px: encabezados |

**Reglas del logotipo**

- Espacio libre alrededor del logotipo igual a la altura del birrete; nada de texto ni bordes dentro de ese espacio.
- Tamaño mínimo del logotipo completo: 120 px de ancho. Por debajo de 48 px de alto se usa la versión simplificada.
- Fondos permitidos: negro (`#121212`, `#1E1E1E`) como principal; naranja solo con el cuy dentro del cuadrado negro (ícono de app); crema o blanco solo con la versión del círculo negro.
- El cuy de perfil mira a la derecha, hacia el nombre; no se espeja.
- No se rota, estira ni recolorea, no se le quita el birrete y no lleva sombras, contornos ni degradados encima.
- El nombre del producto sigue pendiente (`[NOMBRE]`): `<Logo />` lo toma de una sola constante para cambiarlo en un solo lugar.

### 3.2 El cuy frontal en los minijuegos

El cuy frontal es el compañero del estudiante dentro de las dinámicas. Se usa cuando hay algo que **comunicarle a la persona**, no para decorar.

**Cuándo se usa el cuy frontal**

- **Al empezar una dinámica:** la intro o cuenta regresiva de un reto, y la invitación a jugar.
- **Al reaccionar a lo que hizo el estudiante:** acertar, fallar, quedarse sin tiempo o usar una pista. Siempre con un tono amable: celebra los aciertos y anima en los errores, nunca se burla ni se muestra decepcionado.
- **Al cerrar una dinámica:** la pantalla de resultado, subir en el ranking, completar una racha o desbloquear un logro.
- **Mientras el estudiante o el docente espera:** cargar un reto, evaluar una respuesta escrita o generar los retos de un material.
- **Cuando no hay nada que jugar:** estados vacíos y el límite semanal alcanzado.

**Cuándo no se usa**

- Mientras corre el temporizador o dentro del área de interacción del juego (principio 5).
- Como marca: en navegación, login, favicon, documentos o landing va el cuy de perfil (§3.1).
- En mensajes de error del sistema (fallos de red, permisos): ahí basta con el texto.

**Reglas del personaje**

- Las expresiones se pueden adaptar a cada situación, pero siempre conservan los rasgos que lo separan del panda (lámina): ojos a los costados, cara partida naranja/chocolate con franja blanca, nariz ancha con labio partido, bigotes y orejas caídas. Solo cambian ojos, boca y accesorios.
- Los accesorios (destellos, puntos) van en amarillo (`reward`); el texto que lo acompaña usa el color del estado (verde en un acierto, por ejemplo).
- El cuy acompaña al texto, nunca lo reemplaza: el mensaje se entiende sin verlo. Es decorativo (`aria-hidden="true"`).
- Tamaño proporcional al momento: pequeño en reacciones rápidas (feedback) y más grande en momentos de cierre o celebración. Una sola aparición por pantalla.
- Sus animaciones siguen §7: breves, sin bloquear la interacción, y sin movimiento con `prefers-reduced-motion`.
- En Ajustes hay un interruptor "Mostrar al cuy durante los retos" (activado por defecto), para quien lo prefiera más sobrio.

**Archivos y componentes**

Los SVG se exportan desde el archivo fuente del logotipo (no desde el PDF) a `apps/web/public/brand/`. El cuy de perfil se usa con `<Logo />` y el frontal con `<CuyFrontal />`, que recibe la situación y elige la ilustración correspondiente; así, agregar o cambiar una expresión no obliga a tocar las pantallas.

---

## 4. Design tokens

Los tokens son la única fuente de verdad. **Está prohibido usar valores hex, px o ms sueltos en componentes**; siempre se usa el token.

### 4.1 Color — tema oscuro (por defecto)

**Superficies**

| Token | Hex | Uso |
| --- | --- | --- |
| `--color-bg` | `#121212` | Fondo de la app |
| `--color-surface` | `#1E1E1E` | Tarjetas, paneles, barra lateral |
| `--color-surface-raised` | `#2A2A2A` | Fichas de juego, sheets, modales |
| `--color-surface-sunken` | `#0A0A0A` | Inputs, barras de progreso vacías, `Kbd` |
| `--color-border` | `#333333` | Bordes por defecto |
| `--color-border-strong` | `#4D4D4D` | Bordes en hover/foco de tarjetas |

**Texto**

| Token | Hex | Uso | Contraste |
| --- | --- | --- | --- |
| `--color-text` | `#FFF4EA` | Texto principal (crema del logotipo) | ≈ 17:1 sobre `bg` |
| `--color-text-secondary` | `#BDBDBD` | Texto de apoyo | ≈ 10:1 sobre `bg` |
| `--color-text-muted` | `#8F8F8F` | Metadatos, placeholders | ≈ 5.7:1 sobre `bg`, ≈ 5.2:1 sobre `surface` |
| `--color-text-on-primary` | `#121212` | Texto sobre naranja, amarillo y colores de categoría | ≈ 6.5:1 sobre `primary` |

**Marca y acción**

| Token | Hex | Uso |
| --- | --- | --- |
| `--color-primary` | `#FF6B2C` | Marca, botón primario, selección, foco |
| `--color-primary-hover` | `#FF8247` | Hover / pressed (se aclara en tema oscuro) |
| `--color-primary-text` | `#FF8A57` | Links y etiquetas en naranja sobre fondo oscuro |
| `--color-primary-soft` | `#FF6B2C1F` (12 %) | Fondos de chips, filas y fichas seleccionadas |
| `--color-primary-glow` | `#FF6B2C59` (35 %) | Glow de foco y de elementos activos |
| `--color-reward` | `#FFD23F` | Leaderboard, puntos, rachas, logros, top 5 |
| `--color-reward-soft` | `#FFD23F1F` | Fondo de badges de recompensa |
| `--color-brand-cream` | `#FFF4EA` | Cuerpo del cuy, nombre en el logotipo |
| `--color-brand-chocolate` | `#7A4E36` | Tercer color del cuy. **Solo ilustración**, nunca texto |

**Estados semánticos**

| Token | Hex | Uso |
| --- | --- | --- |
| `--color-success` | `#7EE081` | Respuesta correcta |
| `--color-success-soft` | `#7EE0811F` | Fondo de feedback correcto |
| `--color-timer` | `#FF4D6D` | Temporizador (barra y número) |
| `--color-error` | `#FF4D6D` | Respuesta incorrecta |
| `--color-error-soft` | `#FF4D6D1F` | Fondo de feedback incorrecto |
| `--color-warning` | `#FFB547` | Avisos que no son error (ej. "Te queda 1 reto esta semana") |
| `--color-info` | `#5CC8FF` | Pistas, tips |

**Colores de categoría (juegos con grupos o parejas)**

Para Parejas, Dos cajas y El intruso. Siempre se acompañan de **forma + letra**, nunca solo color (§14). El texto encima siempre es `text-on-primary` (`#121212`).

| Token | Hex | Forma | Letra |
| --- | --- | --- | --- |
| `--color-cat-1` | `#FF6B2C` | Círculo ● | A |
| `--color-cat-2` | `#FFD23F` | Cuadrado ■ | B |
| `--color-cat-3` | `#7EE081` | Triángulo ▲ | C |
| `--color-cat-4` | `#5CC8FF` | Rombo ◆ | D |
| `--color-cat-5` | `#C792EA` | Estrella ★ | E |

**Degradados permitidos** (solo fondos decorativos y celebraciones, nunca detrás de texto pequeño)

```css
--gradient-surface: linear-gradient(180deg, #1E1E1E 0%, #121212 100%); /* fondos de sección */
--gradient-ember:   linear-gradient(135deg, #FF6B2C 0%, #FF4D6D 100%); /* hero, pantalla de resultado */
--gradient-reward:  linear-gradient(135deg, #FFD23F 0%, #FF6B2C 100%); /* botón reward, logros */
```

### 4.2 Color — tema claro

Mismos nombres de token, distintos valores. Los componentes no cambian.

| Token | Hex | Nota |
| --- | --- | --- |
| `--color-bg` | `#FAFAFA` | |
| `--color-surface` | `#FFFFFF` | |
| `--color-surface-raised` | `#FFFFFF` | |
| `--color-surface-sunken` | `#F0F0F0` | |
| `--color-border` | `#E3E3E3` | |
| `--color-border-strong` | `#C7C7C7` | |
| `--color-text` | `#121212` | |
| `--color-text-secondary` | `#4A4A4A` | |
| `--color-text-muted` | `#6B6B6B` | |
| `--color-primary` | `#C2410C` | Naranja más oscuro: sobre blanco, el `#FF6B2C` no alcanza contraste para texto |
| `--color-primary-hover` | `#A8380A` | |
| `--color-primary-text` | `#C2410C` | |
| `--color-text-on-primary` | `#FFFFFF` | ≈ 5.2:1 sobre `#C2410C` |
| `--color-reward` | `#FFD23F` | Solo como relleno, con texto oscuro encima |
| `--color-success` | `#1E7B34` | |
| `--color-timer` | `#C9184A` | |
| `--color-error` | `#C9184A` | |
| `--color-warning` | `#A15C00` | |
| `--color-info` | `#0B6FA4` | |

### 4.3 Espaciado (base 4, siempre números pares)

| Token | px | Uso típico |
| --- | --- | --- |
| `--space-1` | 4 | Separación ícono–texto |
| `--space-2` | 8 | Gap interno de chips |
| `--space-3` | 12 | Padding de botones pequeños |
| `--space-4` | 16 | Padding de tarjetas en móvil, gutter lateral |
| `--space-5` | 20 | — |
| `--space-6` | 24 | Padding de tarjetas en desktop |
| `--space-8` | 32 | Separación entre secciones (móvil) |
| `--space-10` | 40 | — |
| `--space-12` | 48 | Separación entre secciones (desktop) |
| `--space-16` | 64 | Márgenes de página grandes |

### 4.4 Radios

| Token | px | Uso |
| --- | --- | --- |
| `--radius-sm` | 8 | Chips, inputs pequeños, badges |
| `--radius-md` | 12 | Botones, inputs |
| `--radius-lg` | 16 | Tarjetas, fichas de juego |
| `--radius-xl` | 24 | Sheets, modales, tarjeta de resultados |
| `--radius-full` | 9999 | Píldoras, avatares, navegación inferior |

### 4.5 Bordes y elevación

En tema oscuro la elevación se comunica con **superficie más clara + borde + glow**, no con sombras negras.

| Token | Valor | Uso |
| --- | --- | --- |
| `--border-width` | 1px | Por defecto |
| `--border-width-strong` | 2px | Elemento seleccionado, foco |
| `--shadow-sm` | `0 2px 8px #00000040` | Botones |
| `--shadow-md` | `0 8px 24px #00000059` | Tarjetas elevadas |
| `--shadow-lg` | `0 16px 48px #00000073` | Modales, sheets |
| `--glow-primary` | `0 0 0 4px var(--color-primary-glow)` | Foco visible, ficha seleccionada |
| `--glow-success` | `0 0 24px #7EE08166` | Acierto |
| `--glow-reward` | `0 0 24px #FFD23F66` | Racha, logro desbloqueado, subir en el ranking |

### 4.6 Z-index

| Token | Valor |
| --- | --- |
| `--z-base` | 0 |
| `--z-sticky` | 10 |
| `--z-nav` | 20 |
| `--z-overlay` | 40 |
| `--z-modal` | 50 |
| `--z-toast` | 60 |

### 4.7 Implementación en Tailwind v4

`src/styles/tokens.css`:

```css
@import "tailwindcss";

@theme {
  /* Color — tema oscuro por defecto (negro + naranja) */
  --color-bg: #121212;
  --color-surface: #1E1E1E;
  --color-surface-raised: #2A2A2A;
  --color-surface-sunken: #0A0A0A;
  --color-border: #333333;
  --color-border-strong: #4D4D4D;
  --color-text: #FFF4EA;
  --color-text-secondary: #BDBDBD;
  --color-text-muted: #8F8F8F;
  --color-text-on-primary: #121212;
  --color-primary: #FF6B2C;
  --color-primary-hover: #FF8247;
  --color-primary-text: #FF8A57;
  --color-reward: #FFD23F;
  --color-success: #7EE081;
  --color-timer: #FF4D6D;
  --color-error: #FF4D6D;
  --color-warning: #FFB547;
  --color-info: #5CC8FF;
  --color-cat-1: #FF6B2C;
  --color-cat-2: #FFD23F;
  --color-cat-3: #7EE081;
  --color-cat-4: #5CC8FF;
  --color-cat-5: #C792EA;
  --color-brand-cream: #FFF4EA;
  --color-brand-chocolate: #7A4E36;

  /* Tipografía */
  --font-display: "Sora", system-ui, sans-serif;
  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  /* Radios */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;

  /* Movimiento */
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}

[data-theme="light"] {
  --color-bg: #FAFAFA;
  --color-surface: #FFFFFF;
  --color-surface-raised: #FFFFFF;
  --color-surface-sunken: #F0F0F0;
  --color-border: #E3E3E3;
  --color-border-strong: #C7C7C7;
  --color-text: #121212;
  --color-text-secondary: #4A4A4A;
  --color-text-muted: #6B6B6B;
  --color-text-on-primary: #FFFFFF;
  --color-primary: #C2410C;
  --color-primary-hover: #A8380A;
  --color-primary-text: #C2410C;
  --color-success: #1E7B34;
  --color-timer: #C9184A;
  --color-error: #C9184A;
  --color-warning: #A15C00;
  --color-info: #0B6FA4;
}
```

Uso: `className="bg-surface text-text rounded-lg border border-border"`.

---

## 5. Tipografía

**Familias** (todas en Google Fonts, cargadas con `next/font` para evitar saltos de layout; todas soportan tildes y ñ):

| Rol | Fuente | Por qué |
| --- | --- | --- |
| Logotipo | **Archivo Black** | Solo para el nombre del producto dentro del logotipo (§3.1). Nunca en la UI. |
| Display (titulares, números grandes, puntaje) | **Sora** (600–700) | Geométrica y amistosa, cercana a la plantilla espacial; los números se ven bien grandes. |
| Texto (UI, enunciados, feedback) | **Inter** (400–600) | Máxima legibilidad en pantalla, tanto en laptop como en celular. |
| Código y fórmulas | **JetBrains Mono** (400–500) | Para "Encuentra el error" y cursos de programación. |

**Escala tipográfica** (solo números pares, según recomendación del mentor: 14–16 px en web y 12–14 px en móvil). La columna **Desktop** es la de referencia para diseñar; la de móvil es la reducción.

| Token | Desktop ≥1024 px (px / line-height) | Tablet y móvil <1024 px | Fuente / peso | Uso |
| --- | --- | --- | --- | --- |
| `display-xl` | 56 / 64 | 40 / 48 | Sora 700 | Puntaje final, hero de landing |
| `display` | 40 / 48 | 32 / 40 | Sora 700 | Título de pantalla de resultados |
| `h1` | 32 / 40 | 24 / 32 | Sora 600 | Título de página |
| `h2` | 24 / 32 | 20 / 28 | Sora 600 | Título de sección |
| `h3` | 20 / 28 | 18 / 26 | Inter 600 | Título de tarjeta |
| `prompt` | 24 / 32 | 18 / 28 | Inter 500 | **Enunciado de un reto** |
| `body-lg` | 18 / 28 | 16 / 24 | Inter 400 | Texto de fichas de juego |
| `body` | 16 / 24 | 14 / 22 | Inter 400 | Texto general |
| `label` | 14 / 20 | 14 / 20 | Inter 600 | Botones, etiquetas |
| `caption` | 12 / 16 | 12 / 16 | Inter 500 | Metadatos. **Nunca para contenido del reto.** |
| `code` | 16 / 24 | 14 / 22 | JetBrains Mono 400 | Líneas de código |
| `kbd` | 12 / 16 | — (oculto) | JetBrains Mono 500 | Atajos de teclado en fichas y botones (§11.5) |

**Reglas**

- Mínimo absoluto: 12 px y solo para metadatos. Contenido de un reto: mínimo 18 px en desktop y 16 px en móvil.
- Ancho de línea máximo: 65 caracteres (`max-w-prose`).
- Números que cambian (puntaje, temporizador): `font-variant-numeric: tabular-nums` para que no "bailen".
- Sin texto en MAYÚSCULAS para párrafos; solo para `caption` de etiquetas cortas (ej. "SEMANA 5"), con `letter-spacing: 0.08em`.

---

## 6. Layout, grid y responsive

### 6.0 Base de diseño vs. estrategia de CSS

Son dos decisiones distintas y conviene no mezclarlas:

| | Decisión | Qué significa en la práctica |
| --- | --- | --- |
| **Base de diseño** | **Desktop (1280 × 720)** | Los bocetos, mockups y revisiones parten de la versión laptop. Es la versión que se presenta al jurado y a las universidades. |
| **Estrategia de CSS** | **Mobile-first de Tailwind** (se mantiene) | En el código, las clases sin prefijo aplican a móvil y se agregan `md:` / `lg:` para pantallas más grandes. Es como funciona Tailwind y evita pelear con la librería. |

Ejemplo: un diseño hecho a 1280 px con dos columnas se codifica como `grid grid-cols-1 lg:grid-cols-12`. El diseño manda; el CSS solo es la forma de escribirlo.

**Resoluciones de referencia**

| Resolución | Por qué |
| --- | --- |
| **1280 × 720** | Base de diseño. Área útil típica de una laptop con el navegador abierto. |
| 1366 × 768 | La laptop más común entre estudiantes; validar que nada se corte (área útil ≈ 1366 × 650). |
| 1440 × 900 / 1920 × 1080 | Monitores grandes: el contenido se limita a 1200 px y se centra. |
| 768 × 1024 | Tablet vertical. |
| 390 × 844 | Celular de referencia (validar también 360 × 640). |

### 6.1 Breakpoints

| Nombre (Tailwind) | Desde | Dispositivo objetivo | Columnas | Gutter lateral |
| --- | --- | --- | --- | --- |
| `xl` | 1280 | **Desktop (base de diseño)** | 12 | 32 px (contenido máx. 1200 px) |
| `lg` | 1024 | Laptop pequeña / tablet horizontal | 12 | 32 px |
| `md` | 768 | Tablet vertical | 8 | 24 px |
| `sm` | 640 | Celular grande / horizontal | 4 | 20 px |
| base | 0 | Celular | 4 | 16 px |

### 6.2 Patrones de navegación

| Dispositivo | Navegación |
| --- | --- |
| Desktop y laptop (≥1024) | **Barra lateral izquierda** de 240 px con logo, los 4 destinos (Inicio, Jugar, Ranking, Perfil) y el curso activo. Colapsable a 72 px (solo íconos) entre 1024 y 1279 px. |
| Tablet (768–1023) | Barra lateral colapsada de 72 px. |
| Móvil (<768) | **Barra inferior tipo píldora** (inspirada en la plantilla 1) con los mismos 4 destinos. Altura 64 px + `safe-area-inset-bottom`. |
| Durante un reto | **Sin navegación global** en ningún tamaño. Solo el `GameShell` (§11.2), para no distraer ni invitar a salir. |

### 6.3 Layout de las pantallas principales en desktop

| Pantalla | Desktop (≥1280) | Tablet | Móvil |
| --- | --- | --- | --- |
| Inicio | Sidebar + contenido en 12 columnas: **8 col.** con saludo, tarjeta del curso y retos de la semana; **4 col.** con ranking y logros | Una columna; ranking debajo | Una columna; ranking resumido a 3 filas |
| Curso | 8 col. con semana actual y botón Jugar; 4 col. con timeline de semanas | Timeline debajo | Timeline en acordeón |
| Ranking | Podio arriba + tabla completa (puesto, nombre, puntos, racha, retos) | Tabla sin columna de racha | Lista de filas |
| Reto | `GameShell` sin sidebar, área de juego centrada (§6.4) | Igual, más angosta | Pantalla completa |
| Resultado | Dos columnas: izquierda puntaje y estrellas; derecha explicación y ranking | Una columna centrada de 640 px | Una columna |

### 6.4 Área de juego

- Ancho máximo del área de juego en desktop: **960 px**, centrada. Fuera de ella solo el fondo `--color-bg`, sin contenido adicional.
- Altura: el reto completo (enunciado + interacción + botón) debe caber **sin scroll en 1280 × 720** y en **1366 × 650** de área útil. En móvil debe caber en 390 × 844; si no cabe, se reduce la cantidad de fichas de ese nivel, no el tamaño de fuente.
- Las fichas aprovechan el ancho: en desktop, Parejas usa dos columnas de ≈440 px; El intruso, 4 fichas en una fila; ¿Cuál es mayor?, dos tarjetas lado a lado.
- Usar `100dvh` (no `100vh`) para evitar saltos con la barra del navegador móvil.

---

## 7. Movimiento y animaciones

El mentor pidió animaciones acordes al público: **breves y funcionales**. Cada animación debe responder a una de estas preguntas: ¿confirma una acción?, ¿muestra un cambio de estado?, ¿celebra un logro?

### 7.1 Tokens

| Token | Valor | Uso |
| --- | --- | --- |
| `--duration-instant` | 100 ms | Pressed de botón |
| `--duration-fast` | 160 ms | Hover, selección de ficha |
| `--duration-base` | 240 ms | Entrada de feedback, cambio de pantalla |
| `--duration-slow` | 400 ms | Sheet de resultado, contador de puntos |
| `--duration-celebrate` | 800 ms | Máximo para cualquier celebración |
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Entradas |
| `--ease-in` | `cubic-bezier(0.64, 0, 0.78, 0)` | Salidas |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Fichas que "encajan", puntos que aparecen |

### 7.2 Catálogo de animaciones permitidas

| Evento | Animación | Duración |
| --- | --- | --- |
| Presionar botón | Escala 0.97 | instant |
| Seleccionar ficha | Borde `primary` + `glow-primary` | fast |
| Ficha encaja en su lugar | Escala 1.05 → 1 con spring | base |
| Respuesta correcta | Glow verde + check que dibuja su trazo + "+10" que sube y se desvanece | base |
| Respuesta incorrecta | Sacudida horizontal de 6 px, 2 ciclos | base |
| Temporizador crítico | Pulso de opacidad en el número | 1 s en bucle |
| Sheet de feedback | Desliza desde abajo | base |
| Fin de reto | Estrellas aparecen una por una (stagger 120 ms) + contador de puntos | slow |
| Logro / racha | Badge con `glow-reward` + confetti breve | celebrate |

**Prohibido:** animaciones de más de 800 ms que bloqueen la interacción, parallax dentro del área de juego, confetti en cada acierto (solo al final del reto o en logros).

### 7.3 Movimiento reducido

Respetar `prefers-reduced-motion: reduce`: se reemplazan desplazamientos y escalas por cambios de opacidad, y se elimina el confetti. Con Motion: `useReducedMotion()`.

---

## 8. Iconografía e ilustración

### 8.1 Iconos

- Librería: **lucide-react**, trazo 2 px.
- Tamaños: 16 (en texto), 20 (botones), 24 (navegación), 32 (tarjetas de juego dentro de contenedor).
- Contenedor de ícono destacado (patrón plantilla 2): cuadrado 48 × 48, `radius-md`, fondo `primary-soft`, ícono `primary`.
- Botones solo con ícono deben tener `aria-label`.

**Iconos asignados (no cambiar sin actualizar este documento)**

| Concepto | Ícono lucide |
| --- | --- |
| Puntos | `Sparkles` |
| Racha | `Flame` |
| Temporizador | `Timer` |
| Pista | `Lightbulb` |
| Leaderboard | `Trophy` |
| Logros | `Medal` |
| Retos semanales restantes | `Zap` |
| Correcto | `CircleCheck` |
| Incorrecto | `CircleX` |
| Salir del reto | `X` |

### 8.2 Iconos de minijuegos

Cada minijuego tiene un ícono y un color de acento fijo, que se usan en tarjetas de selección, resultados y perfil:

| Juego | Ícono lucide | Acento |
| --- | --- | --- |
| Desliza | `ArrowLeftRight` | `cat-1` |
| Parejas | `Link2` | `cat-2` |
| Ordena | `ListOrdered` | `cat-3` |
| Dos cajas | `Columns2` | `cat-4` |
| Hueco | `TextCursorInput` | `cat-5` |
| Encuentra el error | `Bug` | `cat-1` |
| ¿Quién soy? | `UserRoundSearch` | `cat-2` |
| El intruso | `ShieldQuestion` | `cat-3` |
| ¿Cuál es mayor? | `Scale` | `cat-4` |

### 8.3 Ilustración

Estilo: **ilustración plana con luz cálida**: escenas sobre fondo casi negro, con el naranja como fuente de luz principal y destellos amarillos, texturas suaves y sin contornos negros. De las plantillas se toma la técnica, no sus colores.

Dónde se usan: onboarding, estados vacíos ("Aún no hay retos esta semana"), pantalla de resultados, perfil, landing para universidades. **Nunca en el área de juego.**

Si se generan con IA, usar siempre el mismo prompt base para mantener coherencia:

```
Flat vector illustration, near-black background (#121212, #1E1E1E), tangerine orange (#FF6B2C)
as the main light source, warm yellow (#FFD23F) highlights, small touches of soft green (#7EE081),
soft grain texture, no black outlines, energetic and competitive mood, university student theme,
[ESCENA], no text.
```

Formato: SVG o WebP, servido con `next/image`. Todas con `alt` descriptivo o `alt=""` si son decorativas.

---

## 9. Componentes base (UI kit)

Todos viven en `src/components/ui/` y tienen historia en Storybook. Ningún juego crea su propio botón, tarjeta o modal.

### 9.1 Button

| Variante | Fondo | Texto | Uso |
| --- | --- | --- | --- |
| `primary` | `primary` | `text-on-primary` (`#121212` en tema oscuro) | Acción principal: "Comprobar", "Jugar", "Continuar". **Una por pantalla.** |
| `secondary` | `surface-raised` + borde `border-strong` | `text` | Acciones alternativas |
| `ghost` | transparente | `text-secondary` | Acciones terciarias, "Saltar" |
| `reward` | `gradient-reward` | `text-on-primary` | Reclamar recompensa, usar booster |
| `danger` | `error-soft` | `error` | Salir del reto (confirmación) |

| Tamaño | Alto | Padding X | Texto |
| --- | --- | --- | --- |
| `sm` | 36 px | 12 px | label 14 |
| `md` | 44 px | 16 px | label 14 |
| `lg` | 52 px | 24 px | label 16 — **botón de acción de juego**: en desktop ancho mínimo 240 px alineado a la derecha y con su atajo (`Enter`); en móvil ancho completo |

Estados obligatorios: default, hover, pressed, focus-visible (`glow-primary`), disabled (opacidad 40 %, sin cursor), loading (spinner + texto se mantiene para que no cambie el ancho).

### 9.2 Card

- Fondo `surface`, borde `border`, `radius-lg`, padding 16 (móvil) / 24 (desktop).
- Variante `interactive`: hover → borde `border-strong` + subir 2 px.
- Variante `numbered` (patrón plantilla 3): número grande "01" en `display` con color de acento, título, descripción y botón. Se usa para elegir juego y para semanas.

### 9.3 Otros componentes base

| Componente | Notas |
| --- | --- |
| `Input`, `Textarea` | Alto 44 px, `radius-md`, fondo `surface-sunken`, borde que cambia a `primary` en foco. Contador de caracteres en `Textarea` (Explícalo en una frase). |
| `Badge` | `radius-sm`, `caption`. Variantes: `neutral`, `primary`, `reward`, `success`, `error`. |
| `Chip` | Seleccionable, `radius-full`, alto 32 px. |
| `ProgressBar` | Alto 8 px, `radius-full`, fondo `surface-sunken`, relleno según variante. |
| `Avatar` | 32 / 40 / 64 px, iniciales si no hay foto. |
| `Sheet` | Radix Dialog. En desktop, panel inferior del área de juego (mismo ancho de 960 px, sin cubrir toda la pantalla); en móvil, bottom sheet con `radius-xl` arriba. Para feedback de respuesta. |
| `Kbd` | Etiqueta de atajo de teclado: `radius-sm`, fondo `surface-sunken`, borde `border`, fuente `kbd`. Solo visible en ≥1024 px. |
| `Dialog` | Para confirmaciones ("¿Salir del reto? Perderás este intento"). |
| `Toast` | Arriba-centro en móvil, abajo-derecha en desktop. 4 s. |
| `Skeleton` | Shimmer suave en `surface-raised`. **Obligatorio en toda carga**, nunca pantalla vacía. |
| `EmptyState` | Ilustración + título + texto + acción. |
| `Tooltip` | Solo para información no esencial. Útil en desktop (hover), pero nada importante puede depender de él porque en móvil no hay hover. |

---

## 10. Componentes de gamificación

Inspirados en Duolingo y TryHackMe (benchmark §5). Viven en `src/components/gamification/`.

| Componente | Descripción | Datos |
| --- | --- | --- |
| `PointsCounter` | Ícono `Sparkles` + número en `reward`. Anima el incremento contando. | `points` |
| `StreakBadge` | Ícono `Flame` + días. Apagado (`text-muted`) si la racha está en 0; con `glow-reward` si está activa. | `streakDays`, `isActiveToday` |
| `WeeklyQuota` | 10 segmentos (uno por reto semanal), llenos los jugados. Texto "7 de 10 retos esta semana". | `played`, `limit` |
| `LeaderboardRow` | Posición, avatar, nombre, puntos. Top 3 con medalla; top 5 con borde `reward` (premio del docente). La fila del usuario siempre resaltada con `primary-soft` y fijada abajo si no está visible. | `rank`, `user`, `points`, `isMe` |
| `LeaderboardPodium` | Top 3 en podio en la parte superior del ranking. | — |
| `AchievementBadge` | Insignia circular, bloqueada en escala de grises con candado. | `achievement`, `unlocked` |
| `StarRating` | 1–3 estrellas de resultado (patrón Platzi). | `stars` |
| `WeekTimeline` | Timeline vertical numerado de semanas del sílabo (patrón plantilla 4): pasadas ✓, actual destacada, futuras bloqueadas. | `weeks`, `currentWeek` |
| `BoosterChip` *(futuro)* | "×2 puntos" con `gradient-reward`. | `multiplier`, `expiresAt` |

---

## 12. Especificación de cada minijuego

Tiempos y cantidades son el punto de partida para la **dificultad progresiva** (nivel 1 → 3, que corresponde a `difficulty` `"baja"`, `"media"` y `"alta"` en la plantilla, §2.2). Se ajustan con pruebas de usuarios. Prioridad de prototipo según el benchmark: **Parejas, Hueco y Ordena**, más **Desliza** como calentamiento.

| # | Juego | Interacción | Nivel 1 | Nivel 2 | Nivel 3 | Envío | Componentes clave |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | **Desliza** | Tarjeta: deslizar derecha = verdadero, izquierda = falso. Botones ✓ / ✗ como alternativa. | 6 cartas, 8 s c/u | 8 cartas, 6 s | 8 cartas, 4 s | auto (por carta) | `SwipeCard` (Motion drag), indicadores laterales verde/rojo |
| 2 | **Parejas** | Tocar un concepto y luego una definición; se unen con el color/forma de la categoría. | 3 pares, 45 s | 4 pares, 50 s | 5 pares, 50 s | auto al completar | `MatchColumn`, conector de color |
| 3 | **Ordena** | Arrastrar pasos a una lista numerada. Flechas ↑↓ como alternativa. | 4 pasos, 45 s | 5 pasos, 50 s | 6 pasos, 55 s | botón | `SortableList` (dnd-kit) |
| 4 | **Dos cajas** | Tarjetas caen una a una; arrastrar o tocar caja A / B. | 6 tarjetas, 6 s c/u | 8, 5 s | 10, 4 s | auto | `DropZone` ×2 con color + letra |
| 5 | **Hueco** | Oración con un espacio; tocar una de 3 fichas (o arrastrar). | 3 opciones, 20 s | 3 opciones, 15 s | 4 opciones, 12 s | auto al elegir | `BlankSentence`, `GameTile` |
| 6 | **Encuentra el error** | Solución de 5 líneas; tocar la incorrecta. | 4 líneas, 40 s | 5 líneas, 35 s | 6 líneas, 30 s | auto | `CodeLine` (fuente mono, numeradas) |
| 7 | **¿Quién soy?** | Pistas se revelan cada X s de vaga a clara; elegir la respuesta. | 4 opciones, pista cada 8 s | 4 opciones, cada 6 s | 4 opciones, cada 5 s | botón | `ClueReveal`, opciones |
| 8 | **El intruso** | 4 fichas en grid 2×2; tocar la que no pertenece. | 4 fichas, 20 s | 4, 15 s | 4 conceptos cercanos, 12 s | auto | Grid de `GameTile` |
| 9 | **¿Cuál es mayor?** | 2 tarjetas lado a lado (apiladas en móvil); tocar la mayor / anterior / más rápida. | 5 rondas, 8 s | 6, 6 s | 8, 5 s | auto (por ronda) | `CompareCard` |

**Notas por juego**

- **Desliza:** la tarjeta se inclina hasta 12° al arrastrar; superar el 35 % del ancho confirma. Mostrar "VERDADERO" / "FALSO" como etiqueta al inclinar (no solo color).
- **Parejas:** en desktop, dos columnas de ≈440 px con un conector visual entre pares formados; en móvil, dos columnas de 50 % cada una y, si las definiciones son largas, conceptos arriba en chips horizontales y definiciones abajo en lista.
- **Desliza:** en desktop, además de arrastrar con el mouse, se responde con `←` / `→`; los botones ✗ / ✓ quedan visibles a los lados de la tarjeta.
- **Ordena:** la lista muestra números fijos (1, 2, 3…) y las tarjetas se colocan en ellos. Teclado: espacio para tomar, flechas para mover, espacio para soltar (dnd-kit `KeyboardSensor`).
- **Encuentra el error:** si el curso no es de programación, las líneas se muestran en `body-lg` (no mono).
- **¿Quién soy?:** la tabla original propone más puntos si se adivina antes; ver decisión pendiente en §20.

---

## 13. Feedback, puntaje y reglas

Reglas definidas en el documento de contexto; el frontend las **muestra**, el backend las **calcula**.

| Regla | Valor | UI |
| --- | --- | --- |
| Acierto | +10 puntos | `FeedbackSheet` éxito + "+10 ✨" animado |
| Acierto con pista | +5 puntos como máximo | Botón de pista muestra "(−5 pts)" antes de usarla |
| Error | La fracción resuelta sobre 10 (sobre 5 con pista), mínimo 2 si respondió. Nunca se restan | `FeedbackSheet` con los puntos sumados y la explicación del error (usa `confusiones` del átomo) |
| Tiempo agotado | Suma lo respondido; sin respuesta, 0 puntos | Título "Se acabó el tiempo" + explicación |
| Límite semanal | 10 retos | `WeeklyQuota`; al llegar a 10, el botón "Jugar" se desactiva con el texto "Vuelve el lunes" y la fecha |
| Cambio de pestaña | **Versión futura** | Ver abajo |

**Estructura del `FeedbackSheet`**

1. Ícono + título: "¡Correcto!" / "Casi" / "Se acabó el tiempo".
2. Puntos obtenidos (o "0 pts" en `text-muted`, sin rojo).
3. **Explicación** (máximo 2–3 oraciones): por qué la respuesta correcta es correcta y, si falló, por qué su elección no lo es.
4. Referencia a la fuente: "Semana 5 · Tema.pdf, p. 12" (refuerza que el contenido viene del curso).
5. Botón "Continuar".

**Detección de cambio de pestaña (preparado, desactivado en v1).** Crear desde ya el hook `useVisibilityGuard()` que escucha `visibilitychange` y `blur`, detrás del feature flag `ENABLE_TAB_GUARD=false`. En v1 solo registra el evento para analítica; cuando se active, muestra un aviso ("Saliste de la pestaña: este reto pasará al siguiente") y salta el reto.

**Pantalla de resultado del reto**

- `StarRating` (3 estrellas: correcto rápido; 2: correcto; 1: correcto con pista; 0: incorrecto — ajustable).
- Puntos ganados, tiempo usado, racha actual, retos restantes esta semana.
- Botones: "Siguiente reto" (primario) y "Ver ranking" (secundario).

---

## 14. Accesibilidad

Objetivo: **WCAG 2.2 nivel AA**.

| Tema | Regla |
| --- | --- |
| Contraste | Texto normal ≥ 4.5:1, texto grande y componentes ≥ 3:1. Los tokens de §4 ya cumplen sobre `bg` y `surface`; validar al crear combinaciones nuevas. |
| Objetivos de clic y táctiles | Mínimo 44 × 44 px en todos los tamaños; fichas de juego de 64 px de alto en desktop y 48 px en móvil. Separación mínima de 12 px entre fichas en desktop y 8 px en móvil. |
| Hover | Todo estado hover en desktop tiene un equivalente de foco (`focus-visible`); nada se revela solo con hover. |
| Color | Nunca como único portador de significado: categorías con forma + letra, correcto/incorrecto con ícono + texto. |
| Teclado | Todo el flujo, incluido cada juego, se completa sin mouse. Orden de foco lógico. Foco visible siempre (`glow-primary`). |
| Drag & drop | Siempre con alternativa: tocar para seleccionar + tocar destino, o flechas de teclado. |
| Lectores de pantalla | `aria-live="polite"` para feedback; el temporizador anuncia solo en umbrales (50 %, 20 %, 5 s), no cada segundo. Fichas con `role="button"` o elementos nativos. |
| Tiempo límite | WCAG pide poder ajustar los límites de tiempo. Como el tiempo es parte del diseño anti-IA, se ofrece un **ajuste de accesibilidad por estudiante habilitado por el docente** (ej. tiempo ×1.5) en lugar de desactivarlo. |
| Movimiento | Respetar `prefers-reduced-motion` (§7.3). |
| Zoom | La UI debe funcionar a 200 % de zoom sin perder contenido. |
| Idioma | `<html lang="es-PE">`. |

---

## 15. Voz y microcopy

**Tono:** un compañero de estudio que sabe del tema: cercano, directo, motivador, nunca infantil ni burlón. Tuteo. Español neutro peruano.

| Situación | Sí | No |
| --- | --- | --- |
| Acierto | "¡Correcto!", "Bien ahí", "Lo tienes" | "¡¡¡INCREÍBLE!!!" |
| Error | "Casi. Mira por qué:" | "Incorrecto", "Fallaste" |
| Tiempo agotado | "Se acabó el tiempo. Así se resolvía:" | "Muy lento" |
| Límite semanal | "Completaste tus 10 retos de la semana. Vuelve el lunes 3/11." | "No tienes más intentos" |
| Racha perdida | "Tu racha volvió a 0. Un reto hoy la reinicia." | "Perdiste tu racha" |
| Ranking bajo | "Estás a 30 puntos del puesto 12." | "Estás en los últimos lugares" |
| Carga | "Preparando tu reto…" | "Cargando…" (genérico) |

**Reglas de escritura**

- Botones con verbo: "Jugar", "Comprobar", "Continuar", "Ver ranking".
- Oraciones de máximo 15 palabras en la UI de juego.
- Números con formato local: `1 250 pts`, fechas `lun 3 nov`.
- Todos los textos en `src/content/copy.ts` (o i18n si se planea otro idioma), no escritos sueltos en componentes.

---
