"use strict";

import {fechaActual, formatearFechaES, soloFecha} from "/static/js/comun/util.js";

import {crearPaginacion, paginarLista} from "/static/js/comun/paginacion.js";

import {getMatchesActivos, marcarMatchesComoVistos} from "/static/store/store_api.js";

import {inyectarFiltros, cargarListenersFiltros, aplicarFiltros,} from "/static/js/trabajador/filtros_matches.js";

import {crearTarjeta} from "/static/js/comun/tarjetas.js";

import {claseEstado} from "/static/js/comun/constantes.js";

import {refrescarNav} from "/static/js/trabajador/nav_trabajador.js";

// =========================================================
// ESTADO GLOBAL
// =========================================================

// Datos de la tabla
let matches = [];
let pendientes;
let aprobados;
let rechazados;


// Paginación
let paginaActual = 1;
const PAGE_SIZE = 10;

// Filtros
let uiFiltros;


// =========================================================
// INICIO
// =========================================================
document.addEventListener("DOMContentLoaded", async () => {

    fechaActual();

    // 1) Cargar datos
    await cargarDatos();

    // 2) Cargar Tarjetas
    await cargarTarjetas(matches);

    // 3) Cargar tabla
    cargarTabla();

    // 4) Cargar filtros
    cargarFiltros();
});

// =========================================================
// INICIO
// =========================================================
// 1) Cargar datos
async function cargarDatos() {
    matches = await getMatchesActivos(true);

    await marcarMatchesComoVistos();

    await refrescarNav();

    console.log('matches: ', matches)
}

// =========================================================
// TARJETAS
// =========================================================

// 2) Cargar Tarjetas

// 2.1 Cargar tarjetas
async function cargarTarjetas(lista = []) {

    const contenedor = document.getElementById("rejilla-estadisticas");
    if (contenedor) contenedor.innerHTML = "";


    pendientes = lista.filter((m) => m.estado_match === "PENDIENTE_VALIDACION").length;
    crearTarjeta({
        titulo: "Matches",
        descripcion: "Pendientes de validación",
        color: "azul",
        icono: "pendientes",
        id: "statPendientes",
        valor: pendientes,
    });

    aprobados = lista.filter((m) => m.estado_match === "VALIDADO").length;
    crearTarjeta({
        titulo: "Matches",
        descripcion: "Aprobados",
        color: "verde",
        icono: "enviadas",
        id: "statAprobados",
        valor: aprobados,
    });
    rechazados = lista.filter((m) => m.estado_match === "RECHAZADO").length;
    crearTarjeta({
        titulo: "Matches",
        descripcion: "Rechazados",
        color: "rojo",
        icono: "recibidas",
        id: "statRechazados",
        valor: rechazados,
    });
}

// b.2 Actualizar tarjetas
function actualizarTarjetas(lista = []) {

    const statPendientes = document.getElementById("statPendientes");
    const statAprobados = document.getElementById("statAprobados");
    const statRechazados = document.getElementById("statRechazados");

    if (statPendientes) statPendientes.textContent = String(pendientes);
    if (statAprobados) statAprobados.textContent = String(aprobados);
    if (statRechazados) statRechazados.textContent = String(rechazados);
}

// =========================================================
// TABLA
// =========================================================

// 3) Cargar tabla
function cargarTabla() {

    crearFilasTabla(matches);
}

// 3.1 crear filas de la tabla
function crearFilasTabla(lista = []) {
    const contadorResultados = document.getElementById("contadorResultados");
    const cuerpoTabla = document.getElementById("cuerpoTabla");
    const estadoVacio = document.getElementById("estadoVacio");

    if (!cuerpoTabla) return;

    if (!lista.length) {
        cuerpoTabla.innerHTML = "";
        if (estadoVacio) estadoVacio.hidden = false;
        if (contadorResultados) contadorResultados.textContent = "0 resultados";
        return;
    }

    if (estadoVacio) estadoVacio.hidden = true;

    if (contadorResultados) {
        contadorResultados.textContent = `${lista.length} resultado${lista.length !== 1 ? "s" : ""}`;
    }

    cuerpoTabla.innerHTML = lista
        .map((m) => {
            const fechaMatchES = formatearFechaES(soloFecha(m.fecha_match));
            const ultimoCambioES = formatearFechaES(soloFecha(m.fecha_ultimo_cambio));


            return `
        <tr data-id="${m.id_match ?? ""}">
          <td data-etiqueta="Id Match">#${m.id_match ?? "---"}</td>

          <td data-etiqueta="Fecha match" class="celda-fecha">
            ${fechaMatchES || "---"}
          </td>

          <td data-etiqueta="Intercambio">
            ${crearIntercambioHTML(m)}
          </td>
          <td data-etiqueta="Receptor">   
          ${m.receptor_username}       
          </td>

          <td data-etiqueta="Estado">
  <span class="badge-estado ${claseEstado(m.estado_match)}">
    <span class="punto-estado"></span>
    ${m.estado_match}
  </span>
</td>

          <td data-etiqueta="Último cambio" class="celda-actualizado">
            ${ultimoCambioES || "---"}
          </td>
        </tr>
      `;
        })
        .join("");
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
// 4.2) Renderizar tabla paginada
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

// 4.2) Refrescar Tabla
function refrescarTabla() {
    aplicarFiltros(uiFiltros, matches, actualizarTarjetas, renderizarTablaPaginada);
}


// =========================================================
// HELPERS UI
// =========================================================
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
