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
          <option value="desc">Más nuevos primero</option>
          <option value="asc">Más antiguos primero</option>
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
    if (!ui) return {desde: "", hasta: "", orden: "desc"};

    return {

        desde: ui.filtroDesde?.value || "",
        hasta: ui.filtroHasta?.value || "",
        orden: ui.filtroOrden?.value || "desc",
    };
}


// ==========================
// FILTRAR + ORDENAR
// ==========================
function filtrarYOrdenar(lista, filtros) {
    let resultado = Array.isArray(lista) ? [...lista] : [];


    const desde = filtros?.desde || "";
    const hasta = filtros?.hasta || "";
    const orden = filtros?.orden || "desc";
    console.log(filtros);

    // 2) Desde (YYYY-MM-DD)
    // Desde
    if (desde) {
        resultado = resultado.filter(item => {
            const f = String(item.fecha_match || "").slice(0, 10);
            return f >= desde;
        });
    }

    // 3) Hasta (YYYY-MM-DD)
    if (hasta) {
        resultado = resultado.filter(item => {
            const f = String(item.fecha_match || "").slice(0, 10);
            return f <= hasta;
        });
    }

    // 4) Orden (por fecha ISO)
    resultado.sort((a, b) => {
        const fa = Number(a.id_match ?? 0);
        const fb = Number(b.id_match ?? 0);

        return orden === "asc"
            ? fa - fb
            : fb - fa;
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


    uiFiltros.filtroOrden?.addEventListener("change", refrescar);
    uiFiltros.filtroDesde?.addEventListener("change", refrescar);
    uiFiltros.filtroHasta?.addEventListener("change", refrescar);

    uiFiltros.btnBorrarFiltros?.addEventListener("click", () => {
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
    lista = [],
    actualizarEstadisticas,
    renderizarTabla,
    getEstadoFn,
    getFechaFn
) {
    if (typeof actualizarEstadisticas !== "function") {
        throw new TypeError("aplicarFiltros: actualizarEstadisticas debe ser una función");
    }
    if (typeof renderizarTabla !== "function") {
        throw new TypeError("aplicarFiltros: renderizarTabla debe ser una función");
    }

    const filtros = leerFiltros(uiFiltros);
    const filtradas = filtrarYOrdenar(lista, filtros, getEstadoFn, getFechaFn);

    actualizarEstadisticas(filtradas);
    renderizarTabla(filtradas);
}


// ==========================
// EXPORTS
// ==========================
export {inyectarFiltros, leerFiltros, filtrarYOrdenar, cargarListenersFiltros, aplicarFiltros,};
