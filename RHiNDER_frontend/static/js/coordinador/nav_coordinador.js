"use strict";

import {getMatchesPendientesValidacion, getValidacionesNuevas,} from "/static/store/store_api.js";

// =========================================================
// ESTADO GLOBAL
// =========================================================
const NAV_REFRESH_MS = 60 * 1000;


// =========================================================
// INICIO
// =========================================================
window.addEventListener("DOMContentLoaded", () => {

    // 1) Refrescar Navegador
    refrescarNav();

    // 2) SetInterval para refrescar cada minuto
    setInterval(refrescarNav, NAV_REFRESH_MS);
});

// 1.1) Refrescar Navegador
async function refrescarNav(force = false) {
    const elMatchesNuevos = document.getElementById("matches-nuevos");
    const elValidaciones = document.getElementById("matches-aceptados-denegados"); // (tu badge de validaciones)
    if (!elMatchesNuevos && !elValidaciones) return;

    try {
        const [pendientes, nuevasValidaciones] = await Promise.all([
            getMatchesPendientesValidacion(force),
            getValidacionesNuevas(force), // número
        ]);

        pintarNav(pendientes ?? [], Number(nuevasValidaciones ?? 0));
    } catch (err) {
        pintarNav([], 0);
    }
}

// 1.2) Pintar Navegador
function pintarNav(pendientes, nuevasValidaciones) {
    const elMatchesNuevos = document.getElementById("matches-nuevos");
    const elValidaciones = document.getElementById("validaciones-nuevas");

    // ✅ COORDINADOR: matches pendientes no vistos
    if (elMatchesNuevos) {
        const total = contarPendientesNoVistosCoordinador(pendientes);
        elMatchesNuevos.textContent = total > 0 ? String(total) : "";
    }

    // ✅ COORDINADOR: validaciones no vistas (número)
    if (elValidaciones) {
        elValidaciones.textContent = nuevasValidaciones > 0 ? String(nuevasValidaciones) : "";
    }
}

// 1.3) Contar Matches No Vistos
function contarPendientesNoVistosCoordinador(lista = []) {
    if (!Array.isArray(lista)) return 0;
    return lista.filter((m) => Number(m.visto_por_coordinador) === 0).length;
}

export {refrescarNav};
