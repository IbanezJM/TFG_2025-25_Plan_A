# endpoints/EP_Matches.py

from flask import request
from flask_restful import Resource
from flask_jwt_extended import jwt_required, get_jwt_identity

# Importar módulos de acceso a base de datos
from database.DB_Gestion_Matches import GestionMatches
from database.DB_Gestion_Usuarios import GestionUsuarios
from database.DB_Gestion_Usuarios import _es_coordinador_o_admin


# ============================================================
# HISTORIAL DE MATCHES DEL USUARIO
# ============================================================
class HistorialMatches(Resource):
    """
    ------------------------------------------------------------
    Endpoints relacionados con el historial de matches de un
    usuario autenticado.
    ------------------------------------------------------------
    """

    @jwt_required()
    def get(self):
        """
        --------------------------------------------------------
        Devuelve el historial de matches del usuario autenticado.
        --------------------------------------------------------
        @return:
          - 200 + lista de matches
        """

        # ID del usuario autenticado
        user_id = int(get_jwt_identity())

        # Obtener historial desde la base de datos
        historial = GestionMatches.getHistorialMatchesUsuario(user_id)

        return historial, 200

    @jwt_required()
    def post(self):
        """
        --------------------------------------------------------
        Crea un nuevo match a partir de una solicitud y una
        respuesta seleccionadas.
        --------------------------------------------------------
        Body JSON:
          {
            "id_solicitud": <int>,
            "id_respuesta": <int>
          }
        --------------------------------------------------------
        @return:
          - 201 + datos del match creado
          - 400 si faltan datos obligatorios
        """

        # Leer el cuerpo JSON
        data = request.get_json(silent=True) or {}

        # Campos obligatorios
        id_solicitud = data.get("id_solicitud")
        id_respuesta = data.get("id_respuesta")

        # Validación básica
        if not id_solicitud or not id_respuesta:
            return {
                "ok": False,
                "msg": "Faltan datos: id_solicitud e id_respuesta."
            }, 400

        # Crear el match (el método ya devuelve el formato adecuado)
        return GestionMatches.crear_match(
            id_solicitud,
            id_respuesta
        ), 201


# ============================================================
# MATCHES PENDIENTES DE VALIDACIÓN (COORDINADOR / ADMIN)
# ============================================================
class MatchesPendientesValidacion(Resource):
    """
    ------------------------------------------------------------
    Endpoint para obtener los matches que están pendientes de
    validación por parte de coordinadores o administradores.
    ------------------------------------------------------------
    """

    @jwt_required()
    def get(self):
        """
        --------------------------------------------------------
        Devuelve los matches pendientes de validación.
        --------------------------------------------------------
        @return:
          - 200 + lista de matches
          - 403 si el usuario no tiene permisos
        """

        # Usuario autenticado
        user_id = int(get_jwt_identity())

        # Control de permisos
        if not _es_coordinador_o_admin(user_id):
            return {"ok": False, "msg": "No autorizado."}, 403

        # Consulta a base de datos
        data = GestionMatches.getMatchesPendientesValidacion()

        return data, 200


# ============================================================
# VALIDAR MATCH (COORDINADOR / ADMIN)
# ============================================================
class MatchValidar(Resource):
    """
    ------------------------------------------------------------
    Endpoint para validar un match pendiente.
    ------------------------------------------------------------
    """

    @jwt_required()
    def post(self, id_match):
        """
        --------------------------------------------------------
        Valida un match concreto.
        --------------------------------------------------------
        @param id_match: ID del match a validar
        @return:
          - respuesta generada por la capa de datos
        """

        # Usuario autenticado
        user_id = int(get_jwt_identity())

        # Control de permisos
        if not _es_coordinador_o_admin(user_id):
            return {"ok": False, "msg": "No autorizado."}, 403

        # Leer cuerpo JSON (comentario opcional)
        payload = request.get_json(silent=True) or {}
        comentario = payload.get("comentario")

        # Delegar validación a la capa de datos
        return GestionMatches.validar_match(
            int(id_match),
            user_id,
            GestionUsuarios. obtener_tipo_actor(user_id)
        )


# ============================================================
# DENEGAR MATCH (COORDINADOR / ADMIN)
# ============================================================
class MatchDenegar(Resource):
    """
    ------------------------------------------------------------
    Endpoint para denegar un match pendiente.
    ------------------------------------------------------------
    """

    @jwt_required()
    def post(self, id_match):
        """
        --------------------------------------------------------
        Deniega un match concreto.
        --------------------------------------------------------
        @param id_match: ID del match a denegar
        @return:
          - respuesta generada por la capa de datos
        """

        # Usuario autenticado
        user_id = int(get_jwt_identity())

        # Control de permisos
        if not _es_coordinador_o_admin(user_id):
            return {"ok": False, "msg": "No autorizado."}, 403

        # Leer cuerpo JSON (comentario opcional)
        payload = request.get_json(silent=True) or {}
        comentario = payload.get("comentario")

        # Delegar denegación a la capa de datos
        return GestionMatches.denegar_match(
            int(id_match),
            user_id,
            GestionUsuarios. obtener_tipo_actor(user_id)
        )


# ============================================================
# MARCAR MATCHES COMO VISTOS
# ============================================================
class MatchesVistos(Resource):
    """
    ------------------------------------------------------------
    Endpoint para marcar los matches como vistos por el usuario
    según su rol.
    ------------------------------------------------------------
    """

    @jwt_required()
    def post(self):
        """
        --------------------------------------------------------
        Marca los matches como vistos para el usuario autenticado.
        --------------------------------------------------------
        @return:
          - 200 + número de matches actualizados
        """

        # Usuario autenticado
        user_id = int(get_jwt_identity())

        # Actualizar estado de vistos según rol
        return GestionMatches.marcar_matches_como_vistos(
            user_id,
            GestionUsuarios. obtener_tipo_actor(user_id)
        ), 200
