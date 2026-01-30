"use strict";

import {borrarSesion} from "/static/js/comun/util.js";

import {getUsuarioActual, cambiarPassword} from "/static/store/store_api.js";

import {abrirModal, cerrarModal, manejarClickFondoModal} from "/static/js/comun/modales.js";



// =========================================================
// INICIO
// =========================================================
document.addEventListener("DOMContentLoaded", () => {
    // 1) inciar perfil
    initPerfil();

    // 2) formulario cambiar password
    initFormularioPassword();

    // 3) modal logout
    initLogout();
});

/// =========================================================
// 1) PERFIL (pinta usuario)
// =========================================================
async function initPerfil() {

  try {

    const user = await getUsuarioActual();
    pintarUsuario(user);

  } catch (e) {

    console.error(e);

    const nombre = document.getElementById("perfilNombre");
    const rolHero = document.getElementById("perfilRolHero");

    if (nombre) nombre.textContent = "No se pudo cargar el usuario";
    if (rolHero) rolHero.textContent = "";

  }
}

function pintarUsuario(user) {

  const avatar = document.getElementById("perfilAvatar");
  if (avatar) avatar.textContent = iniciales(user.username);

  const nombre = document.getElementById("perfilNombre");
  if (nombre) nombre.textContent = user.username;

  const rolHero = document.getElementById("perfilRolHero");
  if (rolHero) rolHero.textContent = user.rol;

  const username = document.getElementById("perfilUsername");
  if (username) username.textContent = user.username;

  const email = document.getElementById("perfilEmail");
  if (email) email.textContent = user.email;

  const rolBadge = document.getElementById("perfilRolBadge");
  if (rolBadge) rolBadge.textContent = user.rol;
}


// =========================================================
// 2) CAMBIAR CONTRASEÑA (form)
// =========================================================

// 2.1) Inicializar formulario
function initFormularioPassword() {

    const form = document.getElementById("changePasswordForm");
    if (!form) return;

    form.addEventListener("submit", enviarCambioPassword);

    // si escriben, quitamos el error
    ["currentPassword", "newPassword", "confirmPassword"].forEach((id) => {

        const el = document.getElementById(id);

        if (el) el.addEventListener("input", () => mostrarError(""));

    });
}


// 2.2) Enviar cambio de password
async function enviarCambioPassword(e) {

    e.preventDefault();

    const actual =  document.getElementById("currentPassword").value || "";
    const nueva = document.getElementById("newPassword").value || "";
    const confirm =  document.getElementById("confirmPassword").value || "";

    // 1) Validar
    const error = validarPassword(nueva, confirm);

    if (error) {
        mostrarError(error);
        return;
    }

    mostrarError("");

    // 2) Deshabilitar botón mientras se envía
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;

    // 3) Llamar API
      try {
        const resp = await cambiarPassword(actual, nueva);

        if (!resp?.ok) {
            throw new Error(resp?.message || "No se pudo cambiar la contraseña.");
        }

        alert("✅ " + (resp.message || "Contraseña cambiada correctamente."));
        form.reset();

    } catch (err) {
        mostrarError(err.message || "No se pudo cambiar la contraseña.");
    } finally {
        if (btn) btn.disabled = false;
    }

}
// 2.3) Validar Password
function validarPassword(nueva, confirm) {

    if (nueva.length < 4) return "La nueva contraseña debe tener al menos 4 caracteres.";

    if (nueva !== confirm) return "Las contraseñas no coinciden.";

    return ""; // sin error

}

// =========================================================
// 3) LOGOUT (modal) - usando abrirModal/cerrarModal por ID
// =========================================================

// 3.1) Logout (modal)
function initLogout() {

  const btnLogout = document.getElementById("logoutBtn");
  const btnCancel = document.getElementById("cancelLogout");
  const btnConfirm = document.getElementById("confirmLogout");

  const modalId = "logoutModal";
  const modal = document.getElementById(modalId);

  if (!btnLogout || !modal) return;

  // Abrir modal
  btnLogout.addEventListener("click", () => abrirModal(modalId));

  // Cancelar (cerrar)
  if (btnCancel) btnCancel.addEventListener("click", () => cerrarModal(modalId));

  // Confirmar (cerrar sesión)
  if (btnConfirm) {

    btnConfirm.addEventListener("click", () => {

      cerrarModal(modalId);

      borrarSesion();

      window.location.href = "/";

    });

  }

  // Cerrar si hacen click en el fondo (overlay)
  modal.addEventListener("click", (e) => manejarClickFondoModal(e, modalId));
}


// =========================================================
// HELPERS (cosas pequeñas reutilizables)
// =========================================================

// Mostar error en formulario
function mostrarError(msg) {

    const error = document.getElementById("passwordError");
    if (!error) return;

    error.textContent = msg;

    error.classList.toggle("mostrar", Boolean(msg));
}


// Devolver iniciales de username
function iniciales(username) {

    const u = String(username || "").trim();
    if (!u) return "--";

    return u.slice(0, 2).toUpperCase();
}


