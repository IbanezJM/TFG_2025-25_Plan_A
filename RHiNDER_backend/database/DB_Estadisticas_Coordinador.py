from database.DB_Conexion import ejecuta_one, ejecuta_all


class EstadisticasCoordinador:
    """
    ---------------------------------------------------------
    Clase de acceso a datos para estadísticas del coordinador.
    ---------------------------------------------------------
    Centraliza las consultas agregadas necesarias para:
    - Panel de control del coordinador
    - Gráficas y contadores de validaciones
    ---------------------------------------------------------
    """

    @staticmethod
    def resumen_validaciones_por_estado(periodo: str):
        """
        ---------------------------------------------------------
        Devuelve un resumen de validaciones por estado.
        ---------------------------------------------------------
        Estados considerados:
        - Pendientes: matches aún no validados (tabla `match`)
        - Aprobadas: validaciones aceptadas (tabla `validacion`)
        - Rechazadas: validaciones denegadas (tabla `validacion`)
        ---------------------------------------------------------
        El parámetro `periodo` limita las validaciones resueltas:
        - "hoy"  → solo las de hoy
        - "mes"  → mes actual (por defecto)
        - "anio" → año actual
        ---------------------------------------------------------
        @param periodo: rango temporal del resumen
        @return: diccionario con totales por estado
        """

        # Normalizar el periodo recibido
        if periodo not in ("hoy", "mes", "anio"):
            periodo = "mes"

        # -----------------------------------------------------
        # 1) Pendientes de validación
        #    (matches aún en estado PENDIENTE_VALIDACION)
        # -----------------------------------------------------
        sql_pendientes = """
            SELECT COUNT(*) AS pendientes
            FROM `match` m
            WHERE m.estado = 'PENDIENTE_VALIDACION';
        """
        row_p = ejecuta_one(sql_pendientes) or {}
        pendientes = int(row_p.get("pendientes") or 0)

        # -----------------------------------------------------
        # 2) Construir filtro temporal para validaciones resueltas
        # -----------------------------------------------------
        if periodo == "hoy":
            where_periodo = "DATE(v.fecha_validacion) = CURDATE()"
        elif periodo == "mes":
            where_periodo = (
                "YEAR(v.fecha_validacion) = YEAR(CURDATE()) "
                "AND MONTH(v.fecha_validacion) = MONTH(CURDATE())"
            )
        else:  # "anio"
            where_periodo = "YEAR(v.fecha_validacion) = YEAR(CURDATE())"

        # -----------------------------------------------------
        # 3) Validaciones resueltas (aprobadas / rechazadas)
        # -----------------------------------------------------
        sql_resueltas = f"""
            SELECT
              COUNT(*) AS total_resueltas,
              SUM(v.estado = 'APROBADA')  AS aprobadas,
              SUM(v.estado = 'RECHAZADA') AS rechazadas
            FROM validacion v
            WHERE {where_periodo};
        """
        row_r = ejecuta_one(sql_resueltas) or {}
        aprobadas = int(row_r.get("aprobadas") or 0)
        rechazadas = int(row_r.get("rechazadas") or 0)

        # Total global (pendientes + resueltas)
        total = pendientes + aprobadas + rechazadas

        return {
            "periodo": periodo,
            "total": total,
            "pendientes": pendientes,
            "aprobadas": aprobadas,
            "rechazadas": rechazadas,
        }

    @staticmethod
    def validaciones_por_dia(dias: int):
        """
        ---------------------------------------------------------
        Devuelve el número de validaciones resueltas por día
        en los últimos X días.
        ---------------------------------------------------------
        NOTA:
        - Solo cuenta validaciones APROBADA / RECHAZADA
        - No incluye pendientes
        ---------------------------------------------------------
        @param dias: número de días hacia atrás
        @return: lista de objetos {fecha, valor}
        """

        # Asegurar que días sea entero
        dias = int(dias)

        # -----------------------------------------------------
        # Consulta agregada por fecha
        # -----------------------------------------------------
        sql = """
            SELECT
                DATE(v.fecha_validacion) AS fecha,
                COUNT(*) AS total
            FROM validacion v
            WHERE DATE(v.fecha_validacion) >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
            GROUP BY DATE(v.fecha_validacion)
            ORDER BY fecha ASC;
        """
        rows = ejecuta_all(sql, (dias,)) or []

        # -----------------------------------------------------
        # Normalizar salida para frontend (JSON friendly)
        # -----------------------------------------------------
        salida = []
        for r in rows:
            fecha = r.get("fecha")

            # Convertir fecha a string si viene como date/datetime
            if hasattr(fecha, "strftime"):
                fecha = fecha.strftime("%Y-%m-%d")

            salida.append({
                "fecha": fecha,
                "valor": int(r.get("total") or 0)
            })

        return salida
