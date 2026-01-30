"use strict";


// ==========================
// INYECTAR FILTROS HTML
// ==========================
function inyectarFiltros() {
    const contenedor = document.getElementById("contenedor-filtros");
    if (!contenedor) return null;

    contenedor.innerHTML = `
       <div class="rejilla-filtros">
          <div class="grupo-filtro">
        <label class="etiqueta-filtro" for="filtroOrden">Orden</label>
        <select id="filtroOrden" class="control-filtro">
            <option value="asc">Solicitudes más antiguas primero</option>
            <option value="desc">Solictudes más nuevas primero</option>          
        </select>
      </div>
    
      <div class="grupo-filtro">
        <label class="etiqueta-filtro" for="filtroDesde">Desde</label>
        <input type="date" id="filtroDesde" class="control-filtro" />
      </div>
    
      <div class="grupo-filtro">
        <label class="etiqueta-filtro" for="filtroHasta">Hasta</label>
        <input type="date" id="filtroHasta" class="control-filtro" />
      </div>
    
      <div class="grupo-filtro">
        <label class="etiqueta-filtro">&nbsp;</label>
        <button class="btn btn--secondary" id="btnBorrarFiltros" type="button">
          Borrar filtros
        </button>
      </div>
    
    </div>

  `;

    return {

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
        return {desde: "", hasta: "", orden: "desc"};
    }

    return {

        desde: ui.filtroDesde?.value || "",
        hasta: ui.filtroHasta?.value || "",
        orden: ui.filtroOrden?.value || "asc",
    };
}

// ==========================
// FILTRAR + ORDENAR
// ==========================
function filtrarYOrdenar(lista, filtros) {
    let resultado = Array.isArray(lista) ? [...lista] : [];

    const estado = filtros?.estado || "";
    const desde = filtros?.desde || "";
    const hasta = filtros?.hasta || "";
    const orden = filtros?.orden || "desc";


    // 1) Estado (case-insensitive)
    if (estado) {
        resultado = resultado.filter((item) =>
            String(item.estado || "").toLowerCase() === estado.toLowerCase()
        );
    }

    // 2) Desde (YYYY-MM-DD)
    if (desde) {
        resultado = resultado.filter(
            (item) => String(item.fecha_turno || "").slice(0, 10) >= desde
        );
    }

    // 3) Hasta (YYYY-MM-DD)
    if (hasta) {
        resultado = resultado.filter(
            (item) => String(item.fecha_turno || "").slice(0, 10) <= hasta
        );
    }

    // 4) Orden (por fecha ISO)
    resultado.sort((a, b) => {
        const fa = String(a.id_solicitud || "").slice(0, 10);
        const fb = String(b.id_solicitud || "").slice(0, 10);
        return orden === "asc" ? fa.localeCompare(fb) : fb.localeCompare(fa);
    });

    return resultado;
}

// ==========================
// LISTENERS
// ==========================
function cargarListenersFiltros(uiFiltros, refrescar) {
    if (!uiFiltros) return;
    if (typeof refrescar !== "function") {
        throw new TypeError("cargarListenersFiltros: refrescar debe ser una función");
    }


    uiFiltros.filtroOrden.addEventListener("change", refrescar);
    uiFiltros.filtroDesde.addEventListener("change", refrescar);
    uiFiltros.filtroHasta.addEventListener("change", refrescar);
    uiFiltros.btnBorrarFiltros.addEventListener("click", () => {

        uiFiltros.filtroDesde.value = "";
        uiFiltros.filtroHasta.value = "";
        uiFiltros.filtroOrden.value = "desc";
        refrescar();
    });
}

// ==========================
// APLICAR FILTROS
// ==========================
function aplicarFiltros(
    uiFiltros,
    solicitudesEnviadas = [],
    actualizarEstadisticas,
    renderizarTabla
) {
    if (typeof actualizarEstadisticas !== "function") {
        throw new TypeError("aplicarFiltros: actualizarEstadisticas debe ser una función");
    }
    if (typeof renderizarTabla !== "function") {
        throw new TypeError("aplicarFiltros: renderizarTabla debe ser una función");
    }

    const filtros = leerFiltros(uiFiltros);
    const filtradas = filtrarYOrdenar(solicitudesEnviadas, filtros);

    actualizarEstadisticas(filtradas);
    renderizarTabla(filtradas);
}

export {inyectarFiltros, leerFiltros, filtrarYOrdenar, cargarListenersFiltros, aplicarFiltros};
