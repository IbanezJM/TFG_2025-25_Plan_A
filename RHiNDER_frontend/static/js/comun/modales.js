'use strict';

/* ============================================================
   HELPERS GENÉRICOS DE MODALES (POR ID)
   ============================================================ */
// 1) Abrir Modal
function abrirModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.hidden = false;
    modal.classList.add('visible');
}



// 2) Cerrar Modal
function cerrarModal(modalId) {
    const modal = document.getElementById(modalId);
    console.log('cerrarModalPorId', modalId);
    if (!modal) return;

    modal.classList.remove('visible');
    modal.hidden = true;
}


// 3) Manejar Click Fondo Modal
function manejarClickFondoModal(e, modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    // Solo cerramos si el clic fue exactamente sobre el overlay
    if (e.target === modal) {
        cerrarModal(modalId);
    }
}


// 4) Stop Propagation Inside
// Si el  modal tiene un contenedor interno, evita que el click se propague al overlay
function stopPropagationInside(modalEl) {
    if (!modalEl) return;

    const panel = modalEl.querySelector('.modal-content, .modal__content, [data-modal-content]');
    if (!panel) return;

    panel.addEventListener('click', (e) => e.stopPropagation());
}




export { abrirModal,  cerrarModal,  manejarClickFondoModal,  stopPropagationInside, };