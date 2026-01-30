# endpoints/Solicitudes.py

from flask_restful import Resource
from flask_jwt_extended import jwt_required, get_jwt_identity

# Importar módulos de acceso a base de datos
from database.DB_Gestion_Solicitudes_Recibidas import GestionSolicitudesRecibidas


# ============================================================
# SOLICITUDES RECIBIDAS POR EL USUARIO
# ============================================================
class SolicitudesRecibidas(Resource):
    """
    ------------------------------------------------------------
    Endpoints relacionados con las solicitudes que OTROS usuarios
    han enviado al usuario autenticado.
    ------------------------------------------------------------
    """

    # --------------------------------------------------------
    # GET /solicitudes-recibidas
    # --------------------------------------------------------
    @jwt_required()
    def get(self):
        """
        Devuelve el listado completo de solicitudes recibidas
        por el usuario autenticado.

        @return:
          - 200 + lista de solicitudes
        """

        # Obtener el ID del usuario autenticado desde el JWT
        user_id = int(get_jwt_identity())

        # Consultar en base de datos las solicitudes recibidas
        solicitudes_recibidas = GestionSolicitudesRecibidas.solicitudesRecibidas( user_id )

        # Devolver la lista de solicitudes
        return solicitudes_recibidas, 200

    # --------------------------------------------------------
    # PUT /solicitudes-recibidas/{id_solicitud}
    # --------------------------------------------------------
    @jwt_required()
    def put(self, id_solicitud):
        """
        Marca una solicitud recibida como vista por el usuario
        autenticado.

        @param id_solicitud: ID de la solicitud a marcar como vista
        @return:
          - 200 + número de filas actualizadas
        """

        # ID del usuario autenticado
        user_id = int(get_jwt_identity())

        # Marcar la solicitud como vista en base de datos
        filas = GestionSolicitudesRecibidas.marcarSolicitudComoVista(
            int(id_solicitud),
            int(user_id)
        )

        # Respuesta estándar
        return {
            "ok": True,
            "updated": filas  # 1 si se marcó, 0 si ya estaba vista o no era suya
        }, 200


# ============================================================
# SOLICITUDES NUEVAS RECIBIDAS (NO VISTAS)
# ============================================================
class SolicitudesNuevasRecibidas(Resource):
    """
    ------------------------------------------------------------
    Endpoints relacionados con el contador de solicitudes
    recibidas que todavía no han sido vistas.
    ------------------------------------------------------------
    """

    # --------------------------------------------------------
    # GET /solicitudes-nuevas-recibidas
    # --------------------------------------------------------
    @jwt_required()
    def get(self):
        """
        Devuelve el número de solicitudes recibidas que aún no
        han sido vistas por el usuario autenticado.

        @return:
          - 200 + número entero
        """

        # ID del usuario autenticado
        user_id = int(get_jwt_identity())

        # Obtener el número de solicitudes nuevas
        nuevas = GestionSolicitudesRecibidas.numeroSolicitudesNuevasRecibidas( user_id )

        # Se devuelve SOLO el número
        return nuevas, 200

    # --------------------------------------------------------
    # PUT /solicitudes-nuevas-recibidas/{id_solicitud}
    # --------------------------------------------------------
    @jwt_required()
    def put(self, id_solicitud):
        """
        Marca una solicitud nueva como vista utilizando el método PUT.

        @param id_solicitud: ID de la solicitud
        @return:
          - 200 + número de filas actualizadas
        """

        # ID del usuario autenticado
        user_id = int(get_jwt_identity())

        # Marcar la solicitud como vista
        filas = GestionSolicitudesRecibidas.marcarSolicitudComoVista(
            user_id,
            int(id_solicitud)
        )

        return {
            "ok": True,
            "updated": filas
        }, 200

    # --------------------------------------------------------
    # POST /solicitudes-nuevas-recibidas/{id_solicitud}
    # --------------------------------------------------------
    @jwt_required()
    def post(self, id_solicitud):
        """
        Marca una solicitud nueva como vista utilizando el método POST.
        Este endpoint puede usarse desde acciones concretas del frontend.

        @param id_solicitud: ID de la solicitud
        @return:
          - 200 + mensaje de confirmación
        """

        # ID del usuario autenticado
        user_id = int(get_jwt_identity())

        # Marcar la solicitud como vista en base de datos
        GestionSolicitudesRecibidas.marcarSolicitudComoVista(
            user_id,
            int(id_solicitud)
        )

        return {
            "ok": True,
            "message": "Solicitud marcada como vista."
        }, 200


# ============================================================
# SOLICITUDES EXPIRADAS RECIBIDAS
# ============================================================
class SolicitudesRecibidasExpiradasCount(Resource):
    @jwt_required()
    def get(self):
        user_id = int(get_jwt_identity())
        total = GestionSolicitudesRecibidas.numeroExpiradasRecibidas(user_id)
        return total, 200