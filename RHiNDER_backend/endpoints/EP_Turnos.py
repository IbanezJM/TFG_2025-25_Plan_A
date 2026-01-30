# endpoints/Solicitudes.py

from flask import request
from flask_restful import Resource
from flask_jwt_extended import jwt_required, get_jwt_identity

# Importar módulos de acceso a base de datos
from database.DB_Turnos import GestionTurnos


# ============================================================
# TURNOS DEL USUARIO (POR MES)
# ============================================================
class Turnos(Resource):
    """
    ------------------------------------------------------------
    GET /turnos?year=<int>&month=<int>
    ------------------------------------------------------------
    Devuelve los turnos del usuario autenticado para un mes
    y año concretos.
    ------------------------------------------------------------
    """

    @jwt_required()
    def get(self):
        """
        --------------------------------------------------------
        Obtiene los turnos del trabajador autenticado en un mes.
        --------------------------------------------------------
        Query params:
          - year: año (int)
          - month: mes (int)
        --------------------------------------------------------
        @return:
          - 200 + lista de turnos
        """

        # ID del usuario autenticado (extraído del JWT)
        user_id = int(get_jwt_identity())

        # Leer parámetros de la URL
        year = request.args.get("year", type=int)
        month = request.args.get("month", type=int)

        # Llamada a la capa de acceso a datos
        turnos = GestionTurnos.getTurnosTrabajadorMes(
            user_id,
            year,
            month
        )

        # Devuelve los turnos del mes solicitado
        return turnos, 200


# ============================================================
# DÍAS LIBRES DE UN USUARIO
# ============================================================
class DiasLibresUsuario(Resource):
    """
    ------------------------------------------------------------
    GET /usuarios/<id_user>/dias-libres?year=<int>&month=<int>
    ------------------------------------------------------------
    Devuelve los días libres de un usuario concreto en un mes
    y año determinados.
    ------------------------------------------------------------
    """

    @jwt_required()
    def get(self, id_user):
        """
        --------------------------------------------------------
        Obtiene los días libres de un usuario.
        --------------------------------------------------------
        @param id_user: ID del usuario consultado
        Query params:
          - year: año (int)
          - month: mes (int)
        --------------------------------------------------------
        @return:
          - 200 + lista de días libres
        """

        # Leer parámetros obligatorios de la URL
        year = int(request.args.get("year"))
        month = int(request.args.get("month"))

        # Consulta a base de datos
        filas = GestionTurnos.diasLibresUsuario(
            id_user,
            year,
            month
        )

        # Devuelve los días libres
        return filas, 200
