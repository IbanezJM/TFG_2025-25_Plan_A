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
        <label class="etiqueta-filtro" for="filtroActivo">Estado</label>
        <select id="filtroActivo" class="control-filtro">
          <option value="">Todos</option>
          <option value="1">Activos</option>
          <option value="0">Bloqueados</option>
        </select>
      </div>

      <div class="grupo-filtro">
        <label class="etiqueta-filtro" for="filtroRol">Rol</label>
        <select id="filtroRol" class="control-filtro">
          <option value="">Todos</option>
          <option value="Trabajador/a">Trabajador/a</option>
          <option value="Coordinador/a">Coordinador/a</option>
          <option value="Administrador/a">Administrador/a</option>
        </select>
      </div>

      <div class="grupo-filtro">
        <label class="etiqueta-filtro" for="filtroBusqueda">Buscar</label>
        <input
          class="control-filtro"
          id="filtroBusqueda"
          type="search"
          placeholder="Usuario o email…"
          autocomplete="off"
        />
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
    filtroActivo: document.getElementById("filtroActivo"),
    filtroRol: document.getElementById("filtroRol"),
    filtroBusqueda: document.getElementById("filtroBusqueda"),
    btnBorrarFiltros: document.getElementById("btnBorrarFiltros"),
  };
}

// ==========================
// LEER FILTROS
// ==========================
function leerFiltros(ui) {
  return {
    activo: ui?.filtroActivo?.value ?? "",
    rol: ui?.filtroRol?.value ?? "",
    busqueda: (ui?.filtroBusqueda?.value ?? "").trim().toLowerCase(),
  };
}

// ==========================
// FILTRAR
// ==========================
function filtrar(lista, filtros) {
  let res = Array.isArray(lista) ? [...lista] : [];

  // 1) Activo (0/1)
  if (filtros.activo !== "") {
    res = res.filter((u) => String(u.activo) === String(filtros.activo));
  }

  // 2) Rol (normaliza)
  if (filtros.rol) {
    res = res.filter((u) => String(u.rol ?? "") === filtros.rol);
  }

  // 3) Búsqueda (username/email)
  if (filtros.busqueda) {
    res = res.filter((u) => {
      const user = String(u.username ?? "").toLowerCase();
      const email = String(u.email ?? "").toLowerCase();
      return user.includes(filtros.busqueda) || email.includes(filtros.busqueda);
    });
  }

  // 4) ORDENAR SIEMPRE por id_user ascendente
  res.sort((a, b) => Number(a.id_user) - Number(b.id_user));

  return res;
}

// ==========================
// LISTENERS
// ==========================
function cargarListenersFiltros(ui, refrescar) {
  if (!ui) return;
  if (typeof refrescar !== "function") {
    throw new TypeError("cargarListenersFiltros: refrescar debe ser una función");
  }

  ui.filtroActivo?.addEventListener("change", refrescar);
  ui.filtroRol?.addEventListener("change", refrescar);
  ui.filtroBusqueda?.addEventListener("input", refrescar);

  ui.btnBorrarFiltros?.addEventListener("click", () => {
    ui.filtroActivo.value = "";
    ui.filtroRol.value = "";
    ui.filtroBusqueda.value = "";
    refrescar();
  });
}

// ==========================
// APLICAR FILTROS
// ==========================
function aplicarFiltros(ui, usuarios = [], actualizarEstadisticas, renderizarTabla) {
  if (typeof actualizarEstadisticas !== "function") {
    throw new TypeError("aplicarFiltros: actualizarEstadisticas debe ser una función");
  }
  if (typeof renderizarTabla !== "function") {
    throw new TypeError("aplicarFiltros: renderizarTabla debe ser una función");
  }

  const filtros = leerFiltros(ui);
  const filtradas = filtrar(usuarios, filtros);

  actualizarEstadisticas(filtradas);
  renderizarTabla(filtradas);
}

export { inyectarFiltros, cargarListenersFiltros, aplicarFiltros };
