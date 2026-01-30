'use strict';
import {getCookie} from '/static/js/comun/util.js';


// =========================================================
// CONSTANTES GENERALES
// =========================================================

const API = '/api'
const TODAY = new Date()
const YEAR = TODAY.getFullYear();
const MONTH = TODAY.getMonth() + 1;
let TOKEN = getCookie('JWT')



// =========================================================
// CLASES UI
// =========================================================

// 2.1) CLASES DE ESTADOS

function claseEstado(estado) {
    const e = String(estado || "").toUpperCase();
    console.log('claseEstado', e);

    switch (e) {


        case "PENDIENTE":
        case "PENDIENTE_VALIDACION":
            return "badge-estado--pendiente";
        case "ACTIVO":
        case "CONTESTADA":
        case "VALIDADA":
        case "VALIDADO":
        case "APROBADA":
            return "badge-estado--aprobado";
        case "RESPONDIDA":
        case "RECHAZADA":
        case "RECHAZADO":
            return "badge-estado--rechazado";
        case "BLOQUEADO":
        case "CANCELADA":
        case "CANCELADO":
            return "badge-estado--cancelado";
        case "EXPIRADA":
        case "EXPIRADO":
            return "badge-estado--cancelado";
        default:
            return "";
    }
}

// 2.2 CLASES DE TURNOS

function claseTurno(codigo) {
    switch (String(codigo || "").toUpperCase()) {
        case "M":
            return "badge-turno--M";
        case "T":
            return "badge-turno--T";
        case "N":
            return "badge-turno--N";
        case "L":
            return "badge-turno--L";
        case "/":
            return "badge-turno--saliente";
        default:
            return "";
    }
}

// 2.3 CLASES DE TURNOS CALENDARIO

function claseTurnoCalendario(codigo) {
  switch (String(codigo || "").toUpperCase()) {
    case "M": return {etiqueta: 'Mañana', claseColor: 'calendario-turno--M'};
    case "T": return {etiqueta: 'Tarde', claseColor: 'calendario-turno--T'};
    case "N": return {etiqueta: 'Noche', claseColor: 'calendario-turno--N'};
    case "L": return {etiqueta: 'Libre', claseColor: 'calendario-turno--L'}
    case "/": return {etiqueta: 'Saliente', claseColor: 'calendario-turno--barra'};
    default: return "";
  }
}


// 2.4 CLASES DE TURNOS CALENDARIO

const TURNOS = {
    M: {etiqueta: 'Mañana', claseColor: 'calendario-turno--M'},
    T: {etiqueta: 'Tarde', claseColor: 'calendario-turno--T'},
    N: {etiqueta: 'Noche', claseColor: 'calendario-turno--N'},
    L: {etiqueta: 'Libre', claseColor: 'calendario-turno--L'},
    '/': {etiqueta: 'Saliente', claseColor: 'calendario-turno--barra'}
};



export {API, TODAY, YEAR, MONTH,  TOKEN, TURNOS, claseEstado, claseTurno, claseTurnoCalendario} ;

