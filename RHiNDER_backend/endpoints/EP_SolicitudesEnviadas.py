# endpoints/Solicitudes.py

from flask import request
from flask_restful import Resource
from flask_jwt_extended import jwt_required, get_jwt_identity

# Importar módulos de acceso a base de datos
from database.DB_Gestion_Solicitudes_Enviadas import GestionSolicitudesEnviadas


# ============================================================
# SOLICITUDES ENVIADAS POR EL USUARIO
# ============================================================
class SolicitudesEnviadas(Resource):
    """
    ------------------------------------------------------------
    Endpoints relacionados con las solicitudes de cambio de turno
    que el usuario autenticado ha ENVIADO.
    ------------------------------------------------------------
    """

    # --------------------------------------------------------
    # GET /solicitud
    # --------------------------------------------------------
    @jwt_required()
    def get(self):
        """
        Devuelve las solicitudes activas enviadas por el usuario
        autenticado.

        @return:
          - 200 + lista de solicitudes activas
        """

        # ID del usuario autenticado (obtenido desde el JWT)
        user_id = int(get_jwt_identity())

        # Consulta a base de datos de las solicitudes activas
        solicitudes_activas =  GestionSolicitudesEnviadas.getSolicitudesActivasUsuario(user_id)

        # Devolver el listado de solicitudes
        return solicitudes_activas, 200

    # --------------------------------------------------------
    # POST /solicitud
    # --------------------------------------------------------
    @jwt_required()
    def post(self):
        """
        Crea una nueva solicitud de cambio de turno para el
        usuario autenticado.

        Body JSON:
          {
            "id_turno_trabajador": <int>
          }

        @return:
          - 201 + ID de la solicitud creada
        """

        # ID del usuario autenticado
        user_id = int(get_jwt_identity())

        # Leer el cuerpo de la petición en formato JSON
        data = request.get_json(silent=True) or {}

        # Obtener el ID del turno del trabajador
        id_turno_trabajador = data.get("id_turno_trabajador")

        # Mensaje de depuración (útil durante el desarrollo)
        print(id_turno_trabajador)

        # Crear la solicitud en base de datos
        id_solicitud = GestionSolicitudesEnviadas.crearSolicitud(
            user_id,
            id_turno_trabajador
        )

        # Respuesta de éxito
        return {
            "ok": True,
            "message": "Solicitud creada correctamente.",
            "id_solicitud": id_solicitud
        }, 201

    # --------------------------------------------------------
    # PUT /solicitud/{id_solicitud}
    # --------------------------------------------------------
    @jwt_required()
    def put(self, id_solicitud):
        """
        Cancela una solicitud de cambio de turno previamente
        creada por el usuario autenticado.

        @param id_solicitud: ID de la solicitud a cancelar
        @return:
          - 200 si se cancela correctamente
          - 400 si el ID no es válido
          - 500 si ocurre un error interno
        """

        try:
            # ID del usuario autenticado
            user_id = int(get_jwt_identity())

            # Validar que el ID de la solicitud sea numérico
            id_solicitud = int(id_solicitud)

            # Cancelar la solicitud en base de datos
            GestionSolicitudesEnviadas.cancelarSolicitud(
                user_id,
                id_solicitud
            )

            # Respuesta de éxito
            return {
                "ok": True,
                "message": "Solicitud cancelada correctamente."
            }, 200

        except ValueError as ve:
            # Error si el ID de la solicitud no es válido
            return {"ok": False, "error": str(ve)}, 400

        except Exception as e:
            # Error inesperado
            print(f"[ERROR] CancelarSolicitud.put: {e}")
            return {
                "ok": False,
                "error": "Error al cancelar la solicitud."
            }, 500

class SolicitudesEnviadasExpiradasCount(Resource):

    @jwt_required()
    def get(self):
        user_id = get_jwt_identity()

        total = GestionSolicitudesEnviadas.numeroExpiradasEnviadas(user_id)

        return total, 200
