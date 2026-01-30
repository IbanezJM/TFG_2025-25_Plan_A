"use strict";

import { getSolicitudesRecibidasNuevas, getMatchesActivos, getNumeroSolicitudesConRespuestasNoVistas } from "/static/store/store_api.js";

// =========================================================
// ESTADO GLOBAL
// =========================================================
const NAV_REFRESH_MS = 60 * 1000;


// =========================================================
// INICIO
// =========================================================
window.addEventListener("DOMContentLoaded", async () => {

    // 1) Refrescar Navegador
    await refrescarNav();

    // 2) SetInterval para refrescar cada minuto
    setInterval(refrescarNav, NAV_REFRESH_MS);

});


// 1.2) Pide datos al backend y repinta el nav
async function refrescarNav(force = false) {
    const elRespuestas = document.getElementById("respuestas-nuevas");
    const elSolicitudes = document.getElementById("solicitudes-nuevas");
    const elMatches = document.getElementById("matches-aceptados-denegados");
    if (!elRespuestas && !elSolicitudes && !elMatches) return;

    try {
        const [respuestas, solicitudesNuevas, matches] = await Promise.all([
            getNumeroSolicitudesConRespuestasNoVistas(force),
            getSolicitudesRecibidasNuevas(force), // 👈 este devuelve número
            getMatchesActivos(force),
        ]);

        pintarNav(respuestas ?? 0, solicitudesNuevas ?? 0, matches ?? []);
    } catch (err) {
        pintarNav(0, 0, []);
    }
}


// 1.2) Pinta el nav con los datos
function pintarNav(numRespuestas, solicitudesNuevas, matches) {
    const elRespuestas = document.getElementById("respuestas-nuevas");
    const elSolicitudes = document.getElementById("solicitudes-nuevas");
    const elMatches = document.getElementById("matches-aceptados-denegados");

    if (elRespuestas) {
        elRespuestas.textContent = numRespuestas > 0 ? String(numRespuestas) : "";
    }

    // ✅ solicitudesNuevas ES NÚMERO
    if (elSolicitudes) {
        const total = Number(solicitudesNuevas) || 0;
        elSolicitudes.textContent = total > 0 ? String(total) : "";
    }

    if (elMatches) {
        const noVistos = contarMatchesNoVistos(matches);
        elMatches.textContent = noVistos > 0 ? String(noVistos) : "";
    }


}

// 1.3) Contar Matches No Vistos
function contarMatchesNoVistos(lista = []) {
    if (!Array.isArray(lista)) return 0;

    return lista.filter((m) => {
        const rol = String(m.mi_rol_en_match || "").toUpperCase();

        if (rol === "EMISOR") return Number(m.visto_por_emisor) === 0;
        if (rol === "RECEPTOR") return Number(m.visto_por_receptor) === 0;

        return false;
    }).length;
}


export {refrescarNav};

