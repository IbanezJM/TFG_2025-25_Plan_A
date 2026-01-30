'use strict';


/* ============================================================
   HELPERS COOKIES
   ============================================================ */

// 1)  Get cookie
const getCookie = (name) => {

    // Añadimos un ";" al inicio para evitar errores de coincidencia parcial
    const value = `; ${document.cookie}`;

    // Dividimos el string usando el nombre de la cookie como referencia
    const parts = value.split(`; ${name}=`);

    // Si la cookie existe, parts tendrá dos elementos
    if (parts.length === 2) {

        // Tomamos el último elemento, lo cortamos por ";"
        // y devolvemos únicamente el valor de la cookie
        return parts.pop().split(';').shift();
    }
};


// 2) Borrar cookie
function borrarSesion() {
  document.cookie = "JWT=; Max-Age=0; path=/";
  document.cookie = "rol=; Max-Age=0; path=/";
  document.cookie = "id=; Max-Age=0; path=/";
  document.cookie = "nombre=; Max-Age=0; path=/";
}


/* ============================================================
   HELPERS FECHA
   ============================================================ */


// 3) Actualizar fecha actual -> Formato de salida ejemplo: "Lunes, 25 de enero de 2025".
function fechaActual() {
    const dateEl = document.getElementById('fecha-actual');
    if (!dateEl) return;

    const now = new Date();

    const formatted = now.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });

    // Capitalizar la primera letra
    dateEl.textContent = formatted.charAt(0).toUpperCase() + formatted.slice(1);
}



// 4) Devuelve una fecha en formato ISO (YYYY-MM-DD)
function formatearFechaISO(anio, mesIndex0, dia) {

    // Convertimos el mes de 0–11 a 1–12 y aseguramos dos dígitos
    const mm = String(mesIndex0 + 1).padStart(2, '0');

    // Si la cadena tiene menos de 2 caracteres,
    // rellena por la izquierda con '0' hasta llegar a 2
    const dd = String(dia).padStart(2, '0');

    // Construimos la fecha ISO (compatible con backend y comparaciones)
    return `${anio}-${mm}-${dd}`;
}



// 5) formatearFechaES -> "2025-01-20T10:30:00" -> "20/01/2025"
function formatearFechaES(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-").map(Number);
  const fecha = new Date(y, m - 1, d);
  return fecha.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}



/// 6) soloFecha -> "2025-01-20T10:30:00" -> "2025-01-20"
function soloFecha(fecha) {
  return String(fecha || "").slice(0, 10);
}


// 7) Obtener fecha seleccionada
// Proporciona la fecha seleccionada en formato DD/MM/YYYY

function getFechaSeleccionadaFormateada(diaSeleccionado) {
    if (!diaSeleccionado) return '';

    return new Date(diaSeleccionado.anio, diaSeleccionado.mes, diaSeleccionado.dia)
        .toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
}


export {  getCookie,  borrarSesion,  fechaActual,  formatearFechaISO,  formatearFechaES,  soloFecha, getFechaSeleccionadaFormateada};
