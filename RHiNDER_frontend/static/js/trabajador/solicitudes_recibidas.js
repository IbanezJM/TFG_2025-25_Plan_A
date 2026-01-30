"use strict";

import {claseTurno} from "/static/js/comun/constantes.js";

import {fechaActual, formatearFechaES, soloFecha} from "/static/js/comun/util.js";

import {getUsuarioActual, getSolicitudesRecibidas, marcarSolicitudesRecibidasComoVistas, getSolicitudesRecibidasExpiradasCount, avisarSiNuevasExpiradas} from "/static/store/store_api.js";

import {crearTarjeta} from "/static/js/comun/tarjetas.js";

import {inyectarFiltros, cargarListenersFiltros, aplicarFiltros} from "/static/js/trabajador/filtros_recibidas.js";

import {crearPaginacion, paginarLista} from "/static/js/comun/paginacion.js";

import {cargarModalMiniCalendario} from "./mini_calendario_modal.js";

import {refrescarNav} from "./nav_trabajador.js";


// =========================================================
// ESTADO GLOBAL
// =========================================================

// Datos
let solicitudesRecibidas = [];
let solicitudesRespondidas = [];
let solicitudesExpiradas = [];
let solicitudesPendientes = [];

// Variables globales
let solicitudActiva = null;
let seleccionActiva = null; // { iso, nomenclatura, id_turno_trabajador, ... }

// Paginación
let paginaActual = 1;
const PAGE_SIZE = 10;

// Filtros
let uiFiltros = null;


// =========================================================
// INICIO
// =========================================================
document.addEventListener("DOMContentLoaded", async () => {
    fechaActual();

    // 1) Cargar datos
    await cargarDatos();

    // 2) Comprobar solicitudes expiradas
    await avisarExpiradasRecibidas();

    // 3) Comprobar respuestas expiradas
    await avisarRespuestasExpiradas();

    // 3) Tarjetas
    await cargarTarjetas();

    // 4) Tabla
    cargarEventosTabla();

    // 5) Filtros
    cargarFiltros();

});

// 1) Cargar datos
async function cargarDatos() {

    // Solicitudes Recibidas
    solicitudesRecibidas = await getSolicitudesRecibidas();
    if (!solicitudesRecibidas) return; //

    solicitudesPendientes = solicitudesRecibidas.filter((s) => Number(s.respondida) === 0).length;
    solicitudesExpiradas =  await getSolicitudesRecibidasExpiradasCount(true);
    solicitudesRespondidas = solicitudesRecibidas.filter((s) => Number(s.respondida) === 1);

    // Marcar como vistas las que no lo estén
    await marcarSolicitudesRecibidasComoVistas(solicitudesRecibidas);

    // 3) Refrescar nav FORZANDO recarga (sin refrescar página)
    await refrescarNav(true);

}
// =========================================================
// TARJETAS
// =========================================================
// 2) Tarjetas
async function cargarTarjetas() {

    const contenedor = document.getElementById("tarjetas-estadisticas");
    if (contenedor) contenedor.innerHTML = "";

    crearTarjeta({
        titulo: "Pendientes",
        descripcion: "solicitudes pendientes de respuesta",
        color: "azul",
        icono: "pendientes",
        id: "statPendientes",
        valor: solicitudesPendientes,
    });

    crearTarjeta({
        titulo: "Enviadas",
        descripcion: "Solicitudes respondidas",
        color: "verde",
        icono: "enviadas",
        id: "statEnviadas",
        valor: solicitudesRespondidas.length,
    });

    crearTarjeta({
        titulo: "Expiradas",
        descripcion: "Solicitudes expiradas",
        color: "rojo",
        icono: "canceladas",
        id: "statExpiradas",
        valor: solicitudesExpiradas,
    });
}

// 2.1) Estadísticas
function actualizarEstadisticas(lista = []) {
  const statPendientesEl = document.getElementById("statPendientes");
  const statRespondidasEl = document.getElementById("statEnviadas");
  const statExpiradasEl = document.getElementById("statExpiradas");

  const pendientes = lista.filter(s => Number(s.respondida) === 0).length;
  const respondidas = lista.filter(s => Number(s.respondida) === 1).length;

  if (statPendientesEl) statPendientesEl.textContent = String(pendientes);
  if (statRespondidasEl) statRespondidasEl.textContent = String(respondidas);
  if (statExpiradasEl) statExpiradasEl.textContent = String(solicitudesExpiradas ?? 0);
}
// =========================================================
// TABLA
// =========================================================

// 3.1) Crear Filas Tabla
function crearFilasTabla(lista = []) {

    const cuerpoTabla = document.getElementById("cuerpoTabla");
    const estadoVacio = document.getElementById("estadoVacio");
    const contadorResultados = document.getElementById("contadorResultados");
    if (!cuerpoTabla) return;

    // a) vacío
    if (lista.length === 0) {
        cuerpoTabla.innerHTML = "";
        if (estadoVacio) estadoVacio.style.display = "block";
        if (contadorResultados) contadorResultados.textContent = "0 resultados";
        return;
    }

    if (estadoVacio) estadoVacio.style.display = "none";
    if (contadorResultados) {
        contadorResultados.textContent = `${lista.length} resultado${lista.length !== 1 ? "s" : ""}`;
    }

    cuerpoTabla.innerHTML = lista
        .map((s) => {
            const fechaTurnoISO = soloFecha(s.fecha_turno);
            const fechaTurnoES = formatearFechaES(fechaTurnoISO);
            const mostrarBotonResponder = Number(s.respondida) === 0;

            return `
        <tr data-id="${s.id_solicitud}">
          <td class="celda-creada" data-etiqueta="Id Solicitud">#${s.id_solicitud}</td>
          <td data-etiqueta="Emisor">${s.emisor_username ?? "-"}</td>
          <td data-etiqueta="Turno ofrecido">
            <div class="celda-turno">
              <span class="badge-turno ${claseTurno(s.nomenclatura)}">${s.nomenclatura}</span>
              <span class="turno-nombre">${s.turno}</span>
            </div>
          </td>
          <td class="celda-fecha" data-etiqueta="Fecha">${fechaTurnoES}</td>
          <td data-etiqueta="Acciones">
            <div class="celda-acciones">
              ${
                mostrarBotonResponder
                    ? `
                    <button type="button"
                      class="btn-tabla btn-tabla--ver"
                      data-accion="responder"
                      data-id="${s.id_solicitud}">
                      Responder
                    </button>
                  `
                    : `
                    <span class="badge-estado badge-estado--pendiente">
                      <span class="punto-estado"></span>
                      PENDIENTE
                    </span>
                  `
            }
            </div>
          </td>
        </tr>
      `;
        })
        .join("");
}

// 3.1) Cargar Eventos Tabla
function cargarEventosTabla() {
        const cuerpoTabla = document.getElementById("cuerpoTabla");
    if (!cuerpoTabla) return;

    // EVENTO
    cuerpoTabla.addEventListener("click", (e) => {

        // Obtener datos de la solicitud que se va a responder
        const btn = e.target.closest("button[data-accion]");
        if (!btn) return;

        if (btn.getAttribute("data-accion") !== "responder") return;

        const idSolicitud = Number(btn.getAttribute("data-id"));

        const solicitud = solicitudesRecibidas.find((s) => s.id_solicitud === idSolicitud);

        if (!solicitud) return;

        // Guardar estado global
        solicitudActiva = solicitud;
        seleccionActiva = null;

        console.log("Solicitud activa:", solicitudActiva);

        // cargar MiniCalendario
        cargarModalMiniCalendario(solicitudActiva);
    });
}


// =========================================================
// FILTROS
// =========================================================
// 4.1) Cargar filtros
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
// 4.2) Refrescar tabla
function refrescarTabla() {
    aplicarFiltros(uiFiltros, solicitudesRecibidas, actualizarEstadisticas, renderizarTablaPaginada);
}

// 4.3) Renderizar tabla paginada
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


// =========================================================
// HELPERS
// =========================================================

async function avisarExpiradasRecibidas() {
  try {
    const userPayload = await getUsuarioActual(true);
    const userId = userPayload?.id_user ?? null;
    if (!userId) return;

    const totalExpiradas = await getSolicitudesRecibidasExpiradasCount(true);

    avisarSiNuevasExpiradas(
      userId,
      "solicitudes_recibidas",
      totalExpiradas,
      `⚠️ Tienes ${totalExpiradas} solicitudes recibidas expiradas.`
    );
  } catch (e) {
    console.warn("[solicitudes_recibidas] no se pudo comprobar expiradas:", e);
  }
}

async function avisarRespuestasExpiradas() {
  try {
    const user = await getUsuarioActual(true);
    const userId = user?.id_user;
    if (!userId) return;

    const token = document.cookie.split("; ").find(c => c.startsWith("JWT="))?.split("=")[1];
    if (!token) return;

    const res = await fetch("http://127.0.0.1:5001/respuestas/expiradas/avisar", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      console.warn("expiradas/avisar HTTP", res.status);
      return;
    }

    const total = Number(await res.json()) || 0;

    avisarSiNuevasExpiradas(
      userId,
      "respuestas",
      total,
      `⚠️ Tienes ${total} respuestas expiradas. Puedes volver a responder.`
    );
  } catch (e) {
    console.warn("[respuestas] no se pudo comprobar expiradas:", e);
  }
}




