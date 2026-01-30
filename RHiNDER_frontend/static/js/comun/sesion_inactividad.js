"use strict";

document.addEventListener("DOMContentLoaded", () => {

  // 1) Variables y constantes
  let timer = null;
  const INACTIVIDAD_MS = 15 * 60 * 1000;

  // 2) Logout por inactividad
  function logoutPorInactividad() {
    document.cookie = "JWT=; Max-Age=0; path=/";
    alert("Sesión cerrada por inactividad");
    window.location.href = "/";
  }

  // 3) Reiniciar contador
  function resetTimer() {
    clearTimeout(timer);
    timer = setTimeout(logoutPorInactividad, INACTIVIDAD_MS);
  }

  // 4) Eventos que cuentan como actividad
  ["click", "mousemove", "keydown", "scroll", "touchstart"].forEach(ev =>
    window.addEventListener(ev, resetTimer, { passive: true })
  );

  // 5) Iniciar contador
  resetTimer();

});
