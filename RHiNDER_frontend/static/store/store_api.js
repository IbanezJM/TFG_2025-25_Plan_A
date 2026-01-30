"use strict";

import {API} from "/static/js/comun/constantes.js";
import {getCookie} from "/static/js/comun/util.js";

// =========================================================
// CACHE
// =========================================================
const cache = {

    // (trabajador)
    usuarioActual: null,
    solicitudesEnviadas: null,
    respuestasRecibidas: null,
    solicitudesRecibidasExpiradasCount: null,
    solicitudesRecibidas: null,
    solicitudesRecibidasNuevas: null,
    matchesActivos: null,


    // (coordinador)
    matchesPendientesValidacion: null,
    historialValidaciones: null,
    validacionesNuevas: null,

};


// =========================================================
// CABECERAS HTTP
// =========================================================

// 1) Get Token desde cookies
// =========================================================
function getTokenOrRedirect() {
    const TOKEN = getCookie("JWT");

    if (!TOKEN || TOKEN === "undefined" || TOKEN === "null") {
        alert("Sesión caducada. Vuelve a iniciar sesión.");
        window.location.href = "/";
        return null;
    }

    return TOKEN;
}


// 2) GET
// =========================================================
async function getJSON(url) {
    const TOKEN = getTokenOrRedirect();
    if (!TOKEN) return null;

    const res = await fetch(url, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${TOKEN}`,
            Accept: "application/json",
        },
    });

    if (res.status === 401 || res.status === 422) {
        window.location.href = "/";
        return null;
    }

    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

    return await res.json();
}


// 3) POST
// =========================================================
async function postJSON(url, bodyObj = {}) {
    const TOKEN = getTokenOrRedirect();
    if (!TOKEN) return null;

    const res = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${TOKEN}`,
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyObj),
    });

    let data = {};
    try {
        data = await res.json();
    } catch {
    }

    // ✅ SOLO redirigir cuando sea JWT inválido / caducado
    // En tu backend eso llega como 422
    if (res.status === 422) {
        window.location.href = "/";
        return null;
    }

    // ✅ 401 aquí es un error funcional (no sesión caducada)
    if (!res.ok) {
        throw new Error(data?.message || data?.msg || `HTTP ${res.status} ${res.statusText}`);
    }

    return data;
}

// PUT
// =========================================================
async function putJSON(url, bodyObj = {}) {
    const TOKEN = getTokenOrRedirect();
    if (!TOKEN) return null;

    const res = await fetch(url, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${TOKEN}`,
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyObj),
    });

    let data = {};
    try {
        data = await res.json();
    } catch {
    }

    // ✅ Solo redirige si el backend te manda 422 (típico JWT inválido/expirado)
    if (res.status === 422) {
        window.location.href = "/";
        return null;
    }

    // ✅ 401 aquí NO es sesión caducada: es password incorrecta
    if (!res.ok) {
        throw new Error(data?.message || data?.msg || `HTTP ${res.status} ${res.statusText}`);
    }

    return data;
}

/* =========================================================
   GETTERS (COMÚN)
   ========================================================= */

// 1) Usuario actual (perfil)
// =========================================================
async function getUsuarioActual(force = false) {
    if (!force && cache.usuarioActual) return cache.usuarioActual;

    const payload = await getJSON(`${API}/usuario`);
    cache.usuarioActual = payload;
    return cache.usuarioActual;
}

// 2) Avisa si hay Expiraciones nuevas
// =========================================================
function avisarSiNuevasExpiradas(userId, entidadKey, totalExpiradas, mensaje) {
    if (!userId) return;

    const storageKey = `expiradas_${userId}_${entidadKey}`;
    const prev = Number(localStorage.getItem(storageKey) || 0);

    if (totalExpiradas > prev) {
        const nuevas = totalExpiradas - prev;
        alert(`${mensaje} (+${nuevas} nuevas)`);
    }

    localStorage.setItem(storageKey, String(totalExpiradas));
}


/* =========================================================
   PUTS (COMÚN)
   ========================================================= */

// Cambiar contraseña del usuario actual
async function cambiarPassword(password_actual, password_nueva) {
  return await putJSON(`${API}/usuario/password`, {
    password_actual,
    password_nueva,
  });
}

/* =========================================================
   GETTERS (TRABAJADOR)
   ========================================================= */

// 1) Devuelve todas las solicitudes enviadas por el usuario actual
// =========================================================
async function getSolicitudesEnviadas(force = false) {
    if (!force && cache.solicitudesEnviadas) return cache.solicitudesEnviadas;

    const data = await getJSON(`${API}/solicitud`);
    cache.solicitudesEnviadas = data;
    return cache.solicitudesEnviadas;
}


// 2) Devuelve todas las respuestas recibidas por el usuario actual
// =========================================================
async function getRespuestasRecibidas(force = false) {
    if (!force && cache.respuestasRecibidas) return cache.respuestasRecibidas;

    const data = await getJSON(`${API}/respuestas`);
    cache.respuestasRecibidas = data;
    return cache.respuestasRecibidas;
}


// 3) Devuelve el numero de solicitudes con respuestas no vistas por el usuario actual
// =========================================================
async function getNumeroSolicitudesConRespuestasNoVistas(force = false) {
    const respuestas = await getRespuestasRecibidas(force);
    if (!Array.isArray(respuestas)) return 0;

    return new Set(
        respuestas
            .filter(r => Number(r.visto_por_solicitante) === 0)
            .map(r => r.id_solicitud)
    ).size;
}

// 4) Aviso + limpieza de respuestas expiradas (receptor)
async function getRespuestasExpiradasAviso(force = false) {
    // (opcional) podrías cachearlo, pero yo lo dejaría sin cache
    const total = await getJSON(`${API}/respuestas/expiradas/avisar`);
    return Number(total) || 0;
}


// 5) Devuelve el número de solicitudes recibidas expiradas
// =========================================================
async function getSolicitudesRecibidasExpiradasCount(force = false) {
    if (!force && cache?.solicitudesRecibidasExpiradasCount != null) {
        return cache.solicitudesRecibidasExpiradasCount;
    }

    const total = await getJSON(`${API}/solicitudes/recibidas/expiradas/count`);
    cache.solicitudesRecibidasExpiradasCount = Number(total);
    return Number(total);
}


// 6) Devuelve turnos usados para responder a solicitudes recibidas por el usuario actual
// =========================================================
/*
async function getTurnosUsadosParaResponder(force = false) {
      const TOKEN = getTokenOrRedirect();
    if (!TOKEN) return null;
    const res = await fetch(`${API}/respuestas/turnos-usados`, {
        headers: {Authorization: `Bearer ${TOKEN}`, Accept: "application/json"},
    });
    return await res.json();
}

 */

async function getTurnosUsadosParaResponder(force = false) {
    return await getJSON(`${API}/respuestas/turnos-usados`);
}


// 7) Devuelve todas las solicitudes recibidas por el usuario actual
// =========================================================
async function getSolicitudesRecibidas(force = false) {
    if (!force && cache.solicitudesRecibidas) return cache.solicitudesRecibidas;

    const data = await getJSON(`${API}/solicitudes/recibidas`);
    cache.solicitudesRecibidas = data;
    return cache.solicitudesRecibidas;
}

// 8) Devuelve el NÚMERO de solicitudes recibidas nuevas (no vistas)
// =========================================================
async function getSolicitudesRecibidasNuevas(force = false) {
    console.log("force", force);
    if (!force && Number.isInteger(cache.solicitudesRecibidasNuevas)) {
        return cache.solicitudesRecibidasNuevas;
    }

    const data = await getJSON(`${API}/solicitudes/recibidas/nuevas`);
    console.log("data", data.length);
    // El backend devuelve un array → usamos su length
    const total = Array.isArray(data) ? data.length : 0;
    cache.solicitudesRecibidasNuevas = total;

    return total;
}


// 9) Devuelve cambios en los matches activos (aceptados/rechazados)
// =========================================================
async function getMatchesActivos(force = false) {
    if (!force && cache.matchesActivos) return cache.matchesActivos;

    const data = await getJSON(`${API}/matches`);
    cache.matchesActivos = data;
    return cache.matchesActivos;
}


// 10) Devuelve numero de solicitudes enviadas expiradas
// =========================================================
async function getSolicitudesEnviadasExpiradasCount(force = false) {
    if (!force && cache?.solicitudesEnviadasExpiradasCount != null) {
        return cache.solicitudesEnviadasExpiradasCount;
    }

    const total = await getJSON(`${API}/solicitudes/enviadas/expiradas/count`);
    // total = 6

    if (cache) cache.solicitudesEnviadasExpiradasCount = Number(total);
    return Number(total);
}


/* =========================================================
   POSTS (TRABAJADOR)
   ========================================================= */

// 1) Crear respuesta a una solicitud (trabajador)
// =========================================================
async function crearRespuestaSolicitud(id_solicitud, id_turno_trabajador_receptor) {
    const data = await postJSON(`${API}/respuestas`, {
        id_solicitud,
        id_turno_trabajador_receptor,
    });

    // invalidar caches que dependan de esto
    cache.solicitudesRecibidas = null;
    cache.respuestasRecibidas = null;

    return data; // {ok:true, id_respuesta}
}

// 2) Marcar respuestas como VISTAS las no vistas de UNA solicitud concreta
// =========================================================
async function marcarRespuestasSolicitudComoVistas(idSolicitud, force = false) {

    // 1) Obtener todas las respuestas recibidas (API: GET /respuestas)
    const respuestas = await getRespuestasRecibidas(force);
    if (!Array.isArray(respuestas)) return;

    console.log(respuestas);

    // 2) Filtrar respuestas de esta solicitud -> que NO estén vistas
    const idsRespuestaNoVistas = respuestas
        .filter(r =>
            Number(r.id_solicitud) === Number(idSolicitud) &&
            Number(r.visto_por_solicitante) === 0
        )
        .map(r => Number(r.id_respuesta));

    // 3) Si no hay nada que marcar, salimos
    if (idsRespuestaNoVistas.length === 0) return;

    // 4) Llamar al backend para marcarlas como vistas (API: PUT /respuestas/vistas)
    await putJSON(`${API}/respuestas/vistas`, {
        ids_respuesta: idsRespuestaNoVistas
    });

    // 5) Limpiar caché para que el nav se actualice bien
    cache.respuestasRecibidas = null;
}


// 3) Crear match (trabajador) => selecciona una respuesta ganadora
// =========================================================
async function crearMatch(id_solicitud, id_respuesta) {
    const data = await postJSON(`${API}/matches`, {id_solicitud, id_respuesta});

    // invalidamos caches relacionadas, porque han cambiado estados
    cache.solicitudesEnviadas = null;
    cache.respuestasRecibidas = null;
    cache.matchesActivos = null;

    return data; // {msg, id_match, id_solicitud, id_receptor}
}

// 4) Marcar TODOS los matches del usuario como vistos
// =========================================================
async function marcarMatchesComoVistos() {
    const data = await postJSON(`${API}/matches/vistos`, {});

    // invalidamos cache para que nav/vista se refresquen
    cache.matchesActivos = null;

    return data; // {ok:true, msg:"..."}
}


/* =========================================================
   PUTS (TRABAJADOR)
   ========================================================= */

// 1) Cancelar solicitud enviada (PUT)
// =========================================================
async function cancelarSolicitudEnviada(id_solicitud) {
    const data = await putJSON(`${API}/solicitud/cancelar/${id_solicitud}`);

    // invalidamos caches relacionadas
    cache.solicitudesEnviadas = null;
    cache.respuestasRecibidas = null; // por si estás usando “hayRespuestas” en la vista
    cache.matchesActivos = null;

    return data; // {ok, message} o error
}


// 2) Marcar solicitudes como vistas (PUT)
// =========================================================
// Marca como VISTAS las solicitudes recibidas que aún no lo estén
async function marcarSolicitudesRecibidasComoVistas(listaSolicitudes = []) {

    // 1) Quedarse solo con las NO vistas
    const solicitudesNoVistas = listaSolicitudes.filter(
        s => Number(s.visto) === 0
    );
    console.log("Vistas:", listaSolicitudes);
    console.log("No Vistas", solicitudesNoVistas);

    // 2) Si no hay ninguna, no hacemos nada
    if (solicitudesNoVistas.length === 0) {
        return {ok: true, marcadas: 0};
    }

    // 3) Marcar cada solicitud como vista en backend
    for (const solicitud of solicitudesNoVistas) {
        await postJSON(
            `${API}/solicitudes/recibidas/nuevas/vista/${solicitud.id_solicitud}`
        );
    }

    // 4) Invalidar caché relacionada
    cache.solicitudesRecibidas = null;
    cache.solicitudesRecibidasNuevas = null;

    return {
        ok: true,
        marcadas: solicitudesNoVistas.length
    };
}


/* =========================================================
   GETTERS (COORDINADOR)
   ========================================================= */

// 1) Devuelve estadísticas de validaciones por estado (pendientes, aprobadas, rechazadas)
// =========================================================
async function getEstadisticasValidacionesEstado(periodo = "mes") {
    const payload = await getJSON(
        `${API}/coordinador/estadisticas/validaciones/estado?periodo=${periodo}`
    );
    return payload; // {periodo, total, pendientes, aprobadas, rechazadas}
}

// Devuelve estadísticas de validaciones por 7, 90 días
async function getEstadisticasValidacionesPorDia(dias = 7) {
    const payload = await getJSON(
        `${API}/coordinador/estadisticas/validaciones/por-dia?dias=${dias}`
    );
    return payload; // [{fecha, valor}, ...]
}


/* =========================================================
   MATCHES PENDIENTES VALIDACIÓN (COORDINADOR/ADMIN)
   ========================================================= */

// 1) Devuelve listado de matches pendientes de validación
// =========================================================
async function getMatchesPendientesValidacion(force = false) {
    if (!force && cache.matchesPendientesValidacion) return cache.matchesPendientesValidacion;

    const data = await getJSON(`${API}/matches/pendientes`);
    cache.matchesPendientesValidacion = data;
    return cache.matchesPendientesValidacion;
}

// 2) Devuelve los matches pendientes no vistos por el coordinador
// =========================================================
function matchesPendientesNoVistosCoordinador(lista = []) {
    if (!Array.isArray(lista)) return 0;
    return lista.filter((m) => Number(m.visto_por_coordinador) === 0).length;
}

// 3) Validar match (POST)
// =========================================================
async function validarMatch(idMatch) {
    const data = await postJSON(`${API}/matches/validar/${idMatch}`);

    // invalidamos cache para refrescar lista
    cache.matchesPendientesValidacion = null;
    return data;
}

// 4) Denegar (POST)
// =========================================================
async function denegarMatch(idMatch) {
    const data = await postJSON(`${API}/matches/denegar/${idMatch}`);

    // invalidamos cache para refrescar lista
    cache.matchesPendientesValidacion = null;
    return data;
}


// 5) Devuelve listado historial validaciones
// =========================================================
async function getHistorialValidaciones(force = false) {
    if (!force && cache.historialValidaciones) return cache.historialValidaciones;

    const data = await getJSON(`${API}/validaciones`);
    cache.historialValidaciones = data;
    return cache.historialValidaciones;
}

// 6) Número de validaciones no vistas (coordinador)
// =========================================================
async function getValidacionesNuevas(force = false) {
    if (!force && cache.validacionesNuevas != null) return cache.validacionesNuevas;

    const total = await getJSON(`${API}/validaciones/nuevas`); // devuelve número
    cache.validacionesNuevas = total;
    return total;
}

// 7) Marcar validaciones como vistas
// =========================================================
async function marcarValidacionesComoVistas() {
    const data = await postJSON(`${API}/validaciones/vistas`, {});
    cache.validacionesNuevas = null;
    cache.historialValidaciones = null; // opcional
    return data;
}


// =========================================================
// GETTERS (ADMIN)
// =========================================================

// 1) Devuelve listado de usuarios (filtros)
// =========================================================
async function getAdminUsuarios(filtros = {}) {
    const params = new URLSearchParams();

    if (filtros.activo === 0 || filtros.activo === 1) params.set("activo", String(filtros.activo));
    if (filtros.id_rol) params.set("id_rol", String(filtros.id_rol));
    if (filtros.q) params.set("q", filtros.q);

    const url = `${API}/usuarios${params.toString() ? `?${params.toString()}` : ""}`;
    const payload = await getJSON(url);

    // ✅ Normaliza: soporta API que devuelve array directamente o {ok,data}
    if (Array.isArray(payload)) return payload;

    console.log(payload.data);
    return Array.isArray(payload?.data) ? payload.data : [];
}


// 2) Cambia estado de usuario (activo=0|1)
// =========================================================
async function setUsuarioActivo(id_user, activo) {
    const url = `${API}/usuarios/estado/${id_user}`;
    const payload = await postJSON(url, {activo});
    return payload;
}


// =========================================================
// EXPORTS
// =========================================================
export {

    getJSON,
    getUsuarioActual,
    cambiarPassword,
    avisarSiNuevasExpiradas,

    // Trabajador
    getSolicitudesEnviadas,
    getSolicitudesEnviadasExpiradasCount,
    getRespuestasRecibidas,
    getRespuestasExpiradasAviso,
    getSolicitudesRecibidasExpiradasCount,
    getNumeroSolicitudesConRespuestasNoVistas,
    marcarRespuestasSolicitudComoVistas,
    getTurnosUsadosParaResponder,
    crearRespuestaSolicitud,
    getSolicitudesRecibidas,
    getSolicitudesRecibidasNuevas,
    getMatchesActivos,
    crearMatch,
    marcarMatchesComoVistos,
    cancelarSolicitudEnviada,
    marcarSolicitudesRecibidasComoVistas,

    // Coordinador
    getEstadisticasValidacionesEstado,
    getEstadisticasValidacionesPorDia,
    getMatchesPendientesValidacion,
    matchesPendientesNoVistosCoordinador,
    validarMatch,
    denegarMatch,
    getHistorialValidaciones,
    getValidacionesNuevas,
    marcarValidacionesComoVistas,

    // Administrador
    getAdminUsuarios,
    setUsuarioActivo,
};
