"use strict";


// =========================================================
// CREAR PAGINACIÓN
// =========================================================
function crearPaginacion({ contenedor, totalItems, paginaActual, pageSize = 10,  onPageChange,}){

  if (!contenedor) return;

  const totalPaginas = Math.max(1, Math.ceil(totalItems / pageSize));

  // Si por filtros te quedas sin páginas, ajustamos
  if (paginaActual > totalPaginas) paginaActual = totalPaginas;
  if (paginaActual < 1) paginaActual = 1;


  contenedor.innerHTML = `
    <div class="paginacion">
    
        <!-- boton prev -->
      <button class="paginacion__btn" data-accion="prev" ${paginaActual === 1 ? "disabled" : ""}>
        ‹ Anterior
      </button>

       <!-- paginas -->
      <span class="paginacion__info">
        Página <strong>${paginaActual}</strong> de <strong>${totalPaginas}</strong>
      </span>
      
       <!-- boton next -->
      <button class="paginacion__btn" data-accion="next" ${paginaActual === totalPaginas ? "disabled" : ""}>
        Siguiente ›
      </button>
      
    </div>
  `;

  contenedor.querySelector('[data-accion="prev"]')?.addEventListener("click", () => {
    if (paginaActual > 1) onPageChange(paginaActual - 1);
  });

  contenedor.querySelector('[data-accion="next"]')?.addEventListener("click", () => {
    if (paginaActual < totalPaginas) onPageChange(paginaActual + 1);
  });
}

// =========================================================
// PAGINAR LISTA
// =========================================================
function paginarLista(lista = [], paginaActual = 1, pageSize = 10) {

  const start = (paginaActual - 1) * pageSize;

  return lista.slice(start, start + pageSize);

}

export { crearPaginacion, paginarLista };
