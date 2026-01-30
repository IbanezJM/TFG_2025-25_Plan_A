"use strict";

import { fechaActual } from "/static/js/comun/util.js";

import { crearTarjeta } from "/static/js/comun/tarjetas.js";

import { crearPaginacion, paginarLista } from "/static/js/comun/paginacion.js";

import { getAdminUsuarios, setUsuarioActivo } from "/static/store/store_api.js";

import { inyectarFiltros, cargarListenersFiltros, aplicarFiltros,} from "/static/js/administrador/filtros_panel_administrador.js";

// =========================================================
// ESTADO GLOBAL
// =========================================================

// Datos
let usuarios = [];
let totalUsuarios = 0;     // global
let totalMostrados = 0;    // filtrados
let totalActivos = 0;      // filtrados
let totalBloqueados = 0;   // filtrados

// Paginación
const PAGE_SIZE = 10;
let paginaActual = 1;

// Filtros
let uiFiltros = null;



// =========================================================
// INICIO
// =========================================================
window.addEventListener("DOMContentLoaded", async () => {

  fechaActual();

  // 1) Datos
  await cargarDatos();

  // 2) Tarjetas
  cargarTarjetas();

  // 3) Tabla
  cargarEventosTabla();

  // 4) Filtros
  cargarFiltros();
});


// =========================================================
// DATOS
// =========================================================
// 1) Datos
async function cargarDatos() {
  usuarios = await getAdminUsuarios();
}

// =========================================================
// TARJETAS
// =========================================================
// 2.1) Cargar Tarjetas
function cargarTarjetas() {

  const contenedor = document.getElementById("rejilla-estadisticas");
  if (!contenedor) return;

  contenedor.innerHTML = "";

  totalUsuarios = usuarios.length;

  crearTarjeta({
    titulo: "Usuarios",
    descripcion: "Totales",
    color: "azul",
    icono: "pendientes",
    id: "statTotales",
    valor: totalUsuarios,
  });

  totalActivos = usuarios.filter((u) => Number(u.activo) === 1).length;
  crearTarjeta({
    titulo: "Usuarios",
    descripcion: "Activos",
    color: "verde",
    icono: "aprobadas",
    id: "statActivos",
    valor: totalActivos,
  });

  totalBloqueados = usuarios.filter((u) => Number(u.activo) === 0).length;
  crearTarjeta({
    titulo: "Usuarios",
    descripcion: "Bloqueados",
    color: "rojo",
    icono: "canceladas",
    id: "statBloqueados",
    valor: totalBloqueados,
  });
}

// 2.2) Actualizar Tarjetas
function actualizarTarjetas(totalGlobal, mostrados, activos, bloqueados) {
  const elTotales = document.getElementById("statTotales");
  const elActivos = document.getElementById("statActivos");
  const elBloqueados = document.getElementById("statBloqueados");

  // OJO: el patrón de enviadas actualiza texto, no recrea tarjetas
  if (elTotales) elTotales.textContent = String(totalGlobal);
  if (elActivos) elActivos.textContent = String(activos);
  if (elBloqueados) elBloqueados.textContent = String(bloqueados);

  // si quieres usar "mostrados" en algún sitio extra, aquí lo tienes (opcional)
  totalMostrados = mostrados;
}


// =========================================================
// TABLA
// =========================================================
// 3) Tabla
function cargarEventosTabla() {
    const cuerpoTabla = document.getElementById("cuerpoTabla");
  if (!cuerpoTabla) return;

  cuerpoTabla.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-accion-estado]");
    if (!btn) return;

    const idUser = Number(btn.getAttribute("data-id"));
    const activo = Number(btn.getAttribute("data-activo")); // 0 bloquear, 1 activar

    try {
      btn.disabled = true; // anti doble click

      await setUsuarioActivo(idUser, activo);

      await cargarDatos();     // refresca desde backend
      paginaActual = 1;
      refrescarTabla();        // respeta filtros activos
    } catch (err) {
      console.error(err);
      alert(err?.message || "Error al cambiar estado del usuario");
    } finally {
      btn.disabled = false;
    }
  });
}



// 3.1) Crear Filas Tabla
function crearFilasTabla(lista = []) {
    const cuerpoTabla = document.getElementById("cuerpoTabla");
  if (!cuerpoTabla) return;
  const estadoVacio = document.getElementById("estadoVacio");

  if (!Array.isArray(lista) || lista.length === 0) {
    cuerpoTabla.innerHTML = "";

    if (estadoVacio) estadoVacio.hidden = false;
    return;
  }

  if (estadoVacio) estadoVacio.hidden = true;

  cuerpoTabla.innerHTML = lista
    .map((u) => {
      const activo = Number(u.activo) === 1;

      return `
        <tr data-id="${u.id_user}">
          <td data-etiqueta="ID">${u.id_user}</td>
          <td data-etiqueta="Usuario">${u.username ?? ""}</td>
          <td data-etiqueta="Email">${u.email ?? ""}</td>
          <td data-etiqueta="Rol">${u.rol ?? ""}</td>

          <td data-etiqueta="Estado">
            <span class="badge-estado ${activo ? "badge-estado--aprobado" : "badge-estado--rechazado"}">
              <span class="punto-estado"></span>
              ${activo ? "Activo" : "Bloqueado"}
            </span>
          </td>

          <td data-etiqueta="Acciones" class="col-acciones">
            <div class="celda-acciones">
              ${renderBotonEstado(u)}
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

// 3.2) Renderizar Botón Estado
function renderBotonEstado(usuario) {
  const esActivo = Number(usuario.activo) === 1;

  if (esActivo) {
    return `
      <button
        type="button"
        class="btn-tabla btn-tabla--cancelar"
        data-accion-estado
        data-id="${usuario.id_user}"
        data-activo="0"
      >
        Bloquear
      </button>
    `;
  }

  return `
    <button
      type="button"
      class="btn-tabla btn-tabla--ver"
      data-accion-estado
      data-id="${usuario.id_user}"
      data-activo="1"
    >
      Desbloquear
    </button>
  `;
}

// =========================================================
// FILTROS
// =========================================================
// 4.1) Filtros
function cargarFiltros() {
  uiFiltros = inyectarFiltros();

  cargarListenersFiltros(uiFiltros, () => {
    paginaActual = 1;
    refrescarTabla();
  });

  refrescarTabla();
}


// =========================================================
// PAGINACIÓN
// =========================================================

// 4.2) Filtros
function refrescarTabla() {

   const contadorResultados = document.getElementById("contadorResultados");
  aplicarFiltros(
    uiFiltros,
    usuarios,
    (listaFiltrada) => {

      const activos = listaFiltrada.filter((u) => Number(u.activo) === 1).length;
      const bloqueados = listaFiltrada.filter((u) => Number(u.activo) === 0).length;

      actualizarTarjetas(
        usuarios.length,        // global
        listaFiltrada.length,   // mostradas
        activos,                // activas (filtradas)
        bloqueados              // bloqueadas (filtradas)
      );

      if (contadorResultados) {
        contadorResultados.textContent = `${listaFiltrada.length} resultado${listaFiltrada.length !== 1 ? "s" : ""}`;
      }
    },
    (listaFiltrada) => {
      renderizarTablaPaginada(listaFiltrada);
    }
  );
}

// 4.3) Renderizar Tabla Paginada
function renderizarTablaPaginada(listaFiltrada = []) {
  const paginaItems = paginarLista(listaFiltrada, paginaActual, PAGE_SIZE);
  const contenedorPaginacion = document.getElementById("contenedor-paginacion");

  crearFilasTabla(paginaItems);

  crearPaginacion({
    contenedor: contenedorPaginacion,
    totalItems: listaFiltrada.length,
    paginaActual,
    pageSize: PAGE_SIZE,
    onPageChange: (nuevaPagina) => {
      paginaActual = nuevaPagina;
      renderizarTablaPaginada(listaFiltrada);
    },
  });
}



