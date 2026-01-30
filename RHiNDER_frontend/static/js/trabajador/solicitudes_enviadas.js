"use strict";

import {fechaActual, formatearFechaES, soloFecha} from "/static/js/comun/util.js";

import {getUsuarioActual, getSolicitudesEnviadas, getRespuestasRecibidas,  crearMatch, cancelarSolicitudEnviada,  marcarRespuestasSolicitudComoVistas, avisarSiNuevasExpiradas, getSolicitudesEnviadasExpiradasCount, getRespuestasExpiradasAviso,} from "/static/store/store_api.js";

import {crearTarjeta} from "/static/js/comun/tarjetas.js";

import {inyectarFiltros, cargarListenersFiltros, aplicarFiltros,} from "/static/js/trabajador/filtros_enviadas.js";

import {crearPaginacion, paginarLista} from "/static/js/comun/paginacion.js";

import {claseEstado, claseTurno} from "/static/js/comun/constantes.js";

import {abrirModal, cerrarModal, manejarClickFondoModal} from "/static/js/comun/modales.js";

import {refrescarNav} from "/static/js/trabajador/nav_trabajador.js";

// =========================================================
// ESTADO GLOBAL
// =========================================================

// Datos
let solicitudes = [];
let pendientes = [];
let respuestas = [];
let respuestasPorSolicitud = {}; // { [id_solicitud]: [respuestas...] }

// Tarjetas
let totalSolicitudes = 0;   // global
let totalContestadas = 0;   // filtradas (ganadora)

// Variables globales
let accionPendiente = null; // "cancelar" | "aceptar"
let idSolicitudPendiente = null;
let idRespuestaPendiente = null;
let botonOrigen = null;

// Paginación
const PAGE_SIZE = 10;
let paginaActual = 1;

// Filtros
let uiFiltros = null;


// =========================================================
// INICIO
// =========================================================
document.addEventListener("DOMContentLoaded", async () => {

    fechaActual();

    // 1) Datos
    await cargarDatos();

    // 2) Aviso solicitudes recibidas expiradas
    await avisarExpiradasEnviadas();

    // Aviso respuestas expiradas
    await avisarRespuestasExpiradas();

    // 3) Tarjetas
    cargarTarjetas();

    // 4) Tabla
    cargarEventosTabla();

    // 5) Filtros
    cargarFiltros();

    // 6) Modales
    cargarModales();
});


// =========================================================
// DATOS
// =========================================================
// 1) Cargar datos
async function cargarDatos() {
    solicitudes = await getSolicitudesEnviadas();
    respuestas = await getRespuestasRecibidas();
    respuestasPorSolicitud = agruparRespuestasPorSolicitud(respuestas);
}

// =========================================================
// TARJETAS
// =========================================================
// 2.1 Cargar tarjetas
function cargarTarjetas() {
    const contenedor = document.querySelector(".rejilla-estadisticas");
    if (!contenedor) return;
    contenedor.innerHTML = "";


    totalSolicitudes = solicitudes.length;
    crearTarjeta({
        titulo: "Solicitudes",
        descripcion: "Totales",
        color: "morado",
        icono: "enviadas",
        id: "statRespondidas",
        valor: totalSolicitudes,
    });


    pendientes = solicitudes.filter((s) => s.estado === "PENDIENTE").length;
    crearTarjeta({
        titulo: "Solicitudes",
        descripcion: "Pendientes de respuesta",
        color: "azul",
        icono: "pendientes",
        id: "statPendientes",
        valor: pendientes,
    });


    totalContestadas = contarContestadas(solicitudes);
    crearTarjeta({
        titulo: "Solicitudes",
        descripcion: "Contestadas",
        color: "rojo",
        icono: "recibidas",
        id: "statContestadas",
        valor: totalContestadas,
    });
}

/// 2.2 Actualizar tarjetas
function actualizarEstadisticas(totalGlobal, mostradas, contestadas) {

    const elGlobal = document.getElementById("statPendientes");
    const elMostradas = document.getElementById("statRespondidas");
    const elContestadas = document.getElementById("statContestadas");

    if (elGlobal) elGlobal.textContent = totalGlobal;
    if (elMostradas) elMostradas.textContent = mostradas;
    if (elContestadas) elContestadas.textContent = contestadas;
}

// =========================================================
// TABLA
// =========================================================


// 3.1) Crear filas de tabla
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
        .map((s) => {
            const idSolicitud = Number(s.id_solicitud);
            const fechaISO = soloFecha(s.fecha_turno);
            const fechaES = formatearFechaES(fechaISO);

            const estadoUpper = String(s.estado || "").toUpperCase();
            const hayRespuestas = (respuestasPorSolicitud[idSolicitud] || []).length > 0;
            const puedeCancelar = estadoUpper === "PENDIENTE" && !hayRespuestas;

            return `
        <tr data-id="${idSolicitud}">
          <td data-etiqueta="Id">#${idSolicitud}</td>

          <td data-etiqueta="Turno ofrecido">
            <div class="celda-turno">
              <span class="badge-turno ${claseTurno(s.nomenclatura)}">${s.nomenclatura}</span>
              <span class="turno-nombre">${s.turno}</span>
            </div>
          </td>

          <td class="celda-fecha" data-etiqueta="Fecha">${fechaES || "---"}</td>

          <td data-etiqueta="Estado">
          
            <span class="badge-estado ${claseEstado(s.estado)}">
            
              <span class="punto-estado"></span>
              ${s.estado}
            </span>
          </td>

          <td data-etiqueta="Acciones">
            <div class="celda-acciones">
              ${
                hayRespuestas
                    ? `
                    <button class="btn-tabla btn-tabla--ver"
                      data-accion="ver-respuestas" data-id="${idSolicitud}">
                      Ver respuestas
                    </button>
                  `
                    : ""
            }

              ${
                puedeCancelar
                    ? `
                    <button class="btn-tabla btn-tabla--cancelar"
                      data-accion="cancelar" data-id="${idSolicitud}">
                      Cancelar
                    </button>
                  `
                    : ""
            }
            </div>
          </td>
        </tr>
      `;
        })
        .join("");
}


// 3.2) Cargar eventos tabla
function cargarEventosTabla() {

    const cuerpoTabla = document.getElementById("cuerpoTabla");
    if (!cuerpoTabla) return;

    const modalConfirmar = document.getElementById("modal-confirmar");
    const confirmSummary = modalConfirmar?.querySelector("#confirm-summary") || null;

    const btnConfirmarAccion = modalConfirmar?.querySelector("#btn-confirmar-confirmar") || null;

    cuerpoTabla.addEventListener("click", async (e) => {
        const btn = e.target.closest("button[data-accion]");
        if (!btn) return;

        const accion = btn.getAttribute("data-accion");
        const id = Number(btn.getAttribute("data-id"));
        if (!id) return;

        if (accion === "cancelar") {
            accionPendiente = "cancelar";
            idSolicitudPendiente = id;
            idRespuestaPendiente = null;
            botonOrigen = btn;

            if (confirmSummary) {
                confirmSummary.textContent = "¿Confirmas cancelar esta solicitud? Esta acción no se puede deshacer.";
            }

            abrirModal("modal-confirmar");
            btnConfirmarAccion?.focus();
            return;
        }

        if (accion === "ver-respuestas") {
            await abrirModalRespuestas(id);
        }
    });
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
// PAGINACION
// =========================================================

// 4.2) Refrescar tabla
function refrescarTabla() {

    const contadorResultados = document.getElementById("contadorResultados");

    aplicarFiltros(
        uiFiltros,
        solicitudes,
        (listaFiltrada) => {
            // tarjetas + contador
            actualizarEstadisticas(
                solicitudes.length,                // global (igual que matches.length)
                listaFiltrada.length,              // mostradas (filtradas)
                contarContestadas(listaFiltrada)   // contestadas (filtradas)
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


// 4.3) Renderizar tabla paginada
function renderizarTablaPaginada(listaFiltrada = []) {

    const contenedorPaginacion = document.getElementById("contenedor-paginacion");

    const paginaItems = paginarLista(listaFiltrada, paginaActual, PAGE_SIZE);

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
// MODALES
// =========================================================

// 5) Cargar modales
function cargarModales() {

    configurarCierrePorFondo();
    cargarListenersModales();
}

// 5.1) Cierre por fondo
function configurarCierrePorFondo() {
    const modalConfirmar = document.getElementById("modal-confirmar");
    const modalExito = document.getElementById("modal-exito");
    const modalRespuestas = document.getElementById("modal-respuestas");
    modalConfirmar?.addEventListener("click", (e) => manejarClickFondoModal(e, "modal-confirmar"));
    modalExito?.addEventListener("click", (e) => manejarClickFondoModal(e, "modal-exito"));
    modalRespuestas?.addEventListener("click", (e) => manejarClickFondoModal(e, "modal-respuestas"));
}

// 5.2) Carga listeners de modales
function cargarListenersModales() {

    const modalConfirmar = document.getElementById("modal-confirmar");
    const btnCerrarConfirmar = document.getElementById("btn-cerrar-confirmar");
    const btnOkExito = document.getElementById("btn-exito-volver");
    const btnCerrarRespuestas = document.getElementById("btn-cerrar-respuestas");
    const btnConfirmarAccion = modalConfirmar?.querySelector("#btn-confirmar-confirmar") || null;

    btnCerrarRespuestas?.addEventListener("click", () => cerrarModal("modal-respuestas"));
    btnCerrarConfirmar?.addEventListener("click", () => cerrarModal("modal-confirmar"));
    btnOkExito?.addEventListener("click", () => cerrarTodosModales());

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") cerrarTodosModales();
    });

    btnConfirmarAccion?.addEventListener("click", ejecutarAccionConfirmada);

    prepararEventosModalRespuestas();
}


// 5.2) Cerrar todos los  modales
function cerrarTodosModales() {
    cerrarModal("modal-respuestas");
    cerrarModal("modal-confirmar");
    cerrarModal("modal-exito");
}


// 5.3) Abrir resultado
function abrirResultado(texto) {

    const modalExito = document.getElementById("modal-exito");
    const tituloExito = modalExito?.querySelector("#titulo-exito") || null;
    const btnOkExito = document.getElementById("btn-exito-volver");

    if (tituloExito) tituloExito.textContent = texto;
    abrirModal("modal-exito");
    btnOkExito?.focus();
}

// -------------------------
// MODAL 1: Respuestas
// -------------------------

//6.1) Eventos modal respuestas
function prepararEventosModalRespuestas() {
    const modalRespuestas = document.getElementById("modal-respuestas");
    const modalConfirmar = document.getElementById("modal-confirmar");
    const confirmSummary = modalConfirmar?.querySelector("#confirm-summary") || null;
    const btnConfirmarAccion = modalConfirmar?.querySelector("#btn-confirmar-confirmar") || null;

    const modalRespuestasContent = modalRespuestas?.querySelector(".modal-content") || null;
    if (!modalRespuestasContent) return;

    modalRespuestasContent.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-accion]");
        if (!btn) return;

        const accion = btn.getAttribute("data-accion");
        if (accion !== "aceptar-respuesta") return;

        const idRespuesta = Number(btn.getAttribute("data-id-respuesta"));
        const idSolicitud = Number(btn.getAttribute("data-id-solicitud"));
        if (!idRespuesta || !idSolicitud) return;

        accionPendiente = "aceptar";
        idSolicitudPendiente = idSolicitud;
        idRespuestaPendiente = idRespuesta;
        botonOrigen = btn;

        if (confirmSummary) {
            confirmSummary.textContent = "¿Confirmas aceptar esta respuesta? Después no se podrá cambiar.";
        }

        abrirModal("modal-confirmar");
        btnConfirmarAccion?.focus();
    });
}

// 6.2) Abrir modal respuestas
async function abrirModalRespuestas(idSolicitud) {

    await pintarRespuestasDeSolicitud(idSolicitud);

    abrirModal("modal-respuestas");

    await marcarRespuestasSolicitudComoVistas(idSolicitud);

    refrescarNav();
}


// 6.3) Pintar respuestas de solicitud
function pintarRespuestasDeSolicitud(idSolicitud) {
    const contenedorRespuestas = document.getElementById("contenedorRespuestas");
    if (!contenedorRespuestas) return;

    const lista = respuestasPorSolicitud[idSolicitud] || [];

    if (!lista.length) {
        contenedorRespuestas.innerHTML = `<div class="estado-vacio">No hay respuestas todavía.</div>`;
        return;
    }

    const ganadoras = lista.filter((r) => Number(r.es_ganadora) === 1);
    const listaAMostrar = ganadoras.length ? ganadoras : lista;

    contenedorRespuestas.innerHTML = listaAMostrar
        .map((r) => {
            const fechaISO = soloFecha(r.fecha_turno_receptor);
            const fechaES = formatearFechaES(fechaISO);

            const esGanadora = Number(r.es_ganadora) === 1;

            const btnAccion =
                ganadoras.length === 0 && !esGanadora
                    ? `
            <button class="btn-tabla btn-tabla--ver"
              data-accion="aceptar-respuesta"
              data-id-respuesta="${r.id_respuesta}"
              data-id-solicitud="${r.id_solicitud}">
              Aceptar
            </button>
          `
                    : "";

            return `
        <div class="tarjeta-respuesta">
          <div class="info-respuesta">
            <div class="info-trabajador">
              <div class="avatar-respuesta">
                ${String(r.receptor_username || "?").slice(0, 2).toUpperCase()}
              </div>
              <div class="nombre-respuesta">${r.receptor_username || "-"}</div>
            </div>

            <div class="turno-respuesta">
              <span class="badge-turno ${claseTurno(r.nomenclatura_receptor)}">${r.nomenclatura_receptor}</span>
              <span>${r.turno_receptor} · ${fechaES}</span>
            </div>

            <div class="acciones-respuesta">${btnAccion}</div>
          </div>
        </div>
      `;
        })
        .join("");
}

// 6.4) Ejecutar Acción confirmada
async function ejecutarAccionConfirmada() {
    if (!accionPendiente || !idSolicitudPendiente) return;
    const modalConfirmar = document.getElementById("modal-confirmar");
    const btnConfirmarAccion = modalConfirmar?.querySelector("#btn-confirmar-confirmar") || null;

    const idSol = Number(idSolicitudPendiente);

    try {
        if (btnConfirmarAccion) btnConfirmarAccion.disabled = true;
        if (botonOrigen) botonOrigen.disabled = true;

        cerrarModal("modal-confirmar");

        if (accionPendiente === "cancelar") {
            await cancelarSolicitudEnviada(idSol);
            abrirResultado(`Solicitud #${idSol} cancelada correctamente.`);

        } else if (accionPendiente === "aceptar") {
            const idResp = Number(idRespuestaPendiente);
            if (!idResp) return;

            await crearMatch(idSol, idResp);
            abrirResultado(`Respuesta aceptada en la solicitud #${idSol}.`);
            //abrirModalRespuestas(idSol);

        }

        await cargarDatos();
        await avisarExpiradasEnviadas();
        paginaActual = 1;
        refrescarTabla();
    } catch (err) {
        console.error("[solicitudes_enviadas] error acción:", err);
        abrirResultado(err?.message || "Ha ocurrido un error.");
    } finally {
        if (btnConfirmarAccion) btnConfirmarAccion.disabled = false;
        if (botonOrigen) botonOrigen.disabled = false;

        accionPendiente = null;
        idSolicitudPendiente = null;
        idRespuestaPendiente = null;
        botonOrigen = null;

    }
}


// =========================================================
// HELPERS
// =========================================================

// Agrupar respuestas por solicitud
function agruparRespuestasPorSolicitud(lista) {
    const mapa = {};
    (Array.isArray(lista) ? lista : []).forEach((r) => {
        const id = Number(r.id_solicitud);
        if (!id) return;
        if (!mapa[id]) mapa[id] = [];
        mapa[id].push(r);
    });
    return mapa;
}

// Contar respuestas contestadas
function contarContestadas(listaSolicitudes = []) {
    return (Array.isArray(listaSolicitudes) ? listaSolicitudes : []).filter((s) => {
        const id = Number(s.id_solicitud);
        return (respuestasPorSolicitud[id] || []).some((r) => Number(r.es_ganadora) === 1);
    }).length;
}


// Avisar si hay solicitudes expiradas
async function avisarExpiradasEnviadas() {
  try {
    const userPayload = await getUsuarioActual(true);
    const userId = userPayload?.id_user ?? null;
    if (!userId) return;

    // ✅ Ahora viene del backend (devuelve un número)
    const totalExpiradas = await getSolicitudesEnviadasExpiradasCount(true);

    console.log("[solicitudes_enviadas] totalExpiradas (backend):", totalExpiradas);

    avisarSiNuevasExpiradas(
      userId,
      "solicitudes_enviadas",
      totalExpiradas,
      `⚠️ Tienes ${totalExpiradas} solicitudes enviadas expiradas.`
    );
  } catch (e) {
    console.warn("[solicitudes_enviadas] no se pudo comprobar expiradas:", e);
  }
}

// Avisar si hay respuestas expiradas
async function avisarRespuestasExpiradas() {
  try {
    const userPayload = await getUsuarioActual(true);
    const userId = userPayload?.id_user ?? null;
    if (!userId) return;

    const total = await getRespuestasExpiradasAviso(true);

    avisarSiNuevasExpiradas(
      userId,
      "respuestas_expiradas",
      total,
      `⚠️ Tienes ${total} respuestas expiradas (tu turno ofrecido ya pasó).`
    );
  } catch (e) {
    console.warn("[respuestas_expiradas] no se pudo comprobar:", e);
  }
}

