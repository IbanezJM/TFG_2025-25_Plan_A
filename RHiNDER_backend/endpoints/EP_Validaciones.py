from flask_restful import Resource
from flask_jwt_extended import jwt_required, get_jwt_identity

from database.DB_Gestion_Validaciones import GestionValidaciones
from database.DB_Gestion_Usuarios import _es_coordinador_o_admin


# ============================================================
# HISTORIAL DE VALIDACIONES
# ============================================================
class HistorialValidaciones(Resource):

    @jwt_required()
    def get(self):
        """
        --------------------------------------------------------
        GET /validaciones/historial
        --------------------------------------------------------
        Devuelve el historial completo de validaciones realizadas
        (solo accesible para coordinadores y administradores).
        --------------------------------------------------------
        @return:
          - 200 + lista de validaciones si está autorizado
          - 403 si el usuario no tiene permisos
        """
        # Obtiene el ID del usuario autenticado desde el JWT
        user_id = int(get_jwt_identity())

        # Control de acceso por rol
        if not _es_coordinador_o_admin(user_id):
            return {"ok": False, "msg": "No autorizado."}, 403

        # Recupera el historial completo desde la capa de datos
        data = GestionValidaciones.getHistorialValidaciones()

        # Devuelve directamente la lista (formato JSON)
        return data, 200


# ============================================================
# CONTADOR DE VALIDACIONES NO VISTAS
# ============================================================
class ValidacionesNuevas(Resource):

    @jwt_required()
    def get(self):
        """
        --------------------------------------------------------
        GET /validaciones/nuevas
        --------------------------------------------------------
        Devuelve el número de validaciones pendientes de ver
        por el coordinador/administrador.
        --------------------------------------------------------
        @return:
          - 200 + número entero (count)
          - 403 si el usuario no tiene permisos
        """
        # ID del usuario autenticado
        user_id = int(get_jwt_identity())

        # Verificación de permisos
        if not _es_coordinador_o_admin(user_id):
            return {"ok": False, "msg": "No autorizado."}, 403

        # Obtiene solo el número de validaciones no vistas
        total = GestionValidaciones.numeroValidacionesNoVistas()

        # Se devuelve SOLO el número (consistencia con otros endpoints)
        return total, 200


# ============================================================
# MARCAR VALIDACIONES COMO VISTAS
# ============================================================
class ValidacionesVistas(Resource):

    @jwt_required()
    def post(self):
        """
        --------------------------------------------------------
        POST /validaciones/vistas
        --------------------------------------------------------
        Marca todas las validaciones pendientes como vistas
        por el coordinador/administrador.
        --------------------------------------------------------
        @return:
          - 200 + número de filas actualizadas
          - 403 si el usuario no tiene permisos
        """
        # Usuario autenticado
        user_id = int(get_jwt_identity())

        # Control de acceso
        if not _es_coordinador_o_admin(user_id):
            return {"ok": False, "msg": "No autorizado."}, 403

        # Ejecuta la actualización en base de datos
        filas = GestionValidaciones.marcarValidacionesComoVistas()

        # Respuesta estándar indicando éxito
        return {
            "ok": True,
            "actualizadas": filas
        }, 200
