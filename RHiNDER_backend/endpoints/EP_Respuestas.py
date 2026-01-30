# endpoints/EP_Respuestas.py

from flask import request
from flask_restful import Resource
from flask_jwt_extended import jwt_required, get_jwt_identity

# Importar módulos de acceso a base de datos
from database.DB_Gestion_Respuestas import GestionRespuestas


# ============================================================
# RESPUESTAS A SOLICITUDES (USUARIO)
# ============================================================
class RespuestasSolicitudesActivasUsuario(Resource):
    """
    ------------------------------------------------------------
    Endpoints relacionados con las respuestas a solicitudes
    activas del usuario autenticado.
    ------------------------------------------------------------
    """

    # --------------------------------------------------------
    # GET /respuestas
    # --------------------------------------------------------
    @jwt_required()
    def get(self):
        """
        Devuelve todas las respuestas asociadas a solicitudes
        activas del usuario autenticado.

        @return:
          - 200 + lista de respuestas
        """

        # ID del usuario autenticado (extraído del JWT)
        user_id = int(get_jwt_identity())

        # Consulta a base de datos de las respuestas activas
        respuestas = GestionRespuestas.getRespuestasSolicitudesActivasUsuario( user_id )

        # Devolver el listado de respuestas
        return respuestas, 200

    # --------------------------------------------------------
    # PUT /respuestas
    # --------------------------------------------------------
    @jwt_required()
    def put(self):
        """
        Marca varias respuestas como vistas por el usuario
        autenticado.

        Body JSON:
          {
            "ids_respuesta": [1, 2, 3]
          }

        @return:
          - 200 + número de filas afectadas
        """

        # ID del usuario autenticado
        user_id = int(get_jwt_identity())

        # Leer el cuerpo de la petición
        data = request.get_json() or {}

        # Lista de IDs de respuestas a marcar como vistas
        ids_respuesta = data.get("ids_respuesta", [])

        # Actualizar las respuestas en base de datos
        filas = GestionRespuestas.marcar_respuestas_vistas(
            ids_respuesta,
            user_id
        )

        # Respuesta estándar
        return {
            "msg": "Respuestas marcadas como vistas",
            "filas_afectadas": filas
        }, 200

    # --------------------------------------------------------
    # POST /respuestas
    # --------------------------------------------------------
    @jwt_required()
    def post(self):
        """
        Crea una nueva respuesta a una solicitud de cambio de turno.

        Body JSON:
          {
            "id_solicitud": <int>,
            "id_turno_trabajador_receptor": <int>
          }

        @return:
          - 201 + ID de la respuesta creada
          - 400 si faltan campos obligatorios
          - 409 si ya existe una respuesta o hay conflicto
          - 500 si ocurre un error interno
        """

        # ID del usuario que responde (receptor)
        id_receptor = int(get_jwt_identity())

        # Leer el cuerpo JSON
        data = request.get_json(silent=True) or {}

        # Campos obligatorios
        id_solicitud = data.get("id_solicitud")
        id_tt = data.get("id_turno_trabajador_receptor")

        # Validación de campos requeridos
        if not id_solicitud or not id_tt:
            return {
                "ok": False,
                "msg": "Faltan campos: id_solicitud e id_turno_trabajador_receptor"
            }, 400

        try:
            # Crear la respuesta en base de datos
            new_id = GestionRespuestas.crearRespuesta(
                int(id_solicitud),
                id_receptor,
                int(id_tt)
            )

            return {
                "ok": True,
                "id_respuesta": new_id
            }, 201

        except Exception as e:
            msg = str(e)

            # Caso habitual: intento de responder dos veces a la misma solicitud
            # (violación de restricción UNIQUE)
            if "Duplicate entry" in msg or "UNIQUE" in msg or "uq_resp_sol_receptor" in msg:
                return {
                    "ok": False,
                    "msg": "Ya respondiste a esta solicitud."
                }, 409

            # Error de claves foráneas (IDs inexistentes)
            if "foreign key constraint fails" in msg or "Cannot add or update a child row" in msg:
                return {
                    "ok": False,
                    "msg": (
                        "Datos inválidos (FK). Revisa id_solicitud "
                        "e id_turno_trabajador_receptor."
                    )
                }, 409

            # Error genérico (solo para depuración durante el desarrollo)
            return {
                "ok": False,
                "msg": "Error interno creando respuesta.",
                "error": msg
            }, 500


# ============================================================
# TURNOS UTILIZADOS PARA RESPONDER
# ============================================================
class TurnosUsadosRespuestas(Resource):
    """
    ------------------------------------------------------------
    Endpoint que devuelve los turnos que el usuario ya ha usado
    para responder a solicitudes, evitando duplicados.
    ------------------------------------------------------------
    """

    # --------------------------------------------------------
    # GET /respuestas/turnos-usados
    # --------------------------------------------------------
    @jwt_required()
    def get(self):
        """
        Devuelve los turnos utilizados por el usuario para
        responder a solicitudes.

        @return:
          - 200 + lista de IDs de turnos usados
        """

        # ID del usuario autenticado
        user_id = int(get_jwt_identity())

        # Consulta a base de datos
        filas = GestionRespuestas.turnos_usados_para_responder( user_id )

        # filas viene con formato:
        # [{id_turno_trabajador_receptor: X}, ...]
        return filas, 200


# endpoints/EP_Respuestas.py

class RespuestasExpiradasAviso(Resource):

    @jwt_required()
    def get(self):
        user_id = int(get_jwt_identity())

        # 1) Expirar respuestas cuyo turno ofrecido ya es hoy o pasado
        GestionRespuestas.expirarRespuestasPorTurnoPasado(user_id)

        # 2) Contar expiradas (para aviso al usuario)
        total = GestionRespuestas.countRespuestasExpiradasReceptor(user_id)

        # 3) Limpiar expiradas para permitir volver a responder
        limpiadas = GestionRespuestas.limpiarRespuestasExpiradasSiSolicitudSigueViva(user_id)

        return total, 200

