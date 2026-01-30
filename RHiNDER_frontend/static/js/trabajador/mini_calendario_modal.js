"use strict";

import {API, TODAY,claseTurnoCalendario, YEAR, MONTH,} from "/static/js/comun/constantes.js";

import {getJSON, crearRespuestaSolicitud, getTurnosUsadosParaResponder} from "/static/store/store_api.js";

import {formatearFechaISO, formatearFechaES, soloFecha,getFechaSeleccionadaFormateada} from "/static/js/comun/util.js";

import { abrirModal, cerrarModal,  manejarClickFondoModal,  stopPropagationInside,   } from "/static/js/comun/modales.js";

// ---------------------------------------------------------------------------
// ESTADO GLOBAL
// ---------------------------------------------------------------------------

// Turnos del mes actual
let turnosPorFecha = [];
let turnosUsadosParaResponder = new Set();
let fechasEmisorLibre = new Set();

// Fecha actual
let displayMesActual;
let fechaInicial;
let hoy;

// día seleccionado
let diaSeleccionado = null;
let solicitudActiva = null;

//contador de meses
let contadorMeses = 1;

// Calendario ya inicializado
let yaInicializado = false;


// =========================================================
// INICIO
// =========================================================
async function cargarModalMiniCalendario(solicitud) {

    // 1) Datos
    await cargarDatos(solicitud);

    // 2) Calendario
    await iniciarCalendario();

    // 3) Modales
    configurarModalesCalendario();

    // 4) Abrir Modal
    abrirModal("modal-mini-calendario");
}


// 1) Datos

// 1.1) Cargar datos de solicitud
async function cargarDatos(solicitud){

    solicitudActiva = solicitud;

    // 1) RESET de navegación del calendario
    contadorMeses = 1;

    // 2) Fecha de referencia "hoy"
    fechaInicial = new Date(YEAR, MONTH - 1, 1);
    hoy = new Date(TODAY);
    hoy.setHours(0, 0, 0, 0);

    // 3) Obtener turno del mes
    await dameTurnoActual(YEAR, MONTH);

    // 4) Fechas Emisor Libre
    fechasEmisorLibre = await cargarDiasLibresEmisor(YEAR, MONTH);

    // 5) turnos usados para responder
    const usados = await getTurnosUsadosParaResponder();
    turnosUsadosParaResponder = new Set(
        usados.map(x => Number(x.id_turno_trabajador_receptor)).filter(Boolean)
    );
}


// 1.2) Obtener turno del mes
async function dameTurnoActual(year = YEAR, month = MONTH) {

    console.log('Dame turno actual (year, month):', year, ' : ', month);

    const url = `${API}/turnos?year=${year}&month=${month}`;

    turnosPorFecha = await getJSON(url);

    return turnosPorFecha;

}

// 1.3)  Cargar dias libres del emisor
async function cargarDiasLibresEmisor(year, month) {

    const idEmisor = Number(solicitudActiva?.id_emisor);

    if (!idEmisor) return new Set();

    const url = `${API}/turnos/libres/${idEmisor}?year=${year}&month=${month}`;

    const data = await getJSON(url);

    // data esperado: [{fecha_turno:"2026-01-10"}, ...]

    return new Set(
        (data || [])
            .map(x => String(x.fecha_turno).slice(0, 10))
            .filter(Boolean)
    );
}

// ---------------------------------------------------------------------------
// CALENDARIO
// ---------------------------------------------------------------------------

// 2) Calendario
async function iniciarCalendario() {

  // 1) Eventos
    if (!yaInicializado) {

        eventoBtnMesAnterior();

        eventoBtnMesSiguiente();

        yaInicializado = true;
    }

    cargarEventosCalendario();

    // 2) Renderizar el calendario con el mes actual y sus turnos
    await renderizarCalendario();


}


// 2.1) Evento botón para navegar al mes anterior
function eventoBtnMesAnterior() {

    const btnMesAnterior = document.getElementById("miniPrevMonth");

    btnMesAnterior.addEventListener("click", async function () {

        // 1) Resta 1 al contador de meses
        contadorMeses--;

        // 2) Poner día 1 para evitar saltos raros (31 → 30, etc.)
        fechaInicial.setDate(1);

        // 3) Retrocedemos un mes
        fechaInicial.setMonth(fechaInicial.getMonth() - 1);

        const year = fechaInicial.getFullYear();
        const month = fechaInicial.getMonth() + 1; // backend espera 1–12

        // 4) Turnos del RECEPTOR
        await dameTurnoActual(year, month);

        // 5) Días LIBRES del EMISOR
        fechasEmisorLibre = await cargarDiasLibresEmisor(year, month);

        // 6) Renderizar calendario
        await renderizarCalendario();
    });
}


// 2.2) Evento botón para navegar al mes siguiente
function eventoBtnMesSiguiente() {

    const btnMesSiguiente = document.getElementById("miniNextMonth");

    btnMesSiguiente.addEventListener("click", async function () {

        // 1) Suma 1 al contador de meses
        contadorMeses++;

        // 2) Reset día
        fechaInicial.setDate(1);

        // 3) Avanzamos un mes
        fechaInicial.setMonth(fechaInicial.getMonth() + 1);

        const year = fechaInicial.getFullYear();
        const month = fechaInicial.getMonth() + 1;

        // 4) Turnos del RECEPTOR
        await dameTurnoActual(year, month);

        // 5) 🔥 AQUÍ: días LIBRES del EMISOR
        fechasEmisorLibre = await cargarDiasLibresEmisor(year, month);

        // 6) Renderizar calendario
        await renderizarCalendario();
    });
}

// 2.3 Eventos para cerrar el modal calendario
function cargarEventosCalendario() {

    // Cerrar con botón
    document.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-close-modal]");
        if (!btn) return;

        const modalId = btn.dataset.closeModal;

        cerrarModal(modalId);
    });

    // Cerrar al pulsar fondo
    const modalMiniCal = document.getElementById("modal-mini-calendario");
    modalMiniCal?.addEventListener("click", (e) =>
        manejarClickFondoModal(e, "modal-mini-calendario")
    );
}

// 2.4) Renderizar el calendario
async function renderizarCalendario() {

    const cuadriculaCalendario = document.getElementById('miniCalendarGrid'); // Cuadricula calendario

    console.log('renderizarCalendario');

    // 1) Obtener datos del mes actual
    const anio = fechaInicial.getFullYear();
    const mes = fechaInicial.getMonth();


    // 2) Panel de Navegación entre Fechas
    displayMesActual = document.getElementById('miniCurrentMonth'); // Navegación mes

    // a. Formatear visualización de mes actual:
    // - El formato en español ("es-ES") - `month: 'long'` (ej. "diciembre")s - `year: 'numeric'`(ej. "2025")
    displayMesActual.textContent = fechaInicial.toLocaleDateString(
        'es-ES', {
            month: 'long',
            year: 'numeric'
        });

    // b. Mostrar u Ocultar botones de desplazamiento de mes anterior y siguiente
    const btnMesAnterior = document.getElementById('miniPrevMonth');
    const btnMesSiguiente = document.getElementById('miniNextMonth');

    switch (contadorMeses) {
        case 1:
            btnMesAnterior.disabled = true;
            btnMesAnterior.classList.add('btn--disabled');
            btnMesAnterior.title = "No puedes ir a meses anteriores";
            break;
        case 2: {
            btnMesAnterior.disabled = false;
            btnMesAnterior.classList.remove('btn--disabled');
            btnMesSiguiente.disabled = false;
            btnMesSiguiente.classList.remove('btn--disabled');
            break;
        }
        case 3:
            btnMesSiguiente.disabled = true;
            btnMesSiguiente.classList.add('btn--disabled');
            btnMesSiguiente.title = "No puedes ir a meses posteriores";
            break;
    }


    console.log('displayMesActual:', fechaInicial.toLocaleDateString('es-ES', {month: 'long', year: 'numeric'}));

    // 3) Limpia celdas anteriores
    const celdasPrevias = cuadriculaCalendario.querySelectorAll('.calendario-dia, .calendario-dia--otro-mes');
    celdasPrevias.forEach(el => el.remove());

    // 4) Calcular días del mes actual
    // a. Primer día del mes a renderizar -> para calcular el día de la semana de inicio
    const primerDiaMes = new Date(anio, mes, 1);

    // b. Número total de días del mes actual -> día 0 del mes siguiente = último día del mes actual
    const diasEnMes = new Date(anio, mes + 1, 0).getDate();

    // c. Día de la semana en el que empieza el mes (0 = lunes, 6 = domingo)
    // Sumamos 6 y divide entre 7 -> obtener resto (%) -> desplazamiento de valores -> lunes pasa a ser 0
    const inicioSemana = (primerDiaMes.getDay() + 6) % 7;

    // 5) Añadir celdas vacías antes del día 1 del mes
    // xa desplazar calendario hasta el día correcto de la semana -> si mes empieza en jueves -> se crean 3 celdas vacías
    for (let i = 0; i < inicioSemana; i++) {
        const celdaVacia = document.createElement('div');
        celdaVacia.className = 'calendario-dia calendario-dia--otro-mes';
        cuadriculaCalendario.appendChild(celdaVacia);
    }

    // 6) Añadir una celda por cada día del mes

    // a.  Recorrer todos los días reales del mes (1 → último día)
    for (let dia = 1; dia <= diasEnMes; dia++) {

        // a1.Creamos la celda visual del día
        const celdaDia = document.createElement('div');

        // a2. Fecha completa del día actual del bucle (año, mes, día)
        const fechaDia = new Date(anio, mes, dia);

        // a3.  Comprobamos si el día ya ha pasado o si es hoy
        const esPasado = fechaDia.getTime() <= hoy.getTime();
        const esHoy = fechaDia.getTime() === hoy.getTime();


        // a4. Pasar fecha a formato ISO (YYYY-MM-DD) xa poder buscar el turno en respuesta de backend
        // turnosPorFecha mediante la f(x) buscarTurnosPorFechaISO(keyFecha)
        const keyFecha = formatearFechaISO(anio, mes, dia);

        const emisorLibreEseDia = fechasEmisorLibre.has(keyFecha);
        console.log('keyFecha:', keyFecha);

        // a5. Buscamos si existe un turno para ese día en los datos recibidos
        const turnoBD = buscarTurnoPorFechaISO(keyFecha); // {} || null
        console.log('turnoBD:', turnoBD);

        // Si turno -> nomenclatura || si no- > 'X'
        const nomenclaturaTurno = turnoBD
            ? turnoBD.nomenclatura
            : 'X';

        // comprobar si es libre o saliente
        const esLibre_Saliente = nomenclaturaTurno === 'L' || nomenclaturaTurno === '/';

        // Comprobar si ya se ha utilizado para otra solicitud de cambio

        const idTT = turnoBD ? Number(turnoBD.id_turno_trabajador) : null;
        const yaUtilizadoParaRespuesta = idTT ? turnosUsadosParaResponder.has(idTT) : false;


        // a6. Obtenemos la información visual del turno

        // Color
        const infoVisualTurno = claseTurnoCalendario(nomenclaturaTurno);

        // Etiqueta
        const etiquetaTurno = turnoBD
            ? turnoBD.turno
            : infoVisualTurno.etiqueta;

        // a7. Añadir Clases
        // - base de la celda del calendario
        celdaDia.className = 'calendario-dia';

        //- clase día actual (Habilitado visualmente)
        if (esHoy) celdaDia.classList.add('calendario-dia--hoy');

        // - clase días pasados (Deshabilitado visualmente)
        const deshabilitado = esPasado || esLibre_Saliente || yaUtilizadoParaRespuesta || !emisorLibreEseDia;

        if (deshabilitado) {
            celdaDia.classList.add("calendario-dia--deshabilitado");
        }

        //- clase para turnos con solicitud de cambio
        if (yaUtilizadoParaRespuesta) celdaDia.classList.add('calendario-dia--solicitud-enviada');

        // a8. Añadir contenido HTML de la celda:
        // - número del día
        // - badge del turno con su color correspondiente
        celdaDia.innerHTML = `
            <span class="calendario-numero-dia">${dia}</span>
            <div class="calendario-badge-turno ${infoVisualTurno.claseColor}">
              ${nomenclaturaTurno}
            </div>
          `;

        // a9. Evento -> Solo permitimos interacción en días que no han pasado
        if (!deshabilitado) {

            // Evento
            celdaDia.addEventListener('click', function () {

                // a9.1 -Guardar info día seleccionado -> xa usarlos modales
                diaSeleccionado = {
                    dia,
                    mes,
                    anio,
                    etiquetaTurno,
                    id_turno: turnoBD ? turnoBD.id_turno : null,
                    id_turno_trabajador_receptor: turnoBD ? Number(turnoBD.id_turno_trabajador) : null,
                    nomenclatura: nomenclaturaTurno
                };
                console.log('diaSeleccionado:', diaSeleccionado);


                // a9.2 - Formateamos la fecha seleccionada para mostrarla al usuario
                const fechaFormateada = new Date(anio, mes, dia).toLocaleDateString('es-ES', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                });

                // a9.3 - Actualizamos el texto del modal con la fecha seleccionada
                const labelFecha = document.getElementById('modal-date-label');

                if (labelFecha) {
                    labelFecha.textContent = 'Día seleccionado: ' + fechaFormateada;
                }

                cargarModalConfirmar('¿Confirmas enviar esta solicitud de cambios?', diaSeleccionado);
                // Abrimos el modal para solicitar el cambio de turno
                abrirModal('modal-responder-solicitud');
            });
        }

        // Añadimos la celda del día al grid del calendario
        cuadriculaCalendario.appendChild(celdaDia);
    }

}



// ---------------------------------------------------------------------------
// MODALES
// ---------------------------------------------------------------------------


// 3) Cargar y configurar los modales
function configurarModalesCalendario() {

    // 1) Cargar modal de solicitud de cambio de turno
    cargarModalSolicitar('Respuesta a la solicitud de cambio de turno', diaSeleccionado);


    // 2) Cargar modal de confirmación de cambio de turno
    cargarModalConfirmar('¿Confirmas enviar esta solicitud de cambios?', diaSeleccionado);

    // 3) Cargar modal de Exito de cambio de turno-> pasar qué hacer cuando se cierre el modal de éxito

    cargarModalExito(async () => {
        await getTurnosUsadosParaResponder(true);   // refresca el Set (turnos con solicitud)
        await renderizarCalendario();      // vuelve a pintar el calendario
    });

}

// ==========================
// MODAL 1: SOLICITAR DIA
// ==========================

// 3.1) Cargar modal de solicitud de cambio de turno
function cargarModalSolicitar(titulo, diaSeleccionado) {

    const modal = document.getElementById("modal-responder-solicitud");
    if (!modal) return;

    // 1) Pintamos el contenido primero
    modal.innerHTML = `
    <div class="modal-content">
      <header class="modal-header">
        <h2 id="titulo-solicitar">${titulo}</h2>
        <p id="modal-date-label"></p>
      </header>

      <div class="modal-acciones">
        <button class="btn btn--secondary" type="button" id="btn-cancelar-solicitud">
          Cancelar
        </button>

        <button class="btn btn--primary" type="button" id="btn-enviar-solicitud">
          Enviar solicitud
        </button>
      </div>
    </div>
  `;

    // 2) Buscamos los botones (ya existen)
    const btnCancelar = modal.querySelector("#btn-cancelar-solicitud");
    const btnEnviar = modal.querySelector("#btn-enviar-solicitud");

    // 3) Evitar que el click dentro cierre el modal (AHORA existe .modal-content)
    stopPropagationInside(modal);

    // 4) Eventos

    // Boton Cancelar
    btnCancelar.addEventListener("click", (e) => {
        e.preventDefault();
        cerrarModal("modal-responder-solicitud");
    });

    // Boton Enviar
    btnEnviar.addEventListener("click", (e) => {
        e.preventDefault();
        cerrarModal("modal-responder-solicitud");

        //  Resumen de la solicitud
        const resumen = document.getElementById("confirm-summary");
        if (resumen && diaSeleccionado) {
            resumen.textContent =
                `¿Confirmas enviar la solicitud para el día ${getFechaSeleccionadaFormateada(diaSeleccionado)} (${diaSeleccionado.etiquetaTurno})?`;
        }
        abrirModal("modal-confirmar-respuesta");
    });
}


// ==========================
// MODAL 2:  CONFIRMAR DIA
// ==========================

// 3.2) Cargar modal de confirmación de cambio de turno
function cargarModalConfirmar(titulo, diaSeleccionado) {
    const modal = document.getElementById("modal-confirmar-respuesta");
    if (!modal) return;

    // 1) Pintamos el contenido primero
    modal.innerHTML = `
      <div class="modal-content">
        <header class="modal-header">
            <h2 id="titulo-confirmar-cambio">Confirmar solicitud</h2>
            <p id="confirm-summary">${titulo}</p>
        </header>

        <div class="modal-acciones">
            <button class="btn btn--secondary" type="button" id="btn-cancelar-confirmar">
                Cancelar
            </button>
            <button class="btn btn--primary" type="button" id="btn-confirmar-confirmar">
                Confirmar
            </button>
        </div>
    </div>
  `;

    // 2) Buscamos los botones (ya existen)
    const btnCancelarConfirmacion = modal.querySelector("#btn-cancelar-confirmar");
    const btnEnviarConfirmacion = modal.querySelector("#btn-confirmar-confirmar");

    // 3) Evitar que el click dentro cierre el modal (AHORA existe .modal-content)
    stopPropagationInside(modal);


    // 4) Eventos

    // Boton Cancelar
    if (btnCancelarConfirmacion) {

        btnCancelarConfirmacion.addEventListener('click', function (e) {

            e.preventDefault();

            cerrarModal('modal-confirmar-respuesta');
        });

    }

    //boton enviar
    if (btnEnviarConfirmacion) {

        btnEnviarConfirmacion.addEventListener('click', async (e) => {

            e.preventDefault();

            if (!solicitudActiva?.id_solicitud) {
                alert("No hay solicitud activa (id_solicitud).");
                return;
            }

            if (!diaSeleccionado?.id_turno_trabajador_receptor) {
                alert("No hay turno seleccionado para responder.");
                return;
            }

            cerrarModal('modal-confirmar-respuesta');

            try {
                await crearRespuestaSolicitud(
                    Number(solicitudActiva.id_solicitud),
                    Number(diaSeleccionado.id_turno_trabajador_receptor)
                );

                // pintar datos en éxito
                const elFecha = document.getElementById('exito-fecha');
                const elTurno = document.getElementById('exito-turno');
                if (elFecha) elFecha.textContent = getFechaSeleccionadaFormateada(diaSeleccionado);
                if (elTurno) elTurno.textContent = diaSeleccionado.etiquetaTurno;

                abrirModal('modal-exito-respuesta');

            } catch (err) {
                alert(err.message || "No se pudo enviar la respuesta. Mira la consola.");
            }
        });
    }

}


// ==========================
// MODAL 3:  EXITO DIA
// ==========================

 // 3.3) Cargar modal de Exito de cambio de turno
function cargarModalExito(onClose) {

    const modal = document.getElementById("modal-exito-respuesta");
    if (!modal) return;

    // 1) Pintamos el contenido primero
    modal.innerHTML = `
    <div class="modal-content">
      <header class="modal-header">
        <h2 id="titulo-exito">Tu solicitud ha sido enviada correctamente.</h2>
      </header>

      <div class="modal-info">
        <div class="modal-info__bloque">
          <div class="modal-info__label">Fecha seleccionada</div>
          <div class="modal-info__valor" id="exito-fecha">—</div>
        </div>

        <div class="modal-info__bloque">
          <div class="modal-info__label">Turno ofrecido</div>
          <div class="modal-info__valor" id="exito-turno">—</div>
        </div>
      </div>

      <div class="modal-acciones">
        <button class="btn btn--primary" type="button" id="btn-cerrar-exito">
          Volver al calendario
        </button>
      </div>
    </div>
  `;

    // 2) Buscamos los botones (ya existen)
    const btnCerrarExito = modal.querySelector("#btn-cerrar-exito");


    // 3) Evitar que el click dentro cierre el modal (AHORA existe .modal-content)
    stopPropagationInside(modal);


    // 4) Eventos

    // Botona cerrar con boton
    if (btnCerrarExito) {
        btnCerrarExito.addEventListener("click", async (e) => {
            e.preventDefault();
            cerrarModal("modal-exito-respuesta");
            document.location.reload();

            // ✅ si me pasaron callback, lo ejecuto
            if (typeof onClose === "function") {
                await onClose();
            }
        });
    }

    // ✅ cerrar pulsando fuera del modal
    modal.addEventListener("click", async (e) => {
        if (e.target === modal) {
            cerrarModal("modal-exito-respuesta");
            document.location.reload();

            if (typeof onClose === "function") {
                await onClose();
            }
        }
    });
}



// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------
/**
 * buscarTurnoPorFechaISO(fechaISO)
 *
 * Busca un turno por su fecha ISO en el array de turnosPorFecha.
 * @param fechaISO
 * @returns {*|null}
 */

function buscarTurnoPorFechaISO(fechaISO) {
    return turnosPorFecha.find(t => t.fecha_turno === fechaISO) || null;
}

export {cargarModalMiniCalendario};
