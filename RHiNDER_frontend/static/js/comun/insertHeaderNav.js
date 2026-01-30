"use strict";

/* ============================================================
   INICIO
   ============================================================ */
document.addEventListener("DOMContentLoaded", function () {

    cargarHeader();

    cargarFooter();
});


/* ============================================================
   CARGA DINÁMICA DEL HEADER
   ============================================================ */

function cargarHeader() {
    fetch("/static/templates/comun/header.html")
        .then(res => res.text())            // Convertimos la respuesta en texto plano
        .then(data => {
            document.getElementById("header-placeholder").innerHTML = data;
        })
        .catch(err => console.error("Error cargando header:", err));
}


/* ============================================================
   CARGA DINÁMICA DEL FOOTER / BOTTOM NAV
   ============================================================ */
function cargarFooter() {
    fetch("/templates/comun/nav.html")
        .then(res => res.text())
        .then(data => {
            document.getElementById("nav-placeholder").innerHTML = data;
        })
        .catch(err => console.error("Error cargando footer:", err));
}
