"""
Operaciones relacionadas con las respuestas a solicitudes.

Este módulo pertenece a la DAL (Data Access Layer) y contiene
consultas SQL relacionadas con:
- Listar respuestas de solicitudes activas
- Saber qué turnos ha usado un usuario para responder
- Marcar respuestas como vistas
- Crear una respuesta y actualizar el estado de la solicitud
"""

from .DB_Conexion import ejecuta_all, ejecuta_insert, ejecuta_Update_Delete


class GestionRespuestas:
    """
    ---------------------------------------------------------
    Clase para gestionar respuestas asociadas a solicitudes.
    ---------------------------------------------------------
    Responsabilidades principales:
    - Consultar respuestas de solicitudes activas (para el emisor)
    - Controlar qué turnos ha usado un receptor para responder
    - Marcar respuestas como vistas por el solicitante
    - Crear respuestas y actualizar el estado de la solicitud
    ---------------------------------------------------------
    """

    # =========================================================
    # 1) RESPUESTAS DE SOLICITUDES ACTIVAS (PARA EL EMISOR)
    # =========================================================
    @staticmethod
    def getRespuestasSolicitudesActivasUsuario(user_id):
        """
        ---------------------------------------------------------
        Obtiene todas las respuestas asociadas a solicitudes ACTIVAS
        creadas por un usuario (emisor).
        ---------------------------------------------------------
        Devuelve información de:
        - Solicitud
        - Respuesta
        - Usuario receptor
        - Turno propuesto por el receptor (fecha + nomenclatura)
        ---------------------------------------------------------
        @param user_id: ID del usuario emisor (autenticado)
        @return: lista de respuestas agrupadas por solicitud
        """
        sql = """
            SELECT
                s.id_solicitud,
                r.id_respuesta,
                r.estado        AS estado_respuesta,
                r.visto_por_solicitante AS visto_por_solicitante,
                r.es_ganadora,
                r.fecha_respuesta,
                u.username      AS receptor_username,
                t.fecha_turno   AS fecha_turno_receptor,
                tp.nomenclatura AS nomenclatura_receptor,
                tp.turno        AS turno_receptor
            FROM solicitud s
            JOIN respuesta r
                ON r.id_solicitud = s.id_solicitud
            JOIN usuario u
                ON u.id_trabajador = r.id_receptor
            JOIN turno_trabajador ttr
                ON ttr.id_turno_trabajador = r.id_turno_trabajador_receptor
            JOIN turno t
                ON t.id_turno = ttr.id_turno
            JOIN tipo_turno tp
                ON tp.id_tipo_turno = t.id_tipo_turno
            WHERE
                s.id_emisor = %s
                AND s.is_activa = 1
                AND r.estado='PENDIENTE'
            ORDER BY
                s.id_solicitud ASC,
                r.fecha_respuesta DESC
        """
        return ejecuta_all(sql, (user_id,))

    # =========================================================
    # 2) TURNOS YA USADOS PARA RESPONDER (PARA EL RECEPTOR)
    # =========================================================
    @staticmethod
    def turnos_usados_para_responder(user_id: int):
        """
        ---------------------------------------------------------
        Devuelve los id_turno_trabajador_receptor que el usuario
        (receptor) ya ha usado para responder a solicitudes.
        ---------------------------------------------------------
        Objetivo:
        - Evitar que el usuario use el mismo turno para responder
          a varias solicitudes activas.
        ---------------------------------------------------------
        Restricciones:
        - Solo respuestas no canceladas/expiradas
        - Solo solicitudes activas y en estados "vivos"
        ---------------------------------------------------------
        @param user_id: ID del usuario receptor
        @return: lista de turnos usados (DISTINCT)
        """
        sql = """
            SELECT DISTINCT
                r.id_turno_trabajador_receptor
            FROM respuesta r
            JOIN solicitud s ON s.id_solicitud = r.id_solicitud
            WHERE r.id_receptor = %s
              AND r.id_turno_trabajador_receptor IS NOT NULL
              AND r.estado NOT IN ('CANCELADA','EXPIRADA')
              AND s.is_activa = 1
              AND s.estado IN ('PENDIENTE','RESPONDIDA')
        """
        return ejecuta_all(sql, (user_id,))

    # =========================================================
    # 3) MARCAR RESPUESTAS COMO VISTAS (PARA EL EMISOR)
    # =========================================================
    @staticmethod
    def marcar_respuestas_vistas(ids_respuesta, id_usuario):
        """
        ---------------------------------------------------------
        Marca como vistas varias respuestas (por id_respuesta),
        SOLO si pertenecen a solicitudes del usuario (id_emisor).
        ---------------------------------------------------------
        Esto evita que un usuario marque como vistas respuestas
        de solicitudes que no son suyas (seguridad).
        ---------------------------------------------------------
        @param ids_respuesta: lista de IDs de respuesta a marcar
        @param id_usuario: ID del usuario emisor autenticado
        @return: número de respuestas procesadas
        """

        # 1) Si no hay IDs, no hacemos nada
        if not ids_respuesta:
            return 0

        # 2) Crear placeholders para IN (%s, %s, %s...)
        lista_placeholders = []
        for _ in ids_respuesta:
            lista_placeholders.append("%s")
        placeholders = ", ".join(lista_placeholders)

        # 3) Preparar parámetros:
        #    primero los ids de respuesta y al final el id_usuario
        params = []
        for id_respuesta in ids_respuesta:
            params.append(id_respuesta)

        params.append(id_usuario)
        params = tuple(params)

        # 4) SQL:
        #    - JOIN con solicitud para comprobar que el emisor es el usuario
        #    - solo marca las que aún están a 0 (no vistas)
        sql = f"""
            UPDATE respuesta r
            INNER JOIN solicitud s
                ON r.id_solicitud = s.id_solicitud
            SET r.visto_por_solicitante = 1
            WHERE
                r.id_respuesta IN ({placeholders})
                AND s.id_emisor = %s
                AND r.visto_por_solicitante = 0;
        """

        # 5) Ejecutar actualización
        ejecuta_all(sql, params)

        # 6) Devolver cuántos ids se intentaron marcar
        #    (no garantiza que todas se actualizaran, pero es útil para UI)
        return len(ids_respuesta)

    # =========================================================
    # 4) CREAR RESPUESTA + ACTUALIZAR SOLICITUD
    # =========================================================
    @staticmethod
    def crearRespuesta(id_solicitud: int, id_receptor: int, id_turno_trabajador_receptor: int):
        """
        ---------------------------------------------------------
        Crea una nueva respuesta a una solicitud.
        ---------------------------------------------------------
        Flujo:
        1) Insertar respuesta (tabla respuesta)
        2) Actualizar la solicitud a estado RESPONDIDA
           (solo si estaba PENDIENTE y activa)
        ---------------------------------------------------------
        @param id_solicitud: solicitud a la que se responde
        @param id_receptor: usuario que responde
        @param id_turno_trabajador_receptor: turno que ofrece el receptor
        @return: ID de la nueva respuesta creada
        """

        # 1) Insertar respuesta
        sql_insert = """
            INSERT INTO respuesta (id_solicitud,
                                   id_receptor,
                                   id_turno_trabajador_receptor)
            VALUES (%s, %s, %s)
        """
        new_id = ejecuta_insert(
            sql_insert,
            (id_solicitud, id_receptor, id_turno_trabajador_receptor)
        )

        # 2) Marcar solicitud como RESPONDIDA
        #    Solo se actualiza si:
        #    - estaba PENDIENTE
        #    - y sigue activa
        sql_update = """
            UPDATE solicitud
            SET estado = 'RESPONDIDA'
            WHERE id_solicitud = %s
              AND estado = 'PENDIENTE'
              AND is_activa = 1
        """
        ejecuta_Update_Delete(sql_update, (id_solicitud,))

        return new_id

    @staticmethod
    def countRespuestasExpiradasReceptor(user_id: int):
        sql = """
              SELECT COUNT(*) AS total
              FROM respuesta
              WHERE id_receptor = %s
                AND estado = 'EXPIRADA' 
              """
        fila = ejecuta_all(sql, (user_id,))
        # ejecuta_all suele devolver lista de dicts
        return int(fila[0]["total"]) if fila else 0

    @staticmethod
    def limpiarRespuestasExpiradasSiSolicitudSigueViva(user_id: int):
        """
        Elimina respuestas expiradas para permitir que el usuario
        pueda volver a responder a la solicitud.
        """
        sql = """
            DELETE r
            FROM respuesta r
            JOIN solicitud s
                ON s.id_solicitud = r.id_solicitud
            WHERE r.id_receptor = %s
              AND r.estado = 'EXPIRADA'
              AND s.is_activa = 1
              AND s.estado IN ('PENDIENTE','RESPONDIDA')
        """
        return ejecuta_Update_Delete(sql, (user_id,))

    @staticmethod
    def expirarRespuestasPorTurnoPasado(user_id: int):
        """
        Expira respuestas del usuario receptor si el turno ofrecido
        es hoy o ya ha pasado.
        """
        sql = """
              UPDATE respuesta r
              JOIN solicitud s
                ON s.id_solicitud = r.id_solicitud
              JOIN turno_trabajador tt
                  ON tt.id_turno_trabajador = r.id_turno_trabajador_receptor
              JOIN turno t
                  ON t.id_turno = tt.id_turno
              SET r.estado = 'EXPIRADA'
              WHERE r.id_receptor = %s
                AND r.estado = 'PENDIENTE'
                AND s.is_activa = 1
                AND s.estado IN ('PENDIENTE' 
                  , 'RESPONDIDA')
                AND t.fecha_turno <= CURDATE() 
              """
        return ejecuta_Update_Delete(sql, (user_id,))





