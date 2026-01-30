from flask import request
from flask_restful import Resource
from flask_jwt_extended import jwt_required

# Importar módulo de acceso a datos de estadísticas
from database.DB_Estadisticas_Coordinador import EstadisticasCoordinador


# ============================================================
# ESTADÍSTICAS: VALIDACIONES POR DÍA
# ============================================================
class EstadisticasValidacionesPorDia(Resource):
    """
    ------------------------------------------------------------
    Endpoint que devuelve estadísticas del número de validaciones
    realizadas por día durante un periodo determinado.
    ------------------------------------------------------------
    """

    @jwt_required()
    def get(self):
        """
        --------------------------------------------------------
        GET /estadisticas/validaciones-por-dia
        --------------------------------------------------------
        Devuelve el número de validaciones agrupadas por día.
        --------------------------------------------------------
        Query params:
          - dias: número de días a consultar (por defecto 7)
        --------------------------------------------------------
        @return:
          - 200 + datos estadísticos por día
        """

        # Leer el número de días desde la URL (valor por defecto: 7)
        dias = request.args.get("dias", 7)

        # Obtener estadísticas desde la base de datos
        data = EstadisticasCoordinador.validaciones_por_dia( dias )

        # Devolver datos estadísticos
        return data, 200


# ============================================================
# ESTADÍSTICAS: VALIDACIONES POR ESTADO
# ============================================================
class EstadisticasValidacionesEstado(Resource):
    """
    ------------------------------------------------------------
    Endpoint que devuelve un resumen de validaciones agrupadas
    por su estado (validada, denegada, pendiente, etc.).
    ------------------------------------------------------------
    """

    @jwt_required()
    def get(self):
        """
        --------------------------------------------------------
        GET /estadisticas/validaciones-por-estado
        --------------------------------------------------------
        Devuelve un resumen de validaciones según el periodo
        seleccionado.
        --------------------------------------------------------
        Query params:
          - periodo: periodo de tiempo ("mes", "semana", etc.)
        --------------------------------------------------------
        @return:
          - 200 + resumen de validaciones por estado
        """

        # Leer el periodo desde la URL (por defecto: "mes")
        periodo = request.args.get("periodo", "mes")

        # Obtener estadísticas desde la base de datos
        data = EstadisticasCoordinador.resumen_validaciones_por_estado( periodo )

        # Devolver resumen estadístico
        return data, 200
