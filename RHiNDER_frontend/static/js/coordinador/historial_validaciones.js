"use strict";

import {claseEstado, claseTurno} from "/static/js/comun/constantes.js"

import {getHistorialValidaciones, marcarValidacionesComoVistas} from "/static/store/store_api.js";

import {formatearFechaES, soloFecha} from "/static/js/comun/util.js";

import { inyectarFiltros, cargarListenersFiltros, aplicarFiltros,} from "/static/js/coordinador/filtros_historial_validaciones.js";

import {crearTarjeta} from "/static/js/comun/tarjetas.js";

import {crearPaginacion, paginarLista} from "/static/js/comun/paginacion.js";

import {refrescarNav} from "/static/js/coordinador/nav_coordinador.js";


// =========================================================
// ESTADO GLOBAL
// =========================================================

// Datos
let validaciones = [];
let validadas;
let denegadas;
let expiradas;

// Filtros
let uiFiltros;

// Paginación
const PAGE_SIZE = 10;
let paginaActual = 1;


// =========================================================
// INICIO
// =========================================================
document.addEventListener("DOMContentLoaded", async () => {

    // 1) Cargar datos
    await cargarDatos();

    // 2) Cargar Tarjetas
    cargarTarjetas();

    // 3) Cargar tabla
    crearFilasTabla();

    // 4) Filtros
    cargarFiltros();


});

// =========================================================
// DATOS
// =========================================================

// 2) Cargar datos
async function cargarDatos() {

    validaciones = await getHistorialValidaciones(true);

    console.log('validaciones: ', validaciones)

    await marcarValidacionesComoVistas();

    await refrescarNav(true); // 👈 mejor con true para forzar cache
}

// =========================================================
// TARJETAS
// =========================================================

// 2.1) Cargar tarjetas
function cargarTarjetas() {

    const contenedor = document.querySelector(".rejilla-estadisticas");
    if (!contenedor) return;
    contenedor.innerHTML = "";

    console.log(validaciones)


    validadas = validaciones.filter((v => v.estado_validacion === "APROBADA"))

    crearTarjeta({
        titulo: "Validaciones",
        descripcion: "Validadas",
        color: "verde",
        icono: "enviadas",
        id: "statValidadas",
        valor: validadas.length,
    });

    denegadas = validaciones.filter((v => v.estado_validacion === "RECHAZADA"))

    crearTarjeta({
        titulo: "Validaciones",
        descripcion: "Denegadas",
        color: "rojo",
        icono: "canceladas",
        id: "statDenegadas",
        valor: denegadas.length,
    });

    expiradas = validaciones.filter((v => v.estado_validacion === "EXPIRADO"))
    crearTarjeta({
        titulo: "Validaciones",
        descripcion: "Expiradas",
        color: "naranja",
        icono: "pendientes",
        id: "statExpiradas",
        valor: expiradas.length,
    });
}

// 2.2 Actualizar tarjetas
function actualizarTarjetas(listaFiltrada = []) {

    const statValidadas = document.getElementById("statValidadas");
    const statDenegadas = document.getElementById("statDenegadas");
    const statExpiradas = document.getElementById("statExpiradas");


    if (statValidadas) statValidadas.textContent = validadas.length;
    if (statDenegadas) statDenegadas.textContent = denegadas.length;
    if (statExpiradas) statExpiradas.textContent = expiradas.length;
}


// =========================================================
// TABLA
// =========================================================

// 3) Crear Filas de la tabla
function crearFilasTabla(lista = []) {

    const cuerpoTabla = document.getElementById("cuerpoTabla");
    if (!cuerpoTabla) return;

    const contadorResultados = document.getElementById("contadorResultados");
    const estadoVacio = document.getElementById("estadoVacio");

    // Estado vacio
    if (lista.length === 0) {
        cuerpoTabla.innerHTML = "";
        if (estadoVacio) estadoVacio.style.display = "block";
        if (contadorResultados) contadorResultados.textContent = "0 resultados";
        return;
    }

    if (estadoVacio) estadoVacio.style.display = "none";

    // Contador resultados
    if (contadorResultados) {
        contadorResultados.textContent = `${lista.length} resultado${
            lista.length !== 1 ? "s" : ""
        }`;
    }

    // Cuerpo tabla
    cuerpoTabla.innerHTML = lista
        .map((validacion) => {

            // Estado
            const estado = validacion.estado_validacion;


            // Fecha validación
            const fechaTurnoISO = soloFecha(validacion.fecha_validacion)
            const fechaTurnoES = formatearFechaES(fechaTurnoISO);

            return `
        <tr data-id="${validacion.id_match ?? ""}">
          <td data-etiqueta="Id Match">#${validacion.id_match ?? "---"}</td>

          <td data-etiqueta="Emisor" class="celda-usuario">
            ${validacion.emisor_username ?? "---"}
          </td>

          <td data-etiqueta="Intercambio">
            ${crearIntercambioHTML(validacion)}
          </td>

          <td data-etiqueta="Receptor" class="celda-usuario">
            ${validacion.receptor_username ?? "---"}
          </td>

          <td data-etiqueta="Estado" >
            <span class="badge-estado ${claseEstado(validacion.estado_validacion)}">
    <span class="punto-estado"></span>
    ${validacion.estado_validacion}
  </span>
          </td>

          <td data-etiqueta="Coordinador" class="celda-usuario">
            ${validacion.admin_username ?? "---"}
          </td>

          <td data-etiqueta="Fecha validación" class="celda-fecha">
            ${fechaTurnoES || "---"}
          </td>
        </tr>
      `;
        })
        .join("");
}

// =========================================================
// FILTROS
// =========================================================

// 4.1 Cargar filtros
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
// 4.2 Refrescar tabla
function refrescarTabla() {
    aplicarFiltros(uiFiltros, validaciones, actualizarTarjetas, renderizarTablaPaginada);
}

// 4.3 Renderizar tabla paginada
function renderizarTablaPaginada(listaFiltrada = []) {
    const paginaItems = paginarLista(listaFiltrada, paginaActual, PAGE_SIZE);
    const contenedorPaginacion = document.getElementById("contenedor-paginacion");
    crearFilasTabla(paginaItems);

    crearPaginacion({
        contenedor: contenedorPaginacion,
        totalItems: listaFiltrada.length,
        paginaActual,
        pageSize: PAGE_SIZE,
        onPageChange: (nueva) => {
            paginaActual = nueva;
            renderizarTablaPaginada(listaFiltrada);
        },
    });
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


