'use strict';

import {API, YEAR, MONTH, TODAY, TURNOS, claseTurnoCalendario, TOKEN} from '/static/js/comun/constantes.js';

import {getJSON, getSolicitudesEnviadas} from '/static/store/store_api.js'

import {formatearFechaISO,getFechaSeleccionadaFormateada,} from '../comun/util.js';

import {abrirModal, cerrarModal, stopPropagationInside,  manejarClickFondoModal} from '/static/js/comun/modales.js'


// ---------------------------------------------------------------------------
// ESTADO GLOBAL
// ---------------------------------------------------------------------------

// Turnos del mes actual
let turnosPorFecha = [];
let turnosConSolicitud = new Set();

// Fecha actual
let displayMesActual;
let fechaInicial;
let hoy;


// dia seleccionado
let diaSeleccionado = null;

//contador de meses
let contadorMeses = 1;

// Calendario ya inicializado
let yaInicializado = false;


// ---------------------------------------------------------------------------
// INICIO
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', iniciarPagina);


// FUNCIÓN INICIALIZADORA
async function iniciarPagina() {

    // 1)RESET de navegación del calendario
    contadorMeses = 1;

    // 2) Establecer fecha inicial y mes actual
    fechaInicial = new Date(YEAR, MONTH - 1, 1); // Primer día del mes
    hoy = TODAY;
    hoy.setHours(0, 0, 0, 0); // Día actual

    // 3) Obtener turno del mes
    await dameTurnoActual(YEAR, MONTH);

    // 4) Obtener solicitudes enviadas
    await dameSolicitudesEnviadas();

    // 5) Inicializar calendario
    iniciarCalendario();

    // 6) Configurar modales
    configurarModalesCalendario();
}


// 2) Obtener turno del mes
async function dameTurnoActual(year = YEAR, month = MONTH) {

    const url = `${API}/turnos?year=${year}&month=${month}`;

    turnosPorFecha = await getJSON(url);

    return turnosPorFecha;

}


// 3) Obtener solicitudes enviadas
async function dameSolicitudesEnviadas() {


    const solicitudes = await getSolicitudesEnviadas(true); // <- cache si ya estaba

    turnosConSolicitud = new Set(solicitudes.map(s => s.id_turno_trabajador));

}


// ---------------------------------------------------------------------------
// CALENDARIO
// ---------------------------------------------------------------------------

// 4) Inicializar calendario
function iniciarCalendario() {



    // 1) Eventos
    if (!yaInicializado) {

        eventoBtnMesAnterior();

        eventoBtnMesSiguiente();

        yaInicializado = true;
    }

    // 2) Renderizar el calendario con el mes actual y sus turnos
    renderizarCalendario();

    // 3) Renderizar leyenda
    renderizarLeyenda();

}


// 4.2) Evento botón para navegar al mes anterior
function eventoBtnMesAnterior() {


    const btnMesAnterior = document.getElementById('prevMonth');

    btnMesAnterior.addEventListener('click', async function () {

        // Resta 1 al contador de meses
        contadorMeses--;

        // Poner día 1 para evitar saltos al cambiar de mes desde días como 31
        fechaInicial.setDate(1);

        // Retrocedemos un mes sobre la fecha de referencia
        fechaInicial.setMonth(fechaInicial.getMonth() - 1);

        // Cargamos los turnos -> backend espera el mes en formato (1–12)-> sumar 1 a mes
        await dameTurnoActual(fechaInicial.getFullYear(), fechaInicial.getMonth() + 1);

        // Renderizar el calendario con el nuevo mes y sus turnos
        await renderizarCalendario();
    });
}


// 4.3) Evento botón para navegar al mes siguiente
function eventoBtnMesSiguiente() {


    const btnMesSiguiente = document.getElementById('nextMonth');

    btnMesSiguiente.addEventListener('click', async function () {

        contadorMeses++;

        fechaInicial.setDate(1);

        fechaInicial.setMonth(fechaInicial.getMonth() + 1);

        await dameTurnoActual(fechaInicial.getFullYear(), fechaInicial.getMonth() + 1);

        await renderizarCalendario();
    });

}


// 4.4) Renderizar el calendario con el mes actual y sus turnos
async function renderizarCalendario() {


    // 1) Obtener datos del mes actual
    const anio = fechaInicial.getFullYear();
    const mes = fechaInicial.getMonth();


    // 2) Panel de Navegación entre Fechas
    displayMesActual = document.getElementById('currentMonth'); // Navegación mes

    // a. Formatear visualización de  mes actual:
    // - El formato en español ("es-ES") - `month: 'long'` (ej. "diciembre")s - `year: 'numeric'`(ej. "2025")
    displayMesActual.textContent = fechaInicial.toLocaleDateString(
        'es-ES', {
            month: 'long',
            year: 'numeric'
        });

    // b. Mostrar u Ocultar botones de desplazamiento de mes anterior y siguiente
    const btnMesAnterior = document.getElementById('prevMonth');
    const btnMesSiguiente = document.getElementById('nextMonth');

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


    const cuadriculaCalendario = document.getElementById('calendarGrid'); // Cuadricula calendario

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


        // a5. Buscamos si existe un turno para ese día en los datos recibidos
        const turnoBD = buscarTurnoPorFechaISO(keyFecha); // {} || null


        // Si turno -> nomenclatura || si no- > 'X'
        const nomenclaturaTurno = turnoBD
            ? turnoBD.nomenclatura
            : 'X';

        // comprobar si es libre o saliente
        const esLibre_Saliente = nomenclaturaTurno === 'L' || nomenclaturaTurno === '/';

        // comprobar si ya tiene solicitud de cambio
        const idTT = turnoBD ? turnoBD.id_turno_trabajador : null;
        const yaTieneSolicitud = idTT ? turnosConSolicitud.has(idTT) : false;

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
        if (esPasado || esLibre_Saliente || yaTieneSolicitud) celdaDia.classList.add('calendario-dia--deshabilitado');

        //- clase para turnos con solicitud de cambio
        if (yaTieneSolicitud) celdaDia.classList.add('calendario-dia--solicitud-enviada');

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
        if (!esPasado && !esLibre_Saliente && !yaTieneSolicitud) {

            // Evento
            celdaDia.addEventListener('click', function () {

                // a9.1 -Guardar info día seleccionado -> xa usarlos modales
                diaSeleccionado = {
                    dia,
                    mes,
                    anio,
                    etiquetaTurno,
                    id_turno: turnoBD ? turnoBD.id_turno : null,
                    id_turno_trabajador: turnoBD ? turnoBD.id_turno_trabajador : null,
                    nomenclatura: nomenclaturaTurno
                };

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
                abrirModal('modal-solicitar');
            });
        }

        // Añadimos la celda del día al grid del calendario
        cuadriculaCalendario.appendChild(celdaDia);
    }

}


// 4.5) Renderizar Leyenda de turnos
function renderizarLeyenda() {


    const contenedor = document.getElementById('legend-items-container');

    contenedor.innerHTML = ""; // limpiamos contenido previo

    // Recorremos los turnos disponibles en el objeto TURNOS para crear los elementos HTML
    for (const clave in TURNOS) {

        const info = TURNOS[clave]; // {claseColor, etiqueta}

        const item = document.createElement("div");

        item.className = "leyenda-turnos__item";

        item.innerHTML = `
                  <div class="leyenda-turnos__badge ${info.claseColor}">
                    ${clave}
                  </div>
                  <span>${info.etiqueta}</span>
                `;

        contenedor.appendChild(item);
    }

}


// ---------------------------------------------------------------------------
// MODALES
// ---------------------------------------------------------------------------

// 5) Cargar y configurar los modales
function configurarModalesCalendario() {


    // 1) Cargar modal de solicitud de cambio de turno
    cargarModalSolicitar('Solicitud de cambio de turno', diaSeleccionado);

    // 2) Cargar modal de confirmación de cambio de turno
    cargarModalConfirmar('¿Confirmas enviar esta solicitud de cambios?', diaSeleccionado);

    // 3) Cargar modal de Exito de cambio de turno
    // le pasas qué hacer cuando se cierre el modal de éxito
    cargarModalExito(async () => {
        await dameSolicitudesEnviadas();   // refresca el Set (turnos con solicitud)
        await renderizarCalendario();      // vuelve a pintar el calendario
    });

}


// 5.1) MODAL 1: Solicitar dia de cambio de turno
function cargarModalSolicitar(titulo, diaSeleccionado) {


    const modal = document.getElementById("modal-solicitar");
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
    btnCancelar.addEventListener("click", (e) => {
        e.preventDefault();
        cerrarModal("modal-solicitar");
    });

    btnEnviar.addEventListener("click", (e) => {
        e.preventDefault();
        cerrarModal("modal-solicitar");

        //  Resumen de la solicitud
        const resumen = document.getElementById("confirm-summary");
        if (resumen && diaSeleccionado) {
            resumen.textContent =
                `¿Confirmas enviar la solicitud para el día ${getFechaSeleccionadaFormateada(diaSeleccionado)} (${diaSeleccionado.etiquetaTurno})?`;
        }
        abrirModal("modal-confirmar");
    });
}


// 5.2) MODAL 2: SConfirmar dia de cambio de turno
function cargarModalConfirmar(titulo, diaSeleccionado) {
    const modal = document.getElementById("modal-confirmar");
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
    if (btnCancelarConfirmacion) {

        btnCancelarConfirmacion.addEventListener('click', function (e) {

            e.preventDefault();

            cerrarModal('modal-confirmar');
        });

    }

    if (btnEnviarConfirmacion) {

        btnEnviarConfirmacion.addEventListener('click', async (e) => {
            e.preventDefault();

            cerrarModal('modal-confirmar');

            try {
                // ✅ SOLO UNA VEZ
                await enviarSolicitudCambioTurno(diaSeleccionado);

                // pintar datos en modal éxito
                const elFecha = document.getElementById('exito-fecha');
                const elTurno = document.getElementById('exito-turno');
                if (elFecha) elFecha.textContent = getFechaSeleccionadaFormateada(diaSeleccionado);
                if (elTurno) elTurno.textContent = diaSeleccionado.etiquetaTurno;

                abrirModal('modal-exito');

            } catch (err) {
                alert("No se pudo enviar la solicitud. Mira la consola.");
            }
        });
    }

}

// 5.3) MODAL 3: Exito solicitar dia de cambio de turno

function cargarModalExito(onClose) {

    const modal = document.getElementById("modal-exito");
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

    // ✅ cerrar con botón
    if (btnCerrarExito) {
        btnCerrarExito.addEventListener("click", async (e) => {
            e.preventDefault();
            cerrarModal("modal-exito");

            // ✅ si me pasaron callback, lo ejecuto
            if (typeof onClose === "function") {
                await onClose();
            }
        });
    }

    // ✅ cerrar haciendo click fuera (overlay)
    modal.addEventListener("click", async (e) => {
        if (e.target === modal) {
            cerrarModal("modal-exito");

            if (typeof onClose === "function") {
                await onClose();
            }
        }
    });
}


// 2.1) Enviar solicitud de cambio de turno
function enviarSolicitudCambioTurno(diaSeleccionado) {
    // url base del backend
    const url = `${API}/solicitud`;

    // payload
    const payload = {
        id_turno_trabajador: diaSeleccionado?.id_turno_trabajador
    };

    // headers
    const headers = {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${TOKEN}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    }

    // enviamos la solicitud POST
    return fetch(url, headers)
        .then(async (res) => {
            // Si hay 500/400 etc, NO intentes res.json() a ciegas
            const text = await res.text();
            // si no es OK, lanzamos un error
            if (!res.ok) {
                console.error('Error HTTP', res.status, res.statusText);
                console.error('Respuesta backend:', text); // aquí verás el traceback o html
                throw new Error(`HTTP ${res.status}`);
            }

            // si es OK, parseamos JSON
            try {
                return JSON.parse(text);
            } catch {
                console.error('No es JSON válido:', text);
                throw new Error('Respuesta no JSON');
            }
        })
        .then((data) => {
            console.log('Solicitud enviada:', data);
            return data;
        })
        .catch((err) => {
            console.error('Fallo enviando solicitud:', err);
            throw err;
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




