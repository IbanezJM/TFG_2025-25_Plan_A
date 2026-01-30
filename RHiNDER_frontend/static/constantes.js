'use strict';
import {getCookie} from '/static/js/comun/util.js';

const API = 'http://127.0.0.1:5001'
const TODAY = new Date()
const YEAR = TODAY.getFullYear();
const MONTH = TODAY.getMonth() + 1;
let TOKEN = getCookie('JWT')
let ID_TRABAJADOR = getCookie('id')


// =========================================================
// CLASES UI
// =========================================================

// CLASES DE ESTADOS
// =========================================================
function claseEstado(estado) {
    const e = String(estado || "").toUpperCase();
    switch (e) {

        case "PENDIENTE":
        case "PENDIENTE_VALIDACION":
            return "badge-estado--pendiente";
        case "CONTESTADA":
            return "badge-estado--aprobado";
        case "RESPONDIDA":
            return "badge-estado--rechazado";
        case "CANCELADA":
            return "badge-estado--cancelado";
        case "EXPIRADA":
            return "badge-estado--cancelado";
        default:
            return "";
    }
}

// CLASES DE TURNOSs
// =========================================================
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

// CLASES DE TURNOS CALENDARIO
// =========================================================

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


// CLASES DE TURNOS CALENDARIO
// =========================================================
const TURNOS = {
    M: {etiqueta: 'Mañana', claseColor: 'calendario-turno--M'},
    T: {etiqueta: 'Tarde', claseColor: 'calendario-turno--T'},
    N: {etiqueta: 'Noche', claseColor: 'calendario-turno--N'},
    L: {etiqueta: 'Libre', claseColor: 'calendario-turno--L'},
    '/': {etiqueta: 'Saliente', claseColor: 'calendario-turno--barra'}
};




export {API, TODAY, YEAR, MONTH,  TOKEN, ID_TRABAJADOR, TURNOS, claseEstado, claseTurno, claseTurnoCalendario} ;

