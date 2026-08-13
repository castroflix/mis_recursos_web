// =============================================
// Efeméride del día ("¿Sabías que...?")
// -----------------------------------------------
// Los datos se cargan desde data/efemerides.json, que se
// regenera automáticamente una vez al día mediante un GitHub
// Action (.github/workflows/efemeride-diaria.yml) que llama a
// la API de Gemini.
//
// Formato de cada entrada del JSON:
// { categoria, anio, titulo, texto, fuentes: [{ nombre, url }], fecha }
//
// REGLA "UN DÍA COMO HOY": el widget solo pinta una efeméride si
// existe una entrada cuyo campo "fecha" (YYYY-MM-DD) coincide
// exactamente con la fecha de hoy. Si el generador no encontró
// ningún hecho verificado para hoy, no hay entrada con la fecha
// de hoy y se muestra un mensaje de "hoy no toca" en vez de
// inventar algo o mostrar una efeméride de otro día.
//
// NOTA: como usamos fetch(), esta sección requiere que la web se
// sirva por http(s) (GitHub Pages, un servidor local, etc.); no
// funcionará abriendo index.html directamente con file://.
// =============================================

function fechaHoyISO() {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function elegirEntradaDeHoy(historial) {
  if (!Array.isArray(historial) || historial.length === 0) return null;
  const hoyISO = fechaHoyISO();
  return historial.find((e) => e.fecha === hoyISO) || null;
}

function pintarEfemeride(entrada) {
  const hoy = new Date();
  const fechaFormateada = hoy.toLocaleDateString("es-ES", {
    day: "numeric", month: "long", year: "numeric"
  });

  document.getElementById("efemerideFecha").textContent = fechaFormateada;
  document.getElementById("efemerideCategoria").textContent = entrada.categoria;
  document.getElementById("efemerideTitulo").textContent = `${entrada.titulo} (${entrada.anio})`;
  document.getElementById("efemerideTexto").textContent = entrada.texto;

  const fuentesEl = document.getElementById("efemerideFuentes");
  if (fuentesEl) {
    fuentesEl.innerHTML = "";
    if (entrada.fuentes && entrada.fuentes.length > 0) {
      fuentesEl.appendChild(document.createTextNode("Fuente: "));
      entrada.fuentes.forEach((f, i) => {
        if (i > 0) fuentesEl.appendChild(document.createTextNode(" · "));
        if (f.url) {
          const enlace = document.createElement("a");
          enlace.href = f.url;
          enlace.target = "_blank";
          enlace.rel = "noopener";
          enlace.textContent = f.nombre;
          fuentesEl.appendChild(enlace);
        } else {
          fuentesEl.appendChild(document.createTextNode(f.nombre));
        }
      });
    }
  }
}

function mostrarSinEventoHoy() {
  const hoy = new Date();
  const fechaFormateada = hoy.toLocaleDateString("es-ES", {
    day: "numeric", month: "long", year: "numeric"
  });

  document.getElementById("efemerideFecha").textContent = fechaFormateada;
  document.getElementById("efemerideCategoria").textContent = "";
  document.getElementById("efemerideTitulo").textContent = "Hoy no toca ninguna efeméride 🙃";
  document.getElementById("efemerideTexto").textContent =
    "No tenemos ningún hito verificado de la historia de la informática para el día de hoy exacto. Vuelve mañana, o echa un vistazo al archivo completo de curiosidades ya publicadas.";

  const fuentesEl = document.getElementById("efemerideFuentes");
  if (fuentesEl) fuentesEl.innerHTML = "";
}

async function inicializarEfemeride() {
  const contenedor = document.getElementById("efemerideCard");
  if (!contenedor) return;

  try {
    const respuesta = await fetch("data/efemerides.json", { cache: "no-store" });
    if (!respuesta.ok) throw new Error("No se ha podido cargar data/efemerides.json");
    const historial = await respuesta.json();

    const entrada = elegirEntradaDeHoy(historial);
    if (entrada) {
      pintarEfemeride(entrada);
    } else {
      mostrarSinEventoHoy();
    }
  } catch (err) {
    console.error("Error cargando la efeméride del día:", err);
    // Solo ocultamos la tarjeta si ha fallado la carga de verdad
    // (no cuando simplemente hoy no hay ningún hecho verificado).
    contenedor.style.display = "none";
  }
}

inicializarEfemeride();
