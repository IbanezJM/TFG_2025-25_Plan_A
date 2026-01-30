"""
Operaciones relacionadas con solicitudes de cambio de turno.

Este módulo pertenece a la capa DAL (Data Access Layer) y se encarga
exclusivamente del acceso a datos y validaciones básicas relacionadas
con las solicitudes enviadas por los usuarios.
"""

from .DB_Conexion import ejecuta_all, ejecuta_one, ejecuta_insert


class GestionSolicitudesEnviadas:
    """
    ---------------------------------------------------------
    Clase de gestión de solicitudes enviadas por los usuarios.
    ---------------------------------------------------------
    Responsabilidades:
    - Listar solicitudes activas del usuario
    - Crear nuevas solicitudes de intercambio
    - Cancelar solicitudes bajo determinadas condiciones
    ---------------------------------------------------------
    """

    # =========================================================
    # 1) SOLICITUDES ACTIVAS DEL USUARIO
    # =========================================================
    @staticmethod
    def getSolicitudesActivasUsuario(user_id):
        """
        ---------------------------------------------------------
        Obtiene todas las solicitudes ACTIVAS creadas por un usuario.
        ---------------------------------------------------------
        Incluye información del turno asociado:
        - Fecha del turno
        - Nomenclatura (M, T, N, L, etc.)
        - Nombre del turno
        ---------------------------------------------------------
        @param user_id: ID del usuario emisor
        @return: lista de solicitudes activas
        """
        sql = """
            SELECT s.id_solicitud, 
                   s.estado,
                   s.fecha_solicitud,
                   s.id_turno_trabajador,
                   t.fecha_turno, 
                   tp.nomenclatura, 
                   tp.turno
            FROM solicitud s
            JOIN turno_trabajador tt
                ON tt.id_turno_trabajador = s.id_turno_trabajador
            JOIN turno t
                ON t.id_turno = tt.id_turno
            JOIN tipo_turno tp
                ON tp.id_tipo_turno = t.id_tipo_turno
            LEFT JOIN `match` m
                ON m.id_solicitud = s.id_solicitud
            WHERE s.id_emisor = %s
              AND s.is_activa = 1
              AND m.id_match IS NULL
            ORDER BY t.fecha_turno ASC, s.fecha_solicitud DESC
        """
        return ejecuta_all(sql, (user_id,))

    # =========================================================
    # 2) CREAR NUEVA SOLICITUD
    # =========================================================
    @staticmethod
    def crearSolicitud(user_id, id_turno_trabajador):
        """
        ---------------------------------------------------------
        Crea una nueva solicitud de intercambio de turno.
        ---------------------------------------------------------
        Validaciones realizadas:
        - El turno existe
        - El turno pertenece al usuario
        - No existe ya una solicitud activa para ese turno
        ---------------------------------------------------------
        @param user_id: ID del usuario emisor
        @param id_turno_trabajador: turno que se desea intercambiar
        @return: ID de la nueva solicitud creada
        """

        # 1) Verificar que el turno pertenece al usuario
        sql_check_tt = """
            SELECT id_turno_trabajador
            FROM turno_trabajador
            WHERE id_turno_trabajador = %s
              AND id_trabajador = %s
            LIMIT 1
        """
        tt = ejecuta_one(sql_check_tt, (id_turno_trabajador, user_id))
        if tt is None:
            raise ValueError("El turno indicado no existe o no pertenece al usuario.")

        # 2) Verificar que no exista ya una solicitud activa para ese turno
        sql_check_sol = """
            SELECT id_solicitud
            FROM solicitud
            WHERE id_turno_trabajador = %s
              AND is_activa = 1
            LIMIT 1
        """
        sol_existente = ejecuta_one(sql_check_sol, (id_turno_trabajador,))
        if sol_existente is not None:
            raise ValueError("Ya existe una solicitud activa para ese turno.")

        # 3) Insertar nueva solicitud
        #    (estado inicial por defecto: PENDIENTE)
        sql_insert = """
            INSERT INTO solicitud (id_emisor, id_turno_trabajador)
            VALUES (%s, %s)
        """
        id_solicitud = ejecuta_insert(sql_insert, (user_id, id_turno_trabajador))
        return id_solicitud

    # =========================================================
    # 3) CANCELAR SOLICITUD
    # =========================================================
    @staticmethod
    def cancelarSolicitud(user_id, id_solicitud):
        """
        ---------------------------------------------------------
        Cancela una solicitud de intercambio de turno.
        ---------------------------------------------------------
        Condiciones necesarias:
        - La solicitud existe
        - Pertenece al usuario autenticado
        - Está activa
        - NO tiene respuestas asociadas
        ---------------------------------------------------------
        @param user_id: ID del usuario emisor
        @param id_solicitud: solicitud a cancelar
        @return: True si la cancelación se realiza correctamente
        """

        # 1) Verificar existencia, propiedad y estado activo
        sql_check_sol = """
            SELECT id_solicitud, estado
            FROM solicitud
            WHERE id_solicitud = %s
              AND id_emisor = %s
              AND is_activa = 1
            LIMIT 1
        """
        sol = ejecuta_one(sql_check_sol, (id_solicitud, user_id))
        if sol is None:
            raise ValueError(
                "La solicitud no existe, no está activa o no pertenece al usuario."
            )

        # 2) Verificar que no existan respuestas asociadas
        sql_count_resp = """
            SELECT COUNT(*) AS num_respuestas
            FROM respuesta
            WHERE id_solicitud = %s
        """
        row = ejecuta_one(sql_count_resp, (id_solicitud,))
        num_respuestas = row["num_respuestas"] if row else 0

        if num_respuestas > 0:
            raise ValueError(
                "La solicitud no se puede cancelar porque ya tiene respuestas."
            )

        # 3) Actualizar estado y marcar la solicitud como inactiva
        sql_update = """
            UPDATE solicitud
            SET estado = 'CANCELADA',
                is_activa = 0
            WHERE id_solicitud = %s
        """
        ejecuta_one(sql_update, (id_solicitud,))
        return True

    # =========================================================
    # 4) NUMERO DE SOLICITUDES EXPIRADAS ENVIADAS
    # =========================================================
    @staticmethod
    def numeroExpiradasEnviadas(id_emisor: int) -> int:
        sql = """
              SELECT COUNT(*) AS total
              FROM solicitud
              WHERE id_emisor = %s
                AND estado = 'EXPIRADA' \
              """
        fila = ejecuta_one(sql, (id_emisor,))
        return int(fila["total"]) if fila else 0


