"use strict";


// ==========================
// INYECTAR FILTROS HTML
// ==========================
function inyectarFiltros() {
  const contenedor = document.getElementById("contenedor-filtros");
  if (!contenedor) return null;

  contenedor.innerHTML = `
    <div class="filtros-solicitudes__rejilla">

      <div class="grupo-formulario">
        <label for="filtroEstado">Estado</label>
        <select id="filtroEstado" class="control-filtro">
          <option value="">Todos</option>          
          <option value="aprobada">Aprobado</option>
          <option value="rechazada">Rechazado</option>          
          <option value="expirado">Expirado</option>
        </select>
      </div>

      <div class="grupo-formulario">
        <label for="filtroOrden">Orden</label>
        <select id="filtroOrden" class="control-filtro">
          <option value="desc">Más nuevos primero</option>
          <option value="asc">Más antiguos primero</option>
        </select>
      </div>

      <div class="grupo-formulario">
        <label for="filtroDesde">Desde</label>
        <input type="date" id="filtroDesde" class="control-filtro" />
      </div>

      <div class="grupo-formulario">
        <label for="filtroHasta">Hasta</label>
        <input type="date" id="filtroHasta" class="control-filtro" />
      </div>

      <div class="grupo-formulario">
        <label>&nbsp;</label>
        <button class="btn btn--secondary" id="btnBorrarFiltros" type="button">
          Borrar filtros
        </button>
      </div>

    </div>
  `;

  return {
    filtroEstado: document.getElementById("filtroEstado"),
    filtroOrden: document.getElementById("filtroOrden"),
    filtroDesde: document.getElementById("filtroDesde"),
    filtroHasta: document.getElementById("filtroHasta"),
    btnBorrarFiltros: document.getElementById("btnBorrarFiltros"),
  };
}

// ==========================
// LEER FILTROS
// ==========================
function leerFiltros(ui) {
  if (!ui) {
    return { estado: "", desde: "", hasta: "", orden: "desc" };
  }

  return {
    estado: ui.filtroEstado?.value ?? "",
    desde: ui.filtroDesde?.value ?? "",
    hasta: ui.filtroHasta?.value ?? "",
    orden: ui.filtroOrden?.value ?? "desc",
  };
}


// ==========================
// FILTRAR + ORDENAR
// ==========================
function filtrarYOrdenar(lista, filtros) {
  let resultado = Array.isArray(lista) ? [...lista] : [];

  const estado = filtros?.estado ?? "";
  const desde = filtros?.desde ?? "";
  const hasta = filtros?.hasta ?? "";
  const orden = filtros?.orden ?? "desc";


  // 1) estado
  if (estado) {
    resultado = resultado.filter(
      (item) => (item.estado_validacion).toLowerCase() === estado
    );

  }

  // 2) desde/hasta por fecha_match (YYYY-MM-DD)
  if (desde) {
    resultado = resultado.filter(
      (item) => String(item.fecha_validacion || "").slice(0, 10) >= desde
    );
  }

  if (hasta) {
    resultado = resultado.filter(
      (item) => String(item.fecha_validacion || "").slice(0, 10) <= hasta
    );
  }

  // 3) orden por fecha_match

    // 4) Orden (por fecha ISO)
    resultado.sort((a, b) => {
        const fa = Number(a.id_match ?? 0);
        const fb = Number(b.id_match ?? 0);

        return orden === "asc"
            ? fb - fa
            : fa - fb;
    });

  return resultado;
}

// ==========================
// LISTENERS
// ==========================
function cargarListenersFiltros(uiFiltros, refrescar) {
  if (!uiFiltros) return;
  if (typeof refrescar !== "function") {
    throw new TypeError("cargarListenersFiltrosMatches: refrescar debe ser una función");
  }

  uiFiltros.filtroEstado?.addEventListener("change", refrescar);
  uiFiltros.filtroOrden?.addEventListener("change", refrescar);
  uiFiltros.filtroDesde?.addEventListener("change", refrescar);
  uiFiltros.filtroHasta?.addEventListener("change", refrescar);

  uiFiltros.btnBorrarFiltros?.addEventListener("click", () => {
    uiFiltros.filtroEstado.value = "";
    uiFiltros.filtroDesde.value = "";
    uiFiltros.filtroHasta.value = "";
    uiFiltros.filtroOrden.value = "desc";
    refrescar();
  });
}

// ==========================
// APLICAR FILTROS
// ==========================
function aplicarFiltros(uiFiltros, lista = [], actualizarEstadisticas, renderizarTabla) {
  if (typeof actualizarEstadisticas !== "function") {
    throw new TypeError("aplicarFiltrosMatches: actualizarEstadisticas debe ser una función");
  }
  if (typeof renderizarTabla !== "function") {
    throw new TypeError("aplicarFiltrosMatches: renderizarTabla debe ser una función");
  }

  const filtros = leerFiltros(uiFiltros);
  const filtradas = filtrarYOrdenar(lista, filtros);

  actualizarEstadisticas(filtradas);
  renderizarTabla(filtradas);
}

export { inyectarFiltros, leerFiltros, filtrarYOrdenar, cargarListenersFiltros, aplicarFiltros,};
