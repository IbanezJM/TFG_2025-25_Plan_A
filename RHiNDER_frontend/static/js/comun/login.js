"use strict";

import { abrirModal, cerrarModal, manejarClickFondoModal, stopPropagationInside,} from "./modales.js";



// =========================================================
// ESTADO GLOBAL
// =========================================================
const MODAL_ID = "forgot-password-modal";

// --- LOGIN ---
let usuarioInput = null;
let usuarioError = null;

let passwordInput = null;
let passwordError = null;

let btnTogglePassword = null;
let eyeOpen = null;
let eyeClosed = null;

let formLogin = null;

// --- MODAL RECUPERACIÓN ---
let modalRecuperacion = null;
let btnOpenForgot = null;
let btnsCloseForgot = [];
let btnSendRecovery = null;

let inputEmail = null;
let errorEmail = null;
let vistaInicial = null;
let vistaConfirmacion = null;

// =========================================================
// INICIO
// =========================================================
window.addEventListener("DOMContentLoaded", () => {
  // 1) Cachear DOM
  cachearElementos();

  // 2) Inicializar login
  initLogin();

  // 3) Inicializar modal recuperación
  initModalRecuperacion();

  // 4) Error de login enviado por el servidor (si existe)
 const serverError = document.getElementById("login-error-general");
if (serverError && serverError.textContent.trim()) {
  mostrarError(usuarioInput, usuarioError, "");
  mostrarError(passwordInput, passwordError, serverError.textContent.trim());
}

});


// =========================================================
// DOM
// =========================================================
function cachearElementos() {
    // Login
    usuarioInput = document.getElementById("usuario");
    usuarioError = document.getElementById("usuario-error");

    passwordInput = document.getElementById("password");
    passwordError = document.getElementById("password-error");

    btnTogglePassword = document.getElementById("toggle-password");
    eyeOpen = document.getElementById("eye-open");
    eyeClosed = document.getElementById("eye-closed");

    formLogin = document.getElementById("login-form");

    // Modal recuperación
    modalRecuperacion = document.getElementById(MODAL_ID);
    btnOpenForgot = document.querySelector("[data-open-forgot]");
    btnsCloseForgot = Array.from(document.querySelectorAll("[data-close-forgot]"));
    btnSendRecovery = document.getElementById("send-recovery-btn");

    inputEmail = document.getElementById("recovery-email");
    errorEmail = document.getElementById("recovery-email-error");
    vistaInicial = document.getElementById("recovery-initial-view");
    vistaConfirmacion = document.getElementById("recovery-confirmation-view");
}

// =========================================================
// LOGIN
// =========================================================
// 1) Inicializar login
function initLogin() {
    btnTogglePassword?.addEventListener("click", () => {
        togglePassword();
    });

    formLogin?.addEventListener("submit", (e) => {
        manejarEnvioLogin(e);
    });
}

// 2) Manejar envío de login
function manejarEnvioLogin(e) {
    e.preventDefault();

    const usuarioValido = validarCampoObligatorio(
        usuarioInput,
        usuarioError,
        "El nombre de usuario es obligatorio."
    );

    const passwordValida = validarCampoObligatorio(
        passwordInput,
        passwordError,
        "La contraseña es obligatoria."
    );

    if (usuarioValido && passwordValida) {
        e.target.submit();
    }
}


// 3) Mostrar / Ocultar password
function togglePassword() {
    if (!passwordInput) return;

    const estaOculta = passwordInput.type === "password";
    passwordInput.type = estaOculta ? "text" : "password";

    if (eyeOpen) eyeOpen.style.display = estaOculta ? "none" : "block";
    if (eyeClosed) eyeClosed.style.display = estaOculta ? "block" : "none";
}

// =========================================================
// MODAL RECUPERACIÓN
// =========================================================

// 4) Modal Recuperación
function initModalRecuperacion() {
    if (modalRecuperacion) stopPropagationInside(modalRecuperacion);

    // Abrir
    btnOpenForgot?.addEventListener("click", () => {
        resetearModalRecuperacion();
        abrirModal(MODAL_ID);
    });

    // Cerrar (botones)
    btnsCloseForgot.forEach((btn) => {
        btn.addEventListener("click", () => {
            cerrarModal(MODAL_ID);
            resetearModalRecuperacion();
        });
    });

    // Cerrar (click fuera) -> SOLO 2 parámetros
    modalRecuperacion?.addEventListener("click", (e) => {
        const clickEnFondo = e.target === modalRecuperacion;

        manejarClickFondoModal(e, MODAL_ID);

        if (clickEnFondo) resetearModalRecuperacion();
    });

    // Enviar
    btnSendRecovery?.addEventListener("click", () => {
        manejarClickEnviarRecuperacion();
    });
}


// 5) Resetear Modal Recuperación
function resetearModalRecuperacion() {
    if (vistaInicial) vistaInicial.style.display = "block";
    if (vistaConfirmacion) vistaConfirmacion.style.display = "none";

    limpiarError(inputEmail, errorEmail);
    if (inputEmail) inputEmail.value = "";
}


// 6) Manejar Enviar
function manejarClickEnviarRecuperacion() {
    const email = (inputEmail?.value || "").trim();

    limpiarError(inputEmail, errorEmail);

    if (!email) {
        mostrarError(inputEmail, errorEmail, "El correo electrónico es obligatorio.");
        return;
    }

    if (!esEmailValido(email)) {
        mostrarError(inputEmail, errorEmail, "Por favor, ingresa un correo válido.");
        return;
    }

    // OK -> cambia vistas
    if (vistaInicial) vistaInicial.style.display = "none";
    if (vistaConfirmacion) vistaConfirmacion.style.display = "block";
}

// =========================================================
// VALIDACIÓN / ERRORES
// =========================================================

// 67 Validar campo obligatorio
function validarCampoObligatorio(input, errorEl, mensaje) {
    limpiarError(input, errorEl);

    if (!input || !input.value.trim()) {
        mostrarError(input, errorEl, mensaje);
        return false;
    }

    return true;
}

// 8) Mostrar error
function mostrarError(input, errorElement, message) {
    if (!input || !errorElement) return;

    input.classList.add("error");
    errorElement.textContent = message;
    errorElement.style.display = "block";
}


// 9) Limpiar error
function limpiarError(input, errorElement) {
    if (!input || !errorElement) return;

    input.classList.remove("error");
    errorElement.textContent = "";
    errorElement.style.display = "none";
}


// 10) Validar email
function esEmailValido(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
