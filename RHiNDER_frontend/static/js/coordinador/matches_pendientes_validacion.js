"use strict";

import {fechaActual, formatearFechaES, soloFecha} from "/static/js/comun/util.js";

import {crearPaginacion, paginarLista} from "/static/js/comun/paginacion.js";

import { getMatchesPendientesValidacion, validarMatch,  denegarMatch,  marcarMatchesComoVistos,} from "/static/store/store_api.js";

import {crearTarjeta} from "/static/js/comun/tarjetas.js";

import { inyectarFiltros, cargarListenersFiltros,   aplicarFiltros,} from "/static/js/coordinador/filtros_matches_pendientes_validacion.js";

import {abrirModal, cerrarModal, manejarClickFondoModal} from "/static/js/comun/modales.js";

import {refrescarNav} from "/static/js/coordinador/nav_coordinador.js";

// =========================================================
// ESTADO GLOBAL
// =========================================================

// Datos
let matches = [];
let totalPendientes;
let totalMostrados;

// Variables globales
let accionPendiente = null; // "validar" | "denegar"
let idMatchPendiente = null;
let botonOrigen = null;

// Filtros
let uiFiltros = null;

// Paginación
const PAGE_SIZE = 10;
let paginaActual = 1;


// =========================================================
// INICIO
// =========================================================
document.addEventListener("DOMContentLoaded", async () => {

    fechaActual();

    // 1) Datos
    await cargarDatos();

    // 2) Tarjetas
    cargarTarjetas();

    // 3) Eventos tabla
    cargarEventosTabla();

    // 4) Filtros
    cargarFiltros();

    // 5) Modales
    cargarModales();

});

// =========================================================
// DATOS
// =========================================================
// 1) Datos
async function cargarDatos() {
    matches = await getMatchesPendientesValidacion(true);

    console.log("[matches_pendientes_validacion] matches:", matches);

    await marcarMatchesComoVistos(matches);

    await refrescarNav();
}

// =========================================================
// TARJETAS
// =========================================================
// 2) Tarjetas
function cargarTarjetas() {
    const contenedor = document.querySelector(".rejilla-estadisticas");
    if (!contenedor) return;
    contenedor.innerHTML = "";

    totalMostrados = matches.length;
    crearTarjeta({
        titulo: "Matches",
        descripcion: "Pendientes totales",
        color: "azul",
        icono: "pendientes",
        id: "statPendientes",
        valor: totalMostrados,
    });

    totalPendientes = matches.filter((match) => match.estado_match === "PENDIENTE_VALIDACION").length;
    crearTarjeta({
        titulo: "Matches",
        descripcion: "Total mostrados",
        color: "morado",
        icono: "enviadas",
        id: "statMostrados",
        valor: totalPendientes,
    });
}

// 2.1) Estadísticas
function actualizarTarjetas(totalPendientes, mostrados) {
    const elPendientes = document.getElementById("statPendientes");
    const elMostrados = document.getElementById("statMostrados");

    if (elPendientes) elPendientes.textContent = String(totalPendientes);
    if (elMostrados) elMostrados.textContent = String(mostrados);
}

// =========================================================
// TABLA
// =========================================================

 // 3.1) Crear Filas tabla
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
        .map((match) => {
            const fechaMatchES = formatearFechaES(soloFecha(match.fecha_match));

            return `
        <tr data-id="${match.id_match ?? ""}">
          <td data-etiqueta="Id Match">#${match.id_match ?? "---"}</td>

          <td data-etiqueta="Fecha match" class="celda-fecha">
            ${fechaMatchES || "---"}
          </td>

          <td data-etiqueta="Emisor" class="celda-usuario">
            ${match.emisor_username ?? "---"}
          </td>

          <td data-etiqueta="Receptor" class="celda-usuario">
            ${match.receptor_username ?? "---"}
          </td>

          <td data-etiqueta="Intercambio">
            ${crearIntercambioHTML(match)}
          </td>

          <td data-etiqueta="Acciones">
            <div class="celda-acciones">
              <button class="btn-tabla btn-tabla--ver" data-accion="validar" data-id="${match.id_match}">
                Validar
              </button>
              <button class="btn-tabla btn-tabla--cancelar" data-accion="denegar" data-id="${match.id_match}">
                Denegar
              </button>
            </div>
          </td>
        </tr>
      `;
        })
        .join("");
}

 // 3.2) Eventos tabla
function cargarEventosTabla() {

    const cuerpoTabla = document.getElementById("cuerpoTabla");
    if (!cuerpoTabla) return;


    const modalConfirmarTitulo = document.getElementById("modalConfirmarTitulo");
    const modalConfirmarTexto = document.getElementById("modalConfirmarTexto");
    const btnConfirmarAccion = document.getElementById("btnConfirmarAccion");


    // Delegación de eventos
    cuerpoTabla.addEventListener("click", (e) => {

        const btn = e.target.closest("button[data-accion]");
        if (!btn) return;

        const accion = btn.getAttribute("data-accion"); // validar | denegar
        const id = Number(btn.getAttribute("data-id"));
        if (!id) return;

        // guardar acción pendiente para ejecutar luego
        accionPendiente = accion;
        idMatchPendiente = id;
        botonOrigen = btn;

        if (accion === "denegar") {
            modalConfirmarTitulo.textContent = "Confirmar denegación";
            modalConfirmarTexto.textContent = `¿Seguro que quieres DENEGAR el match #${id}?`;
            btnConfirmarAccion.classList.remove("btn--primary");
            btnConfirmarAccion.classList.add("btn--danger");
            btnConfirmarAccion.textContent = "Denegar";
        }

        if (accion === "validar") {
            modalConfirmarTitulo.textContent = "Confirmar validación";
            modalConfirmarTexto.textContent = `¿Seguro que quieres VALIDAR el match #${id}?`;
            btnConfirmarAccion.classList.remove("btn--danger");
            btnConfirmarAccion.classList.add("btn--primary");
            btnConfirmarAccion.textContent = "Validar";
        }

        // Abrir modal por ID (tu modales.js trabaja por ID)
        abrirModal("modal-confirmar-match");
        btnConfirmarAccion?.focus();
    });
}


// =========================================================
// FILTROS
// =========================================================

// 4.1) Cargar filtros
function cargarFiltros() {
    // ✅ inyecta HTML adaptado a matches
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

// 4.2) Paginación
function refrescarTabla() {
    const contadorResultados = document.getElementById("contadorResultados");

    aplicarFiltros(
        uiFiltros,
        matches,
        (listaFiltrada) => {
            // tarjetas + contador
            actualizarTarjetas(matches.length, listaFiltrada.length);

            if (contadorResultados) {
                contadorResultados.textContent = `${listaFiltrada.length} resultado${
                    listaFiltrada.length !== 1 ? "s" : ""
                }`;
            }
        },
        (listaFiltrada) => {
            renderizarTablaPaginada(listaFiltrada);
        }
    );
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
// MODALES
// =========================================================

// 5) Modales
function cargarModales() {
    configurarCierrePorFondo();
    cargarListenersModales();
}

// 5.1 Cierre por fondo (overlay)
function configurarCierrePorFondo() {

    const modalExito = document.getElementById("modal-resultado-match");
    const modalConfirmar = document.getElementById("modal-confirmar-match");

    modalConfirmar?.addEventListener("click", (e) =>
        manejarClickFondoModal(e, "modal-confirmar-match")
    );

    modalExito?.addEventListener("click", (e) =>
        manejarClickFondoModal(e, "modal-resultado-match")
    );
}

// 5.2) Cargar listeners para modales
function cargarListenersModales() {

    // DOM
    const btnCerrarConfirmar = document.getElementById("btnCerrarConfirmar");
    const btnCancelarConfirmar = document.getElementById("btnCancelarConfirmar");
    const btnConfirmarAccion = document.getElementById("btnConfirmarAccion");
    const btnCerrarResultado = document.getElementById("btnCerrarResultado");
    const btnOkResultado = document.getElementById("btnOkResultado");

    // cerrar por botones
    btnCerrarConfirmar?.addEventListener("click", () => cerrarModal("modal-confirmar-match"));
    btnCancelarConfirmar?.addEventListener("click", () => cerrarModal("modal-confirmar-match"));

    btnCerrarResultado?.addEventListener("click", () => cerrarModal("modal-resultado-match"));
    btnOkResultado?.addEventListener("click", () => cerrarModal("modal-resultado-match"));

    // confirmar acción
    btnConfirmarAccion?.addEventListener("click", ejecutarAccionConfirmada);
}


// 5.3 Modal de resultado
function abrirResultado(titulo, texto) {

    // DOM
    const modalResultadoTitulo = document.getElementById("modalResultadoTitulo");
    const modalResultadoTexto = document.getElementById("modalResultadoTexto");
    const btnOkResultado = document.getElementById("btnOkResultado");

    if (modalResultadoTitulo) modalResultadoTitulo.textContent = titulo;

    if (modalResultadoTexto) modalResultadoTexto.textContent = texto;

    abrirModal("modal-resultado-match");

    btnOkResultado?.focus();
}


// 5.4) Ejecutar Acción Confirmada
async function ejecutarAccionConfirmada() {

  const idMatch = Number(idMatchPendiente);

  cerrarModal("modal-confirmar-match");

  try {

    // Ejecutar acción según lo que eligió el usuario
    if (accionPendiente === "validar") {
      await validarMatch(idMatch);
      abrirResultado("Match validado", `El match #${idMatch} se ha validado correctamente.`);
    } else {
      await denegarMatch(idMatch);
      abrirResultado("Match denegado", `El match #${idMatch} se ha denegado correctamente.`);
    }

    await cargarDatos();
    paginaActual = 1;
    refrescarTabla();

  } catch (err) {
    console.error("Error acción:", err);
    abrirResultado("Error", err?.message || "Ha ocurrido un error.");
  }

  accionPendiente = null;
  idMatchPendiente = null;
  botonOrigen = null;

  await refrescarNav(true);
}


// =========================================================
// HELPERS UI
// =========================================================

// Crear HTML de intercambio
function crearIntercambioHTML(m) {

    const aOk = m.nomenclatura_emisor && m.fecha_turno_emisor;
    const bOk = m.nomenclatura_receptor && m.fecha_turno_receptor;

    if (aOk && bOk) {
        return `
      <div class="celda-intercambio">
        <div class="intercambio-bloque">
          <span class="badge-turno badge-turno--${m.nomenclatura_emisor}">${m.nomenclatura_emisor}</span>
          <span class="intercambio-fecha">${formatearFechaES(soloFecha(m.fecha_turno_emisor))}</span>
        </div>

        <span class="intercambio-flecha">↔</span>

        <div class="intercambio-bloque">
          <span class="badge-turno badge-turno--${m.nomenclatura_receptor}">${m.nomenclatura_receptor}</span>
          <span class="intercambio-fecha">${formatearFechaES(soloFecha(m.fecha_turno_receptor))}</span>
        </div>
      </div>
    `;
    }

    if (aOk) {
        return `
      <div class="celda-intercambio">
        <div class="intercambio-bloque">
          <span class="badge-turno badge-turno--${m.nomenclatura_emisor}">${m.nomenclatura_emisor}</span>
          <span class="intercambio-fecha">${formatearFechaES(soloFecha(m.fecha_turno_emisor))}</span>
        </div>
      </div>
    `;
    }

    if (bOk) {
        return `
      <div class="celda-intercambio">
        <div class="intercambio-bloque">
          <span class="badge-turno badge-turno--${m.nomenclatura_receptor}">${m.nomenclatura_receptor}</span>
          <span class="intercambio-fecha">${formatearFechaES(soloFecha(m.fecha_turno_receptor))}</span>
        </div>
      </div>
    `;
    }

    return "---";
}
