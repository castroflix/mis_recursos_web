// =============================================
// Genera la efeméride del día llamando a la API de Gemini,
// la valida y actualiza:
//   - data/efemerides.json      (historial)
//   - efemerides/YYYY-MM-DD.html (ficha permanente indexable)
//   - efemerides/index.html      (listado del archivo)
//
// REGLA CLAVE de esta adaptación: solo se publica si el hecho
// ocurrió REALMENTE el día y mes de hoy (cualquier año). Si el
// modelo no tiene un hecho verificado para esa fecha exacta,
// responde {"sinEvento": true} y ese día simplemente no se
// publica nada nuevo (no se inventa ni se aproxima).
//
// Se ejecuta desde .github/workflows/efemeride-diaria.yml
// Requiere la variable de entorno GEMINI_API_KEY.
// =============================================

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, "config", "site.json");
const DATA_PATH = path.join(ROOT, "data", "efemerides.json");
const TEMPLATE_PATH = path.join(ROOT, "efemerides", "_template.html");
const ARCHIVE_INDEX_PATH = path.join(ROOT, "efemerides", "index.html");

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("Falta la variable de entorno GEMINI_API_KEY.");
  process.exit(1);
}

function fechaHoyISO(zonaHoraria) {
  // Fecha de hoy en la zona horaria configurada, formato YYYY-MM-DD
  const formateador = new Intl.DateTimeFormat("en-CA", {
    timeZone: zonaHoraria,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formateador.format(new Date());
}

async function cargarJSON(ruta, porDefecto) {
  try {
    const contenido = await readFile(ruta, "utf-8");
    return JSON.parse(contenido);
  } catch (err) {
    if (err.code === "ENOENT") return porDefecto;
    throw err;
  }
}

function construirPrompt(config, fechaISO, historial) {
  const [, mes, dia] = fechaISO.split("-");
  const titulosPrevios = historial
    .slice(-60)
    .map((e) => e.titulo)
    .filter(Boolean);

  return `Eres un redactor de curiosidades técnicas ("efemérides") en ${config.idioma} para la web "${config.nombreSitio}".
Temática exclusiva: ${config.tematica}.
Categorías permitidas (usa EXACTAMENTE una de estas, tal cual está escrita): ${config.categorias.join(", ")}.

Busca UN hecho real y verificable de la historia de la informática y la programación que haya ocurrido EXACTAMENTE el día ${dia} del mes ${mes} (en cualquier año, sin importar cuál). Ejemplos válidos: el lanzamiento de un sistema operativo o de una versión concreta de un lenguaje de programación, la salida al mercado de un software o dispositivo icónico, el nacimiento o fallecimiento de una figura clave de la computación, la fundación de una empresa tecnológica relevante, etc.

Reglas MUY importantes:
- Solo vale un hecho que ocurriera de verdad ese día Y ese mes exactos (el año da igual cuál sea). No sirve "por esas fechas" ni "ese mismo mes"; tiene que ser el día ${dia} concreto.
- Si no conoces con certeza ningún hecho verificado para el día ${dia} de ${mes} dentro de esta temática, NO inventes ni aproximes: responde EXACTAMENTE {"sinEvento": true} y nada más, sin ningún otro texto.
- No repitas ninguno de estos títulos ya usados: ${titulosPrevios.length ? titulosPrevios.join(" | ") : "(ninguno todavía)"}.
- Si dudas de un dato concreto (fecha exacta, cifra, nombre), no lo publiques: usa {"sinEvento": true} en su lugar.
- Evita temas de normativa, legislación o polémicas — mantén un tono divulgativo y de bajo riesgo.
- La categoría debe ser EXACTAMENTE una de las categorías permitidas listadas arriba.
- El campo "anio" debe ser el año en que ocurrió el hecho (como texto, p. ej. "1991").
- Responde SOLO con un objeto JSON, sin texto adicional, sin bloques de código markdown, con esta forma exacta:

{
  "categoria": "una de las categorías permitidas",
  "anio": "año en que ocurrió",
  "titulo": "título breve y atractivo, sin punto final",
  "texto": "2-4 frases explicando el hecho, en ${config.idioma}, tono cercano y divulgativo",
  "fuentes": [{ "nombre": "nombre de la fuente", "url": "https://..." }]
}

Si no puedes citar una fuente real y verificable, deja "fuentes" como un array vacío [] en vez de inventar una URL.

Recuerda: si no hay ningún hecho real y verificado para el día ${dia} de ${mes} dentro de esta temática, responde solo con {"sinEvento": true}.`;
}

async function llamarGemini(config, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.modelo}:generateContent?key=${API_KEY}`;

  const respuesta = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json"
      }
    })
  });

  if (!respuesta.ok) {
    const cuerpo = await respuesta.text();
    throw new Error(`Error de la API de Gemini (${respuesta.status}): ${cuerpo}`);
  }

  const datos = await respuesta.json();
  const texto = datos?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!texto) throw new Error("Respuesta de Gemini sin contenido de texto.");

  return texto;
}

function limpiarYParsear(textoBruto) {
  const limpio = textoBruto.replace(/```json/gi, "").replace(/```/g, "").trim();
  return JSON.parse(limpio);
}

function validarEntrada(entrada, config) {
  const camposObligatorios = ["categoria", "anio", "titulo", "texto"];
  for (const campo of camposObligatorios) {
    if (!entrada[campo] || typeof entrada[campo] !== "string" || !entrada[campo].trim()) {
      throw new Error(`Campo obligatorio ausente o vacío: "${campo}"`);
    }
  }
  if (!config.categorias.includes(entrada.categoria)) {
    throw new Error(
      `Categoría "${entrada.categoria}" no está en la lista permitida: ${config.categorias.join(", ")}`
    );
  }
  if (!Array.isArray(entrada.fuentes)) {
    entrada.fuentes = [];
  }
  return entrada;
}

function escaparHTML(texto) {
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderFuentesHTML(fuentes) {
  if (!fuentes || fuentes.length === 0) return "";
  const enlaces = fuentes
    .map((f) =>
      f.url
        ? `<a href="${escaparHTML(f.url)}" target="_blank" rel="noopener">${escaparHTML(f.nombre)}</a>`
        : escaparHTML(f.nombre)
    )
    .join(" · ");
  return `<p class="efemeride-fuentes">Fuente: ${enlaces}</p>`;
}

async function escribirFichaDelDia(config, entrada, fechaISO) {
  const plantilla = await readFile(TEMPLATE_PATH, "utf-8");
  const fechaLegible = new Date(`${fechaISO}T00:00:00`).toLocaleDateString(config.localeFecha, {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const tituloConAnio = `${entrada.titulo} (${entrada.anio})`;

  const html = plantilla
    .replaceAll("{{NOMBRE_SITIO}}", escaparHTML(config.nombreSitio))
    .replaceAll("{{URL_SITIO}}", config.urlSitio)
    .replaceAll("{{FECHA_ISO}}", fechaISO)
    .replaceAll("{{FECHA_LEGIBLE}}", fechaLegible)
    .replaceAll("{{CATEGORIA}}", escaparHTML(entrada.categoria))
    .replaceAll("{{TITULO}}", escaparHTML(tituloConAnio))
    .replaceAll("{{TITULO_PLANO}}", escaparHTML(entrada.titulo))
    .replaceAll("{{TEXTO}}", escaparHTML(entrada.texto))
    .replaceAll("{{FUENTES_HTML}}", renderFuentesHTML(entrada.fuentes));

  const rutaFicha = path.join(ROOT, "efemerides", `${fechaISO}.html`);
  await writeFile(rutaFicha, html, "utf-8");
  console.log(`Ficha escrita: efemerides/${fechaISO}.html`);
}

async function actualizarIndiceArchivo(config, entrada, fechaISO) {
  let indiceHTML;
  try {
    indiceHTML = await readFile(ARCHIVE_INDEX_PATH, "utf-8");
  } catch {
    indiceHTML = null;
  }
  if (!indiceHTML) return; // el índice se genera aparte si no existe

  const fechaLegible = new Date(`${fechaISO}T00:00:00`).toLocaleDateString(config.localeFecha, {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  const tituloConAnio = `${entrada.titulo} (${entrada.anio})`;

  // El marcador se mantiene siempre justo antes de la lista de entradas,
  // así que insertar "marcador + nueva fila" en su lugar hace que la
  // entrada más reciente quede siempre arriba del todo.
  const nuevaFila = `<!-- MARCADOR_NUEVA_ENTRADA -->
        <li class="archivo-item">
            <a href="${fechaISO}.html">
                <span class="archivo-fecha">${fechaLegible}</span>
                <span class="archivo-titulo">${escaparHTML(tituloConAnio)}</span>
                <span class="archivo-categoria">${escaparHTML(entrada.categoria)}</span>
            </a>
        </li>`;

  if (indiceHTML.includes("<!-- MARCADOR_NUEVA_ENTRADA -->")) {
    indiceHTML = indiceHTML.replace("<!-- MARCADOR_NUEVA_ENTRADA -->", nuevaFila);
    await writeFile(ARCHIVE_INDEX_PATH, indiceHTML, "utf-8");
    console.log("efemerides/index.html actualizado con la nueva entrada.");
  } else {
    console.warn("No se encontró el marcador en efemerides/index.html; no se insertó la entrada.");
  }
}

async function main() {
  const config = await cargarJSON(CONFIG_PATH, null);
  if (!config) throw new Error("No se encontró config/site.json");

  const fechaISO = fechaHoyISO(config.zonaHoraria);
  const historial = await cargarJSON(DATA_PATH, []);

  if (historial.some((e) => e.fecha === fechaISO)) {
    console.log(`Ya existe una entrada generada para ${fechaISO}. No se hace nada.`);
    return;
  }

  const prompt = construirPrompt(config, fechaISO, historial);
  const textoBruto = await llamarGemini(config, prompt);
  const entradaBruta = limpiarYParsear(textoBruto);

  if (entradaBruta && entradaBruta.sinEvento === true) {
    console.log(`Sin hecho verificado para el ${fechaISO.slice(8, 10)}/${fechaISO.slice(5, 7)}. No se publica ninguna efeméride hoy.`);
    return;
  }

  const entrada = validarEntrada(entradaBruta, config);
  entrada.fecha = fechaISO;

  historial.push(entrada);
  await writeFile(DATA_PATH, JSON.stringify(historial, null, 2) + "\n", "utf-8");
  console.log(`Nueva entrada añadida a data/efemerides.json (${fechaISO}).`);

  await escribirFichaDelDia(config, entrada, fechaISO);
  await actualizarIndiceArchivo(config, entrada, fechaISO);
}

main().catch((err) => {
  console.error("Error generando la efeméride del día:", err);
  process.exit(1);
});
