'use strict';


// =========================================================
// INTERFAZ
// =========================================================
/**
 * Devuelve la configuración del icono (clase + svg) de forma consistente.
 * Si no existe el estado, cae a "pendiente".
 */
function getIconoTarjeta(tipo) {
    const ICONOS = {
        pendientes: {
          svg: `
        <svg xmlns="http://www.w3.org/2000/svg"
             width="24" height="24" viewBox="0 0 24 24"
             fill="none"
             stroke="currentColor"
             stroke-width="2"
             stroke-linecap="round"
             stroke-linejoin="round"
             class="lucide lucide-clock icono-tarjeta-svg">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
      `
        },

        aprobadas: {
            svg: `
        <svg class="icono-tarjeta-svg" xmlns="http://www.w3.org/2000/svg" fill="none"
             viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M5 13l4 4L19 7"/>
        </svg>
      `
        },

        rechazadas: {
            svg: `
        <svg class="icono-tarjeta-svg" xmlns="http://www.w3.org/2000/svg" fill="none"
             viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      `
        },

        canceladas: {
            svg: `
        <svg class="icono-tarjeta-svg" xmlns="http://www.w3.org/2000/svg" fill="none"
             viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M6 18L18 6M6 6l12 12"/>
        </svg>
      `
        },

        expiradas: {
            svg: `
        <svg class="icono-tarjeta-svg" xmlns="http://www.w3.org/2000/svg" fill="none"
             viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 9v2m0 4h.01M10 3h4m-2 0v2m7 6a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      `
        },

        enviadas: {
            svg: `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
             fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             class="lucide lucide-file-input-icon lucide-file-input">
            <path d="M4 11V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1"/>
            <path d="M14 2v5a1 1 0 0 0 1 1h5"/>
            <path d="M2 15h10"/>
            <path d="m9 18 3-3-3-3"/>
        </svg>
      
      `
        },
          recibidas: {
              svg: `
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
             fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             class="lucide lucide-file-output-icon lucide-file-output">
            <path d="M4.226 20.925A2 2 0 0 0 6 22h12a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v3.127"/>
            <path d="M14 2v5a1 1 0 0 0 1 1h5"/>
            <path d="m5 11-3 3"/>
            <path d="m5 17-3-3h10"/>
           </svg>
       
      `
          },
          check: {
              svg: `
          <svg xmlns="http://www.w3.org/2000/svg"
                 width="24" height="24" viewBox="0 0 24 24"
                 fill="none"
                 stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round"
                 class="lucide lucide-clipboard-check-icon lucide-clipboard-check">
            
              <!-- Clipboard -->
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
              <rect x="8" y="2" width="8" height="4" rx="1"/>
            
              <!-- Check -->
              <path d="m9 14 2 2 4-4"/>
            </svg>
       
      `
          },

          lista: {
              svg: `
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
               viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 6h11"></path>
            <path d="M9 12h11"></path>
            <path d="M9 18h11"></path>
            <path d="M4 6h.01"></path>
            <path d="M4 12h.01"></path>
            <path d="M4 18h.01"></path>
          </svg>
      
      `
        },

    };

    return ICONOS[tipo];
}


// =========================================================
// CREACIÓN DE TARJETAS
// =========================================================
/**
 * Crea una tarjeta estadística reutilizable.
 * @param {Object} cfg
 * @param {string} cfg.etiqueta Texto (ej: "Pendientes")
 * @param {string} cfg.color Clase de color (ej: "azul", "verde", "rojo"...)
 * @param {string} cfg.icono Tipo de icono (pendiente|aprobado|rechazado|cancelado|expirado)
 * @param {string} cfg.id ID del valor (ej: "statPendientes")
 * @param {number|string} [cfg.valor=0] Valor inicial
 */

function crearTarjeta({ titulo, descripcion, color, icono, id, valor = 0 }) {
  const contenedor = document.querySelector(".rejilla-estadisticas");
  if (!contenedor) return;

  const { svg } = getIconoTarjeta(icono) ?? { svg: "" };

  const html = `
    <article class="tarjeta-estadistica">
      <div class="cabecera-tarjeta">
        <div class="icono-tarjeta ${color}" aria-hidden="true">
          ${svg}
        </div>
      </div>

      <div class="valor-estadistica" id="${id}">${String(valor)}</div>
      <div class="etiqueta-estadistica">${titulo}</div>
      <div class="tendencia-estadistica">${descripcion}</div>
    </article>
  `;

 contenedor.innerHTML += html;
}


export {crearTarjeta};
