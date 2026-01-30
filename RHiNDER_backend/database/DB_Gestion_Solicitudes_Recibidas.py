"""
Operaciones relacionadas con solicitudes de cambio de turno.

Este módulo DAL gestiona las solicitudes "recibidas" por un trabajador.
Es decir: solicitudes creadas por otros usuarios que yo puedo ver y a las
que puedo responder, siempre que cumpla condiciones (por ejemplo, estar libre).
"""

from .DB_Conexion import ejecuta_all, ejecuta_insert, ejecuta_one


class GestionSolicitudesRecibidas:
    """
    ---------------------------------------------------------
    Clase DAL para consultas sobre solicitudes recibidas.
    ---------------------------------------------------------
    Aquí el "receptor" es el usuario autenticado (user_id), que:
    - ve solicitudes de otros usuarios
    - marca solicitudes como vistas
    - consulta cuántas solicitudes nuevas tiene
    ---------------------------------------------------------
    """

    # =========================================================
    # 1) LISTAR SOLICITUDES RECIBIDAS (VISIBLES PARA EL USUARIO)
    # =========================================================
    @staticmethod
    def solicitudesRecibidas(user_id):
        """
        ---------------------------------------------------------
        Obtiene solicitudes ACTIVAS que el usuario puede ver (recibidas),
        incluyendo si ya las ha visto y si ya ha respondido.
        ---------------------------------------------------------
        ✅ Ideas clave (para defensa):
        - LEFT JOIN solicitud_receptor para incluir solicitudes nuevas
          (si no existe fila en solicitud_receptor => visto = 0).
        - LEFT JOIN respuesta para saber si ESTE usuario ya respondió.
        - Filtra para que SOLO salgan las solicitudes donde el receptor está
          libre (turno 'L') en ese día (regla de negocio).
        - Excluye solicitudes propias (s.id_emisor <> user_id).
        - Excluye solicitudes que ya tienen match (m.id_match IS NULL).
        ---------------------------------------------------------
        @param user_id: ID del receptor (usuario autenticado)
        @return: lista de solicitudes recibidas con estado/vistos/respuesta
        """

        sql = """
              SELECT s.id_solicitud, 
                     s.id_emisor, 
                     ue.username                                                               AS emisor_username, 
                     s.fecha_solicitud, 
                     t.fecha_turno, 
                     tp.nomenclatura, 
                     tp.turno, 

                     -- ✅ visto robusto:
                     -- si no hay fila en solicitud_receptor => NULL -> usamos 0
                     IFNULL(sr.visto, 0)                                                       AS visto, 

                     -- Info de la respuesta de ESTE receptor (si existe)
                     r.id_respuesta, 
                     r.estado                                                                  AS estado_respuesta, 

                     -- Campo calculado:
                     -- respondida = 1 si hay respuesta y no está cancelada/expirada
                     IF(r.id_respuesta IS NULL OR r.estado IN ('CANCELADA', 'EXPIRADA'), 0, 1) AS respondida

              FROM solicitud s
                       -- Usuario emisor (quien creó la solicitud)
                       JOIN usuario ue
                            ON ue.id_trabajador = s.id_emisor

                       -- Turno del emisor asociado a la solicitud
                       JOIN turno_trabajador tt
                            ON tt.id_turno_trabajador = s.id_turno_trabajador
                       JOIN turno t
                            ON t.id_turno = tt.id_turno
                       JOIN tipo_turno tp
                            ON tp.id_tipo_turno = t.id_tipo_turno

                  -- ✅ CLAVE: LEFT JOIN para que entren solicitudes nuevas
                  -- Si no existe fila sr para (id_solicitud, id_receptor) => visto=0
                       LEFT JOIN solicitud_receptor sr
                                 ON sr.id_solicitud = s.id_solicitud
                                     AND sr.id_receptor = %s

                  -- Respuesta del usuario receptor (si ya respondió)
                       LEFT JOIN respuesta r
                                 ON r.id_solicitud = s.id_solicitud
                                     AND r.id_receptor = %s

                  -- Match (si existe, ya no debería mostrarse en recibidas)
                       LEFT JOIN `match` m
                                 ON m.id_solicitud = s.id_solicitud

                  -- Turno del receptor en la MISMA fecha del turno del emisor
                  -- (sirve para filtrar que el receptor esté libre: nomenclatura 'L')
                       LEFT JOIN turno_trabajador ttr
                                 ON ttr.id_trabajador = %s
                       LEFT JOIN turno tr
                                 ON tr.id_turno = ttr.id_turno
                                     AND tr.fecha_turno = t.fecha_turno
                       LEFT JOIN tipo_turno tpr
                                 ON tpr.id_tipo_turno = tr.id_tipo_turno

              WHERE s.is_activa = 1

                -- No mostrar solicitudes propias
                AND s.id_emisor <> %s

                -- Si ya hay match, ya no es "recibida pendiente"
                AND m.id_match IS NULL

                -- Estados que permites que se sigan viendo en recibidas
                AND s.estado IN ('PENDIENTE', 'RESPONDIDA', 'EXPIRADA')

                -- ✅ Regla de negocio clave: solo si el receptor está libre ese día
                AND tpr.nomenclatura = 'L'

              ORDER BY t.fecha_turno ASC, s.fecha_solicitud DESC 
              """

        # Pasamos el user_id varias veces porque se usa en varios LEFT JOIN y filtros
        return ejecuta_all(sql, (user_id, user_id, user_id, user_id))

    # =========================================================
    # 2) LISTAR / CONTAR SOLICITUDES NUEVAS RECIBIDAS
    # =========================================================
    @staticmethod
    def numeroSolicitudesNuevasRecibidas(user_id):
        """
        ---------------------------------------------------------
        Devuelve solicitudes recibidas NUEVAS:
        - No existe fila en solicitud_receptor (sr.id_solicitud IS NULL)
        - La solicitud está PENDIENTE y activa
        - El receptor está libre (L) en ese día
        ---------------------------------------------------------
        Nota:
        - Aunque se llame "numero...", este método actualmente devuelve filas.
          Si el endpoint quiere SOLO el número, puede hacer len(filas).
        ---------------------------------------------------------
        @param user_id: ID del receptor
        @return: lista de solicitudes nuevas (o se puede convertir a número)
        """
        sql = """
              SELECT s.id_solicitud,
                     s.id_emisor,
                     u.username AS emisor_username,
                     s.fecha_solicitud,
                     t.fecha_turno,
                     tp.nomenclatura,
                     tp.turno
              FROM solicitud s
                       JOIN usuario u
                            ON u.id_trabajador = s.id_emisor
                       JOIN turno_trabajador tt
                            ON tt.id_turno_trabajador = s.id_turno_trabajador
                       JOIN turno t
                            ON t.id_turno = tt.id_turno
                       JOIN tipo_turno tp
                            ON tp.id_tipo_turno = t.id_tipo_turno

                  -- Si existe fila sr => ya se ha visto alguna vez
                       LEFT JOIN solicitud_receptor sr
                                 ON sr.id_solicitud = s.id_solicitud
                                     AND sr.id_receptor = %s

                  -- Turno del receptor en esa fecha (para filtrar libre 'L')
                       LEFT JOIN turno_trabajador ttr
                                 ON ttr.id_trabajador = %s
                       LEFT JOIN turno tr
                                 ON tr.id_turno = ttr.id_turno
                                     AND tr.fecha_turno = t.fecha_turno
                       LEFT JOIN tipo_turno tpr
                                 ON tpr.id_tipo_turno = tr.id_tipo_turno

              WHERE s.is_activa = 1
                AND s.estado = 'PENDIENTE'

                -- No mostrar solicitudes propias
                AND s.id_emisor <> %s

                -- ✅ Nueva = NO existe fila en solicitud_receptor
                AND sr.id_solicitud IS NULL

                -- ✅ Solo si el receptor está libre ese día
                AND tpr.nomenclatura = 'L'

              ORDER BY t.fecha_turno ASC, s.fecha_solicitud DESC
              """
        return ejecuta_all(sql, (user_id, user_id, user_id))

    # =========================================================
    # 3) MARCAR SOLICITUD COMO VISTA (UPSERT)
    # =========================================================
    @staticmethod
    def marcarSolicitudComoVista(user_id, id_solicitud):
        """
        ---------------------------------------------------------
        Marca una solicitud como vista por el receptor.
        ---------------------------------------------------------
        Se guarda en tabla intermedia solicitud_receptor:
        - (id_solicitud, id_receptor) suele ser UNIQUE o PK compuesta.
        - Si no existe fila -> INSERT
        - Si ya existe -> UPDATE (ON DUPLICATE KEY)
        ---------------------------------------------------------
        @param user_id: receptor (usuario autenticado)
        @param id_solicitud: solicitud que se marca como vista
        @return: resultado del INSERT (según tu helper puede devolver lastrowid)
        """
        sql = """
              INSERT INTO solicitud_receptor (id_solicitud, id_receptor, visto, fecha_visto)
              VALUES (%s, %s, 1, NOW())
              ON DUPLICATE KEY UPDATE
                  visto = 1,
                  fecha_visto = NOW()
              """

        # ✅ Esto es escritura (INSERT/UPDATE) → usamos ejecuta_insert (hace commit)
        return ejecuta_insert(sql, (id_solicitud, user_id))
        # =========================================================
        # 4) NUMERO DE SOLICITUDES RECIBIDAS EXPIRADAS
        # =========================================================


    @staticmethod
    def numeroExpiradasRecibidas(user_id: int) -> int:
        sql = """
        SELECT COUNT(DISTINCT s.id_solicitud) AS total
        FROM solicitud s
        LEFT JOIN solicitud_receptor sr
          ON sr.id_solicitud = s.id_solicitud
         AND sr.id_receptor = %s
        LEFT JOIN respuesta r
          ON r.id_solicitud = s.id_solicitud
         AND r.id_receptor = %s
        LEFT JOIN `match` m
          ON m.id_solicitud = s.id_solicitud
        WHERE s.estado = 'EXPIRADA'
          AND s.id_emisor <> %s
          AND m.id_match IS NULL
          AND (sr.id_solicitud IS NOT NULL OR r.id_respuesta IS NOT NULL);
        """
        fila = ejecuta_one(sql, (user_id, user_id, user_id))
        return int(fila["total"]) if fila else 0


