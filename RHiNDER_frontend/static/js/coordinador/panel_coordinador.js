"use strict";

import {fechaActual} from "/static/js/comun/util.js";

import {getEstadisticasValidacionesEstado, getEstadisticasValidacionesPorDia,} from "/static/store/store_api.js";

import {crearTarjeta} from "/static/js/comun/tarjetas.js";


// =========================================================
// ESTADO GLOBAL
// =========================================================

// Datos
let periodoDonut = "mes";  // hoy | mes | anio
let statsEstado = null;    // { total, pendientes, aprobadas, rechazadas, periodo }
let statsPorDia = [];      // [{fecha, valor}, ...]

let matchesPendientes;
let matchesRechzados
let matchesAprobados;
let matchesResueltas;
let matchesTotales;


// Barras
let diasBarras = 7;        // 7 | 14


// =========================================================
// INICIO
// =========================================================
window.addEventListener("DOMContentLoaded", async () => {

    fechaActual();

    // 1) Datos
    await cargarDatos();

    // 2) Tarjetas
    await cargarTarjetas();

    // 3) Eventos
    cargarEventos();

    // 4) Pintar interfaz
    pintarUI();
});


// =========================================================
// DATOS
// =========================================================
// 1) Datos
async function cargarDatos() {

    statsEstado = await getEstadisticasValidacionesEstado(periodoDonut);
    if (!statsEstado) return;

    statsPorDia = await getEstadisticasValidacionesPorDia(diasBarras);

    matchesPendientes = statsEstado.pendientes || 0;
    matchesAprobados = statsEstado.aprobadas || 0;
    matchesRechzados = statsEstado.rechazadas || 0;
    matchesTotales = statsEstado.total || 0;
    matchesResueltas = matchesAprobados + matchesRechzados;

}

// =========================================================
// TARJETAS
// =========================================================
// 2) Tarjetas
async function cargarTarjetas() {

    const contenedor = document.getElementById("tarjetas-estadisticas");
    if (contenedor) contenedor.innerHTML = "";

    crearTarjeta({
        titulo: "Matches pendientes",
        descripcion: "total matches pendientes de validar",
        color: "naranja",
        icono: "pendientes",
        id: "statPendientes",
        valor: matchesPendientes,
    });

    crearTarjeta({
        titulo: "Solicitudes recibidas",
        descripcion: "Total solicitudes recibidas por el trabajador",
        color: "azul",
        icono: "check",
        id: "statEnviadas",
        valor: matchesResueltas,
    });

    crearTarjeta({
        titulo: "Matches validados",
        descripcion: "Total matches validados",
        color: "verde",
        icono: "lista",
        id: "statExpiradas",
        valor: matchesTotales
    });
}

// ==========================
// EVENTOS (Dropdowns)
// ==========================

// 3) Cargar eventos
function cargarEventos() {

    // Buscar todos los dropdowns
    document.querySelectorAll("[data-dropdown]").forEach((dd) => {
        const boton = dd.querySelector("[data-dropdown-boton]");
        const menu = dd.querySelector("[data-dropdown-menu]");
        if (!boton || !menu) return;


        // Evento abrir / cerrar dropdown
        boton.addEventListener("click", (e) => {
            e.stopPropagation();
            dd.classList.toggle("abierto");
        });


        // Evento click en una opción
        menu.addEventListener("click", async (e) => {

            // Detecta botón pulsado que tenga el atributo data-valor
            // closest()  xa que ->click funcione aunque se pulse un icono o span interno
            const btn = e.target.closest("button[data-valor]");
            if (!btn) return;

            // Obtiene del atributo data-valor del HTML
            const valor = btn.dataset.valor;

            // Texto visible del botón
            const texto = btn.textContent.trim();

            // -------------------------------------------------
            // Actualizar el texto visible del dropdown
            // -------------------------------------------------
            // Busca y actualiza span donde se muestra la opción seleccionada
            const span = dd.querySelector(".dropdown-filtro__texto");
            if (span) span.textContent = texto;


            if (["7", "14", "30"].includes(valor)) {

                diasBarras = Number(valor);

                await refrescarGraficoBarras();
            }


            if (["hoy", "mes", "anio"].includes(valor)) {

                periodoDonut = valor;

                await refrescarPanelValidaciones();
            }

            // -------------------------------------------------
            // Cerrar el dropdown tras seleccionar una opción
            // -------------------------------------------------

            // Elimina la clase "abierto" para ocultar el menú
            dd.classList.remove("abierto");
        });
    });
}


// ==========================
// INTERFAZ
// ==========================

// 4) Pintar interfaz
function pintarUI() {

    // Donut
    pintarDonut(statsEstado);

    // Barras (completar días vacíos)
    const serie = completarDiasSinDatos(statsPorDia, diasBarras);
    pintarBarras(serie.map((x) => ({dia: x.dia, valor: x.valor})));
}



// 4.1) Pintar Donut
function pintarDonut({total, aprobadas, pendientes, rechazadas} = {}) {

    const donut = document.getElementById("donut");
    if (!donut) return;

    const elTotal = document.getElementById("donut-total");
    const elA = document.getElementById("leyenda-aprobadas");
    const elP = document.getElementById("leyenda-pendientes");
    const elR = document.getElementById("leyenda-rechazadas");

    // -------------------------------------------------
    // Cálculo de porcentajes
    // -------------------------------------------------

    // Porcentaje de aprobadas respecto al total
    const pA = Math.round((aprobadas / total) * 100);

    // Porcentaje de pendientes respecto al total
    const pP = Math.round((pendientes / total) * 100);

    // Porcentaje de rechazadas
    const pR = Math.max(100 - pA - pP);

    // -------------------------------------------------
    // Actualización de los textos visibles
    // -------------------------------------------------


    if (elTotal) elTotal.textContent = String(total);

    if (elA) elA.textContent = `${aprobadas} (${pA}%)`;

    if (elP) elP.textContent = `${pendientes} (${pP}%)`;

    if (elR) elR.textContent = `${rechazadas} (${pR}%)`;

    // -------------------------------------------------
    // Actualización visual del donut (CSS)
    // -------------------------------------------------
    setTimeout(() => {
        donut.style.setProperty("--p-aprobadas", pA);
        donut.style.setProperty("--p-pendientes", pP);
        donut.style.setProperty("--p-rechazadas", pR);
    }, 120);
}

// 4.2) Pintar Barras
function pintarBarras(items) {

    console.log("items:", items);

// Contenedor del gráfico
    const contenedor = document.getElementById("grafico-barras");
    if (!contenedor) return;

     // Obtener el valor más alto (mínimo 1 para evitar errores)
    let max = 1;
    items.forEach(item => {
        if (item.valor > max) max = item.valor;
    });

// Generar las barras
    contenedor.innerHTML = items
        .map((x) => {

            const porcentaje = Math.round((x.valor / max) * 100);

            console.log(x.dia, x.valor, porcentaje);

            return `
                <div class="barra-item">
                  <div class="barra" style="height:${porcentaje}px;" data-valor="${x.valor}"></div>
                  <div class="barra-label">${x.dia}</div>
                </div>
              `;
        })
        .join("");
}

// 4.3) Completar días sin datos -> Generar días consecutivos  -> si algún día no tiene datos -> valor 0
function completarDiasSinDatos(data, dias) {

    // Convertir array en Map: clave  -> fecha (YYYY-MM-DD) || valor-> número validaciones de ese día
    const mapa = new Map(  data.map((x) => [x.fecha, Number(x.valor) || 0]) );

    // Fecha actual
    const hoy = new Date();

    // Array donde guardaremos el resultado final
    const salida = [];

    // Recorrer desde el día más antiguo hasta hoy (ejemplo: últimos 7 días)
    for (let i = dias - 1; i >= 0; i--) {

        // Crear una copia de la fecha de hoy
        const d = new Date(hoy);

        // Restar "i" días para obtener cada día anterior
        d.setDate(hoy.getDate() - i);

        // Convertir fecha a formato ISO (YYYY-MM-DD)
        const iso = d.toISOString().slice(0, 10);

        // Obtener nombre corto del día de la semana en español (Ejemplo: "mié.")
        const etiqueta = d
            .toLocaleDateString("es-ES", { weekday: "short" })
            .replace(".", ""); // Quitamos el punto final

        // Poner primera letra en mayúscula (Ejemplo: "mié" -> "Mié")
        const dia = etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1);

        // Añadir el objeto al array de salida:
        // - fecha: ISO
        // - dia: nombre del día
        // - valor: dato real si existe, o 0 si no hay datos
        salida.push({
            fecha: iso,
            dia,
            valor: mapa.get(iso) ?? 0
        });
    }

    // Devolver la serie completa de días
    return salida;
}


// ==========================
// REFRESCAR INTERFAZ
// ==========================

// 5.1) Refrescar panel de validaciones
async function refrescarPanelValidaciones() {

    statsEstado = await getEstadisticasValidacionesEstado(periodoDonut);

    pintarDonut(statsEstado);

}


// 5.2) Refrescar grafico de barras
async function refrescarGraficoBarras() {

    statsPorDia = await getEstadisticasValidacionesPorDia(diasBarras);

    const serie = completarDiasSinDatos(statsPorDia, diasBarras);

    pintarBarras(serie.map((x) => ({dia: x.dia, valor: x.valor})));
}








