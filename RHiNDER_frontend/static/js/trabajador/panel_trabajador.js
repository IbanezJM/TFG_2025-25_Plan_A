"use strict";

import {fechaActual} from "/static/js/comun/util.js";

import {getSolicitudesEnviadas, getSolicitudesRecibidas, getMatchesActivos} from "/static/store/store_api.js";

import {crearTarjeta} from "/static/js/comun/tarjetas.js";

// =========================================================
// ESTADO GLOBAL
// =========================================================
// Tarjetas
let solicitudesEnviadas = [];
let solicitudesRecibidas = [];
let matchesActivos = [];


// =========================================================
// INICIO
// =========================================================
window.addEventListener("DOMContentLoaded", async () => {

    fechaActual();

    // 1) Cargar datos
    await cargarDatosPanel();

    // 2) Tarjetas
    await cargarTarjetas();

    // 3) Estadísticas
    actualizarEstadisticas();
});

// =========================================================
// DATOS
// =========================================================
// 1) Datos
async function cargarDatosPanel() {
    solicitudesEnviadas = await getSolicitudesEnviadas();
    if (!solicitudesEnviadas) return;

    solicitudesRecibidas = await getSolicitudesRecibidas();
    if (!solicitudesRecibidas) return;

    matchesActivos = await getMatchesActivos();
}

// =========================================================
// TARJETAS
// =========================================================
// 2.1) Tarjetas
async function cargarTarjetas() {

    const contenedor = document.getElementById("tarjetas-estadisticas");
    if (contenedor) contenedor.innerHTML = "";

    crearTarjeta({
        titulo: "Solicitudes enviadas",
        descripcion: "total solicitudes enviadas por el trabajador",
        color: "azul",
        icono: "enviadas",
        id: "statPendientes",
        valor: solicitudesEnviadas.length,
    });

    crearTarjeta({
        titulo: "Solicitudes recibidas",
        descripcion: "Total solicitudes recibidas por el trabajador",
        color: "verde",
        icono: "recibidas",
        id: "statEnviadas",
        valor: solicitudesRecibidas.length,
    });

    crearTarjeta({
        titulo: "Matches validados",
        descripcion: "Total matches validados",
        color: "naranja",
        icono: "check",
        id: "statExpiradas",
        valor: matchesActivos.length,
    });
}


// 2.2) Estadísticas
function actualizarEstadisticas() {

    const elEnviadas = document.getElementById("estadistica-solicitudes-enviadas");
    const elRecibidas = document.getElementById("estadistica-solicitudes-recibidas");
    const elMatches = document.getElementById("estadistica-matches");


    if (elEnviadas) elEnviadas.textContent = solicitudesEnviadas.length;
    if (elRecibidas) elRecibidas.textContent = solicitudesRecibidas.length;
    if (elMatches) elMatches.textContent = matchesActivos.length;
}
