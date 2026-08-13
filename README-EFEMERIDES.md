# Widget "¿Sabías que...?" — Efemérides diarias de informática

Sistema de curiosidades diarias automatizado con IA (Gemini), adaptado
para el Dashboard de Recursos Web a partir del widget original del
portfolio. Cada día comprueba si existe un hecho **real y verificado**
de la historia de la informática y la programación para el día y mes
exactos de hoy (cualquier año); si lo hay, lo publica; si no, no
publica nada ese día (no se inventa ni se aproxima nada).

Coste: **0 €/mes** (GitHub Pages + GitHub Actions + nivel gratuito de
la API de Gemini).

## Regla "un día como hoy"

A diferencia del widget original (que rellenaba cada día con cualquier
curiosidad de la temática), esta versión solo publica cuando el hecho
ocurrió **exactamente** el día y mes de hoy en la historia de la
informática (lanzamiento de un sistema operativo, primera versión de
un lenguaje de programación, software o hardware icónico, nacimiento o
fallecimiento de una figura clave, etc.). Si el modelo no tiene un
dato verificado para esa fecha exacta, responde `{"sinEvento": true}`
y el script no escribe nada — ese día el widget del dashboard muestra
un mensaje de "hoy no toca" en vez de una tarjeta vacía o repetida.

## Archivos que forman el sistema

| Archivo | Qué hace |
|---|---|
| `config/site.json` | Aquí se personaliza todo: idioma, temática, categorías, nombre del sitio. |
| `scripts/generar-efemeride.mjs` | Llama a la API de Gemini, exige coincidencia real de día/mes, valida la respuesta y escribe los archivos siguientes. |
| `data/efemerides.json` | Historial completo en JSON. `assets/js/efemerides.js` lo lee para pintar la efeméride de hoy (si la hay). |
| `efemerides/_template.html` | Plantilla con placeholders que el script rellena cada día. |
| `efemerides/YYYY-MM-DD.html` | Una página nueva cada día que se publica, indexable, con URL propia y permanente. |
| `efemerides/index.html` | Listado del archivo; el script inserta la entrada nueva arriba del todo. |
| `assets/css/efemerides.css` | Estilos del widget y del archivo, ya adaptados a la paleta Matrix del dashboard. |
| `assets/js/efemerides.js` | Carga `data/efemerides.json` y pinta la tarjeta si hay una entrada para hoy. |
| `.github/workflows/efemeride-diaria.yml` | Ejecuta el script cada día a las 06:30 UTC (y permite lanzarlo a mano). |

## Puesta en marcha (paso a paso)

1. **Consigue una API key gratuita de Gemini**: entra en [Google AI
   Studio](https://aistudio.google.com/), crea una API key (no pide
   tarjeta de crédito).
2. **Añádela como secreto del repositorio**: en tu repo de GitHub →
   `Settings` → `Secrets and variables` → `Actions` → `New repository
   secret` → nombre `GEMINI_API_KEY`, valor tu key.
3. **Sube estos archivos** a tu repositorio `mis_recursos_web`
   respetando las rutas (`config/`, `scripts/`, `data/`,
   `assets/css/efemerides.css`, `assets/js/efemerides.js`,
   `efemerides/`, `.github/workflows/`), y sustituye el `index.html`
   de la raíz por la versión ya integrada.
4. **Activa GitHub Pages** si no lo estaba ya (`Settings` → `Pages`).
5. **Lanza la primera ejecución a mano**: pestaña `Actions` →
   "Efeméride diaria" → `Run workflow`. Puede que ese primer día no
   publique nada si no hay ningún hecho verificado para la fecha en
   la que lo lances — es el comportamiento esperado. A partir de ahí
   se ejecutará sola cada día a las 06:30 UTC.

## Personalización

Todo vive en `config/site.json`. Ya viene configurado con:

- **`idioma`**: español.
- **`tematica`**: informática y programación (sistemas operativos,
  lenguajes, software, hardware, figuras clave). Puedes ampliarla o
  matizarla libremente — es lo que más cambia el resultado.
- **`categorias`**: `Sistemas operativos`, `Lenguajes de programación`,
  `Software y aplicaciones`, `Hardware e historia de la computación`.
  Puedes añadir o quitar categorías, pero mantenlas de bajo riesgo
  (evita normativa, legislación o temas controvertidos) para que el
  sistema siga funcionando sin revisión humana diaria.

## Mantenimiento habitual

- **Ver si ha fallado algún día**: pestaña `Actions` del repositorio —
  las ejecuciones fallidas salen en rojo. Ojo: que un día no publique
  nada (porque no había hecho verificado) **no** es un fallo, la
  acción termina en verde igualmente.
- **Forzar una ejecución manual**: `Actions` → "Efeméride diaria" →
  `Run workflow`.
- **Rotar la API key**: `Settings` → `Secrets and variables` →
  `Actions`.

## Límites del nivel gratuito de Gemini

El script hace como mucho **1 llamada al día**. El nivel gratuito de
`gemini-flash-latest` permite muchas más peticiones diarias que eso.

## Diferencias respecto al widget original del portfolio

- Temática cambiada de "redes/hardware/cultura tech en general" a
  "informática y programación" específicamente (sistemas operativos,
  lenguajes, software, hardware).
- Regla nueva y más estricta: solo se publica si el hecho coincide
  realmente con el día y mes de hoy; si no hay nada verificado, no se
  publica nada ese día (antes se publicaba cualquier curiosidad de la
  temática aunque no coincidiera la fecha).
- El frontend (`assets/js/efemerides.js`) ya no rota entre curiosidades
  de ejemplo como reserva: si no hay entrada para hoy, muestra un
  mensaje de "hoy no toca" en vez de una curiosidad de otro día.
- CSS y JS movidos a `assets/css/` y `assets/js/` para seguir la misma
  estructura de carpetas que el resto del dashboard, y restyleados con
  la paleta Matrix (verde `#00ff41` + acento cian `#00e5ff`) en vez del
  tema propio del portfolio.
- Colocado justo debajo del buscador de recursos, como sección propia
  antes de las categorías de tarjetas.
