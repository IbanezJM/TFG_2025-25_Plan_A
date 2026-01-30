from .DB_Conexion import ejecuta_all, ejecuta_one, ejecuta_Update_Delete


class GestionValidaciones:
    """
    ---------------------------------------------------------
    Clase DAL para gestionar las VALIDACIONES de matches.
    ---------------------------------------------------------
    Una validación representa la decisión final de un
    coordinador o administrador sobre un match:
    - APROBADA (VALIDADO)
    - RECHAZADA
    ---------------------------------------------------------
    Se usa principalmente en:
    - Panel del coordinador
    - Historial de validaciones
    - Contadores de validaciones nuevas
    ---------------------------------------------------------
    """

    # =========================================================
    # 1) HISTORIAL DE VALIDACIONES
    # =========================================================
    @staticmethod
    def getHistorialValidaciones():
        """
        ---------------------------------------------------------
        Devuelve el historial completo de validaciones realizadas.
        ---------------------------------------------------------
        Incluye:
        - Datos del match
        - Usuario emisor y receptor
        - Administrador/coordinador que validó
        - Fecha, estado y comentario de la validación
        - Snapshot de los turnos intercambiados (antes del swap)
        ---------------------------------------------------------
        Solo se incluyen matches ya resueltos:
        - VALIDADO
        - RECHAZADO
        ---------------------------------------------------------
        @return: lista de validaciones (ordenadas por fecha desc)
        """

        sql = """
            SELECT
                m.id_match,
                m.estado AS estado_match,
                m.fecha_match,

                -- Usuarios implicados
                ue.username AS emisor_username,
                ur.username AS receptor_username,

                -- Usuario que valida (admin/coordinador)
                ua.username AS admin_username,

                -- Datos de la validación
                v.fecha_validacion,
                v.comentario AS comentario_validacion,
                v.estado AS estado_validacion,
                v.visto_por_coordinador,

                -- ✅ snapshots del intercambio (guardados en match)
                -- Permiten mostrar qué turnos se intercambiaron
                m.emisor_fecha          AS fecha_turno_emisor,
                m.emisor_nomenclatura   AS nomenclatura_emisor,
                m.receptor_fecha        AS fecha_turno_receptor,
                m.receptor_nomenclatura AS nomenclatura_receptor

            FROM `match` m
            JOIN solicitud s ON s.id_solicitud = m.id_solicitud
            JOIN usuario ue ON ue.id_trabajador = s.id_emisor
            JOIN usuario ur ON ur.id_trabajador = m.id_receptor

            -- Validación asociada al match (obligatoria)
            JOIN validacion v ON v.id_match = m.id_match

            -- Usuario que valida (LEFT JOIN por seguridad)
            LEFT JOIN usuario ua ON ua.id_trabajador = v.id_admin

            WHERE m.estado IN ('VALIDADO', 'RECHAZADO','EXPIRADO')
            ORDER BY v.fecha_validacion DESC
        """
        return ejecuta_all(sql)

    # =========================================================
    # 2) CONTADOR DE VALIDACIONES NO VISTAS (COORDINADOR)
    # =========================================================
    @staticmethod
    def numeroValidacionesNoVistas():
        """
        ---------------------------------------------------------
        Devuelve el número de validaciones NO vistas por el
        coordinador/administrador.
        ---------------------------------------------------------
        Se consideran no vistas aquellas validaciones que:
        - Están APROBADAS o RECHAZADAS
        - visto_por_coordinador = 0
        ---------------------------------------------------------
        Se usa normalmente para:
        - Indicadores visuales (badges, notificaciones)
        - Contadores en el panel del coordinador
        ---------------------------------------------------------
        @return: número total de validaciones no vistas (int)
        """

        # TODO: incluir también estado 'EXPIRADA' si se gestiona en el futuro
        sql = """
            SELECT COUNT(*) AS total
            FROM validacion
            WHERE estado IN ('APROBADA','RECHAZADA','EXPIRADA')
              AND visto_por_coordinador = 0
        """
        fila = ejecuta_one(sql)
        return int(fila["total"]) if fila else 0

    # =========================================================
    # 3) MARCAR VALIDACIONES COMO VISTAS
    # =========================================================
    @staticmethod
    def marcarValidacionesComoVistas():
        """
        ---------------------------------------------------------
        Marca como vistas todas las validaciones pendientes
        de revisión por el coordinador/administrador.
        ---------------------------------------------------------
        Actualiza:
        - visto_por_coordinador = 1
        ---------------------------------------------------------
        Solo afecta a validaciones:
        - APROBADAS
        - RECHAZADAS
        ---------------------------------------------------------
        @return: número de filas actualizadas
        """

        sql = """
              UPDATE validacion
              SET visto_por_coordinador = 1
              WHERE estado IN ('APROBADA', 'RECHAZADA','EXPIRADA')
                AND visto_por_coordinador = 0
              """
        filas = ejecuta_Update_Delete(sql)
        return filas
