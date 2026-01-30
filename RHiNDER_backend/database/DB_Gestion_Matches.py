"""
Operaciones relacionadas con el historial de matches de cambio de turno.
"""

from .DB_Conexion import (
    ejecuta_all,
    ejecuta_insert,
    ejecuta_one,
    ejecuta_update_delete_tx,
    ejecuta_one_tx,
    ejecuta_insert_tx,
    conecta_rhinder_tx
)


class GestionMatches:

    @staticmethod
    def getHistorialMatchesUsuario(user_id):
        """
        Devuelve el historial de matches (intercambios) en los que participa un usuario.

        Incluye:
        - Datos del match (estado, fechas)
        - Usuario emisor y receptor (usernames)
        - Validación asociada (si existe): estado, fecha, comentario
        - Snapshot del intercambio (fechas + nomenclaturas guardadas en match)
        - Flags de visto (emisor/receptor)
        - Rol del usuario dentro del match: EMISOR / RECEPTOR / OTRO

        Parámetros:
        - user_id: id_trabajador del usuario actual

        Devuelve:
        - Lista de filas (dict) ordenadas por la última actividad del match.
        """
        sql = """
              SELECT m.id_match, 
                     m.estado                AS estado_match, 
                     m.fecha_match, 
                     m.fecha_ultimo_cambio, 

                     ue.username             AS emisor_username, 
                     ur.username             AS receptor_username, 

                     v.estado                AS estado_validacion, 
                     v.fecha_validacion, 
                     v.comentario            AS comentario_validacion, 

                     m.emisor_fecha          AS fecha_turno_emisor, 
                     m.emisor_nomenclatura   AS nomenclatura_emisor, 
                     m.receptor_fecha        AS fecha_turno_receptor, 
                     m.receptor_nomenclatura AS nomenclatura_receptor, 

                     -- ✅ vistos 
                     m.visto_por_emisor, 
                     m.visto_por_receptor, 

                     -- ✅ rol del usuario en este match 
                     CASE 
                         WHEN s.id_emisor = %s THEN 'EMISOR' 
                         WHEN m.id_receptor = %s THEN 'RECEPTOR' 
                         ELSE 'OTRO' 
                         END                 AS mi_rol_en_match

              FROM `match` m
                       JOIN solicitud s ON s.id_solicitud = m.id_solicitud
                       JOIN usuario ue ON ue.id_trabajador = s.id_emisor
                       JOIN usuario ur ON ur.id_trabajador = m.id_receptor
                       LEFT JOIN validacion v ON v.id_match = m.id_match

              WHERE (s.id_emisor = %s OR m.id_receptor = %s)
              ORDER BY m.fecha_ultimo_cambio DESC, m.fecha_match DESC
              """
        return ejecuta_all(sql, (user_id, user_id, user_id, user_id))

    @staticmethod
    def crear_match(id_solicitud, id_respuesta):
        """
        Crea un match a partir de una solicitud y una respuesta elegida como ganadora.

        Flujo:
        1) Lee el receptor (trabajador) asociado a la respuesta.
        2) Marca esa respuesta como SELECCIONADA (es_ganadora=1).
        3) Marca el resto de respuestas de la solicitud como NO_SELECCIONADA.
        4) Obtiene un snapshot (antes del swap) de:
           - fecha + nomenclatura del turno del emisor (turno solicitado)
           - fecha + nomenclatura del turno ofrecido por el receptor
        5) Inserta el match en estado PENDIENTE_VALIDACION con:
           - snapshots
           - flags visto a 0 (emisor, receptor, coordinador)
        6) Marca la solicitud como CONTESTADA.

        Parámetros:
        - id_solicitud: solicitud sobre la que se decide el intercambio
        - id_respuesta: respuesta seleccionada por el emisor (la “ganadora”)

        Devuelve:
        - dict con msg + ids, o error y código HTTP (en caso de uso vía API)
        """

        # 1) Obtener el receptor de la respuesta (quién responde/ofrece turno)
        sql_resp = """
                   SELECT id_receptor
                   FROM respuesta
                   WHERE id_respuesta = %s LIMIT 1 
                   """
        resp = ejecuta_one(sql_resp, [id_respuesta])
        if not resp:
            # Si no existe esa respuesta, no podemos crear el match
            return {"error": "La respuesta no existe"}, 404

        id_receptor = resp["id_receptor"]

        # 2) Marcar la respuesta elegida como ganadora/seleccionada
        sql_ganadora = """
                       UPDATE respuesta
                       SET estado      = 'SELECCIONADA',
                           es_ganadora = 1
                       WHERE id_respuesta = %s 
                       """
        ejecuta_all(sql_ganadora, [id_respuesta])

        # 3) Marcar el resto de respuestas de esa solicitud como NO seleccionadas
        #    (así solo queda una ganadora)
        sql_otras = """
                    UPDATE respuesta
                    SET estado      = 'NO_SELECCIONADA',
                        es_ganadora = 0
                    WHERE id_solicitud = %s
                      AND id_respuesta <> %s 
                    """
        ejecuta_all(sql_otras, [id_solicitud, id_respuesta])

        # ------------------------------------------------------------------
        # 4) SNAPSHOT de turnos ANTES del swap (fecha + nomenclatura)
        #    Guardamos qué turno tenía cada uno en ese intercambio, para mostrarlo
        #    en historial aunque luego cambien asignaciones.
        # ------------------------------------------------------------------
        sql_snapshot = """
                       SELECT te.fecha_turno   AS emisor_fecha, 
                              tpe.nomenclatura AS emisor_nomenclatura, 
                              tr.fecha_turno   AS receptor_fecha, 
                              tpr.nomenclatura AS receptor_nomenclatura
                       FROM solicitud s
                                JOIN turno_trabajador tte
                                     ON tte.id_turno_trabajador = s.id_turno_trabajador
                                JOIN turno te ON te.id_turno = tte.id_turno
                                JOIN tipo_turno tpe ON tpe.id_tipo_turno = te.id_tipo_turno

                                JOIN respuesta r
                                     ON r.id_solicitud = s.id_solicitud
                                         AND r.id_receptor = %s
                                JOIN turno_trabajador ttr
                                     ON ttr.id_turno_trabajador = r.id_turno_trabajador_receptor
                                JOIN turno tr ON tr.id_turno = ttr.id_turno
                                JOIN tipo_turno tpr ON tpr.id_tipo_turno = tr.id_tipo_turno

                       WHERE s.id_solicitud = %s LIMIT 1 
                       """
        snapshot = ejecuta_one(sql_snapshot, [id_receptor, id_solicitud])

        if not snapshot:
            # Si falla el snapshot es un problema interno (datos inconsistentes)
            return {"error": "No se pudo obtener el snapshot de turnos."}, 500

        # ------------------------------------------------------------------
        # 5) Crear el match con snapshot guardado + flags de visto a 0
        #    Estado inicial: PENDIENTE_VALIDACION (lo tiene que validar el coordinador/admin)
        # ------------------------------------------------------------------
        sql_match = """
                    INSERT INTO `match`
                    (id_solicitud, id_receptor, estado,
                     visto_por_emisor, visto_por_receptor, visto_por_coordinador,
                     emisor_fecha, emisor_nomenclatura,
                     receptor_fecha, receptor_nomenclatura)
                    VALUES (%s, %s, 'PENDIENTE_VALIDACION',
                            0, 0, 0,
                            %s, %s, %s, %s) 
                    """
        id_match = ejecuta_insert(sql_match, [
            id_solicitud,
            id_receptor,
            snapshot["emisor_fecha"],
            snapshot["emisor_nomenclatura"],
            snapshot["receptor_fecha"],
            snapshot["receptor_nomenclatura"],
        ])

        # 6) Actualizar la solicitud para reflejar que ya fue “cerrada” por elección de respuesta
        sql_sol = """
                  UPDATE solicitud
                  SET estado = 'CONTESTADA'
                  WHERE id_solicitud = %s 
                  """
        ejecuta_all(sql_sol, [id_solicitud])

        return {
            "msg": "Match creado correctamente",
            "id_match": id_match,
            "id_solicitud": id_solicitud,
            "id_receptor": id_receptor
        }

    # =========================================================
    # MATCHES PENDIENTES DE VALIDACIÓN (COORDINADOR)
    # =========================================================

    @staticmethod
    def getMatchesPendientesValidacion():
        """
        Devuelve los matches que están en estado 'PENDIENTE_VALIDACION'.

        Uso típico:
        - Vista del coordinador/administrador para ver qué intercambios debe aprobar o denegar.

        Incluye:
        - Datos del match y solicitud
        - Emisor y receptor (ids + usernames)
        - Snapshot guardado en match (fechas/nomenclaturas)
        - Flag visto_por_coordinador (para “notificaciones”)
        """
        sql = """
              SELECT m.id_match, 
                     m.estado                AS estado_match, 
                     m.fecha_match, 

                     s.id_solicitud, 
                     s.id_emisor, 
                     m.id_receptor, 

                     ue.username             AS emisor_username, 
                     ur.username             AS receptor_username, 

                     -- snapshots guardados en match (antes del swap) 
                     m.emisor_fecha          AS fecha_turno_emisor, 
                     m.emisor_nomenclatura   AS nomenclatura_emisor, 
                     m.receptor_fecha        AS fecha_turno_receptor, 
                     m.receptor_nomenclatura AS nomenclatura_receptor, 

                     -- ✅ visto por coordinador 
                     m.visto_por_coordinador

              FROM `match` m
                       JOIN solicitud s ON s.id_solicitud = m.id_solicitud
                       JOIN usuario ue ON ue.id_trabajador = s.id_emisor
                       JOIN usuario ur ON ur.id_trabajador = m.id_receptor

              WHERE m.estado = 'PENDIENTE_VALIDACION'
              ORDER BY m.fecha_match DESC 
              """
        return ejecuta_all(sql)

    # =========================================================
    # VALIDAR MATCH (TX)
    # =========================================================
    @staticmethod
    def validar_match(id_match: int, id_admin: int, tipo_actor: str):
        """
        Valida (aprueba) un match dentro de una TRANSACCIÓN.

        Qué hace:
        1) Abre conexión TX.
        2) Comprueba que el match existe y obtiene info mínima (ids de asignaciones).
        3) Crea o actualiza la fila de validación (estado=APROBADA).
        4) Actualiza el match a estado VALIDADO y resetea flags visto (para notificar a todos).
        5) Ejecuta el swap real de turnos (cambios en turno_trabajador).
        6) Commit. Si algo falla: rollback.

        Parámetros:
        - id_match: match a validar
        - id_admin: id del actor que valida (coordinador/admin)
        - tipo_actor: texto del rol (se pasa por si luego quieres loguear)

        Devuelve:
        - (dict, http_code)
        """
        conn = conecta_rhinder_tx()
        try:
            # 1) Comprobar que el match existe y obtener datos necesarios para el swap
            info = GestionMatches._obtener_info_match_tx(conn, id_match)
            if not info:
                return {"ok": False, "msg": "Match no encontrado."}, 404

            # 2) Comprobar si ya hay una validación creada para este match
            fila = ejecuta_one_tx(
                conn,
                "SELECT id_validacion FROM validacion WHERE id_match=%s LIMIT 1",
                [id_match]
            )

            if fila:
                # Si existe, la actualizamos (evitamos duplicados)
                ejecuta_update_delete_tx(
                    conn,
                    """
                    UPDATE validacion
                    SET estado='APROBADA',
                        id_admin=%s,
                        fecha_validacion=CURRENT_TIMESTAMP,
                        visto_por_coordinador=0
                    WHERE id_match=%s
                    """,
                    [id_admin, id_match]
                )
            else:
                # Si no existe, la creamos
                ejecuta_insert_tx(
                    conn,
                    """
                    INSERT INTO validacion (id_match, id_admin, estado, visto_por_coordinador)
                    VALUES (%s, %s, 'APROBADA', 0)

                    """,
                    [id_match, id_admin]
                )

            # 3) Actualizar el match (SIEMPRE), y resetear vistos para notificar cambios
            ejecuta_update_delete_tx(
                conn,
                """
                UPDATE `match`
                SET estado='VALIDADO',
                    visto_por_emisor=0,
                    visto_por_receptor=0,
                    visto_por_coordinador=0
                WHERE id_match = %s
                """,
                [id_match]
            )

            # 4) Intercambio real de turnos (cambios en turno_trabajador / turno)
            GestionMatches._swap_turnos_tx(conn, info)

            conn.commit()
            return {"ok": True, "msg": "Match validado correctamente."}, 200

        except Exception as e:
            # Si algo falla, deshacemos todo (evita datos a medias)
            conn.rollback()
            return {"ok": False, "msg": f"Error interno: {str(e)}"}, 500

        finally:
            conn.close()

    # =========================================================
    # DENEGAR MATCH (TX)
    # =========================================================
    @staticmethod
    def denegar_match(id_match: int, id_admin: int, tipo_actor: str):
        """
        Deniega (rechaza) un match dentro de una TRANSACCIÓN.

        Qué hace:
        1) Abre conexión TX.
        2) Comprueba que el match existe y obtiene info mínima.
        3) Crea o actualiza la fila de validación (estado=RECHAZADA).
        4) Actualiza el match a estado RECHAZADO y resetea flags visto.
        5) (Opcional) Cambia el estado de la solicitud a RECHAZADA.
        6) Commit. Si falla: rollback.

        Parámetros:
        - id_match: match a denegar
        - id_admin: id del actor que deniega
        - tipo_actor: rol (por si luego quieres loguear)

        Devuelve:
        - (dict, http_code)
        """
        conn = conecta_rhinder_tx()
        try:
            # 1) Comprobar que el match existe y obtener datos necesarios
            info = GestionMatches._obtener_info_match_tx(conn, id_match)
            if not info:
                return {"ok": False, "msg": "Match no encontrado."}, 404

            # 2) ¿Existe ya una validación? (si existe, se actualiza)
            fila = ejecuta_one_tx(
                conn,
                "SELECT id_validacion FROM validacion WHERE id_match=%s LIMIT 1",
                [id_match]
            )

            if fila:
                # Actualizar validación existente
                ejecuta_update_delete_tx(
                    conn,
                    """
                   UPDATE validacion
                    SET estado='RECHAZADA',
                        id_admin=%s,
                        fecha_validacion=CURRENT_TIMESTAMP,
                        visto_por_coordinador=0
                    WHERE id_match=%s

                    """,
                    [id_admin, id_match]
                )
            else:
                # Crear validación nueva
                ejecuta_insert_tx(
                    conn,
                    """
                    INSERT INTO validacion (id_match, id_admin, estado, visto_por_coordinador)
                    VALUES (%s, %s, 'RECHAZADA', 0)
                    """,
                    [id_match, id_admin]
                )

            # 3) Actualizar el match a RECHAZADO y resetear flags visto
            ejecuta_update_delete_tx(
                conn,
                """
                UPDATE `match`
                SET estado='RECHAZADO',
                    visto_por_emisor=0,
                    visto_por_receptor=0,
                    visto_por_coordinador=0
                WHERE id_match = %s
                """,
                [id_match]
            )

            # 4) (Opcional) reflejar el rechazo también en la solicitud
            ejecuta_update_delete_tx(
                conn,
                "UPDATE solicitud SET estado='RECHAZADA' WHERE id_solicitud=%s",
                [info["id_solicitud"]]
            )

            conn.commit()
            return {"ok": True, "msg": "Match denegado correctamente."}, 200

        except Exception as e:
            conn.rollback()
            return {"ok": False, "msg": f"Error interno: {str(e)}"}, 500

        finally:
            conn.close()

    @staticmethod
    def marcar_matches_como_vistos(user_id: int, tipo_actor: str = "trabajador"):
        """
        Marca matches como vistos para el actor que entra a la pantalla.

        Idea:
        - Cuando alguien entra a “historial matches” o “pendientes”, se ponen los flags de visto a 1
          para que desaparezcan los “puntos” / notificaciones.

        Reglas:
        - Si es coordinador/administrador:
            * Marca como vistos (visto_por_coordinador=1) los matches PENDIENTE_VALIDACION.
        - Si es trabajador:
            * Si participa como emisor: visto_por_emisor=1
            * Si participa como receptor: visto_por_receptor=1

        Parámetros:
        - user_id: id del trabajador (solo aplica a trabajador)
        - tipo_actor: 'trabajador', 'coordinador' o 'administrador'

        Devuelve:
        - dict con ok/msg
        """
        tipo_actor = (tipo_actor or "").lower()

        # -------------------------------------------------
        # COORDINADOR / ADMIN → solo pendientes de validación
        # -------------------------------------------------
        if tipo_actor in ("coordinador", "administrador"):
            sql = """
                  UPDATE `match`
                  SET visto_por_coordinador = 1
                  WHERE estado = 'PENDIENTE_VALIDACION'
                    AND visto_por_coordinador = 0 
                  """
            ejecuta_all(sql)
            return {
                "ok": True,
                "msg": "Matches pendientes marcados como vistos por coordinador"
            }

        # -------------------------------------------------
        # TRABAJADOR → si soy EMISOR (match ligado a una solicitud donde s.id_emisor = user_id)
        # -------------------------------------------------
        sql_emisor = """
                     UPDATE `match` m
                         JOIN solicitud s 
                     ON s.id_solicitud = m.id_solicitud
                         SET m.visto_por_emisor = 1
                     WHERE s.id_emisor = %s
                       AND m.visto_por_emisor = 0 
                     """
        ejecuta_all(sql_emisor, [user_id])

        # -------------------------------------------------
        # TRABAJADOR → si soy RECEPTOR (m.id_receptor = user_id)
        # -------------------------------------------------
        sql_receptor = """
                       UPDATE `match`
                       SET visto_por_receptor = 1
                       WHERE id_receptor = %s
                         AND visto_por_receptor = 0 
                       """
        ejecuta_all(sql_receptor, [user_id])

        return {
            "ok": True,
            "msg": "Matches marcados como vistos"
        }

    # =========================================================
    # HELPERS privados (TX)
    # =========================================================

    @staticmethod
    def _obtener_info_match_tx(conn, id_match: int):
        """
        Lee la información mínima del match necesaria para operar en TX (validar/denegar/swap).

        Devuelve:
        - id_match, id_solicitud
        - id_emisor (dueño de la solicitud)
        - id_receptor (quien ofreció el turno ganador)
        - id_asig_emisor: id_turno_trabajador del turno que el emisor ofrecía
        - id_asig_receptor: id_turno_trabajador del turno que el receptor ofrecía

        Nota:
        - Se enlaza con respuesta para localizar la asignación del receptor concreta
          que corresponde al receptor del match (la respuesta ganadora).
        """
        sql = """
            SELECT
                m.id_match,
                m.id_solicitud,
                s.id_emisor,
                m.id_receptor,
                s.id_turno_trabajador AS id_asig_emisor,
                r.id_turno_trabajador_receptor AS id_asig_receptor
            FROM `match` m
            JOIN solicitud s ON s.id_solicitud = m.id_solicitud
            JOIN respuesta r
              ON r.id_solicitud = s.id_solicitud
             AND r.id_receptor  = m.id_receptor
            WHERE m.id_match = %s
            LIMIT 1
        """
        return ejecuta_one_tx(conn, sql, [id_match])

    @staticmethod
    def _obtener_id_turno_tmp_tx(conn) -> int:
        """
        Devuelve el id_turno del turno temporal TMP (comodín).

        Para qué sirve:
        - En algunos swaps complejos se usa un “turno temporal” para evitar colisiones.
        - Aquí lo dejas preparado por si en el futuro quieres un swap con 3 pasos.

        Requisito:
        - Debe existir un tipo_turno con nomenclatura='TMP'
        - Debe existir un turno con fecha_turno='1900-01-01' asociado a ese tipo_turno

        Lanza:
        - RuntimeError si no existe (para que el desarrollador ejecute el seed SQL).
        """
        fila = ejecuta_one_tx(conn, """
            SELECT t.id_turno AS id_turno_tmp
            FROM turno t
            JOIN tipo_turno tt ON tt.id_tipo_turno = t.id_tipo_turno
            WHERE tt.nomenclatura='TMP' AND t.fecha_turno='1900-01-01'
            LIMIT 1
        """)
        if not fila:
            raise RuntimeError("No existe el turno TMP. Ejecuta el SQL de creación de TMP.")
        return int(fila["id_turno_tmp"])

    @staticmethod
    def _upsert_validacion_snapshot_tx(
            conn,
            id_match: int,
            id_admin: int,
            estado: str,
            comentario: str,
            emisor_fecha: str,
            emisor_nomenclatura: str,
            receptor_fecha: str,
            receptor_nomenclatura: str
    ) -> int:
        """
        Crea o actualiza (upsert manual) una validación asociada a un match,
        guardando también un snapshot (fechas/nomenclaturas) dentro de validación.

        Cuándo usarlo:
        - Si quieres que la tabla validacion “congele” también la info del intercambio
          (además del snapshot que ya guardas en match).

        Devuelve:
        - id_validacion (existente o recién creada)

        Nota:
        - Se hace “upsert” en dos pasos: SELECT primero, luego UPDATE o INSERT.
        """
        fila = ejecuta_one_tx(
            conn,
            "SELECT id_validacion FROM validacion WHERE id_match=%s LIMIT 1",
            [id_match]
        )

        if fila:
            # Ya existe validación → actualizarla
            id_validacion = int(fila["id_validacion"])
            ejecuta_update_delete_tx(conn, """
                                           UPDATE validacion
                                           SET estado=%s,
                                               id_admin=%s,
                                               comentario=%s,
                                               emisor_fecha=%s,
                                               emisor_nomenclatura=%s,
                                               receptor_fecha=%s,
                                               receptor_nomenclatura=%s,
                                               fecha_validacion=CURRENT_TIMESTAMP
                                           WHERE id_validacion = %s
                                           """, [
                estado, id_admin, comentario,
                emisor_fecha, emisor_nomenclatura,
                receptor_fecha, receptor_nomenclatura,
                id_validacion
            ])
            return id_validacion

        # No existe → crearla
        return int(ejecuta_insert_tx(conn, """
                                           INSERT INTO validacion
                                           (id_match, id_admin, estado, comentario,
                                            emisor_fecha, emisor_nomenclatura,
                                            receptor_fecha, receptor_nomenclatura)
                                           VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                                           """, [
            id_match, id_admin, estado, comentario,
            emisor_fecha, emisor_nomenclatura,
            receptor_fecha, receptor_nomenclatura
        ]))

    @staticmethod
    def _swap_turnos_tx(conn, info: dict):
        """
        Ejecuta el intercambio REAL de turnos en base a las asignaciones del match.

        Qué representa:
        - El emisor “da” su turno del día A
        - El receptor “da” su turno del día B

        Resultado final (4 movimientos):
        - Emisor:
            * Día A -> L (Libre)
            * Día B -> turno del receptor
        - Receptor:
            * Día B -> L (Libre)
            * Día A -> turno del emisor

        Nota importante:
        - Aquí no se cambian ids de “asignación” (id_turno_trabajador).
          Lo que cambia es el id_turno asociado en turno_trabajador.
        """

        # 1) Leer el turno+fecha actual del emisor (asignación original del match)
        rowE = ejecuta_one_tx(conn, """
                                    SELECT tt.id_turno, t.fecha_turno
                                    FROM turno_trabajador tt
                                             JOIN turno t ON t.id_turno = tt.id_turno
                                    WHERE tt.id_turno_trabajador = %s LIMIT 1
                                    """, [info["id_asig_emisor"]])

        # 2) Leer el turno+fecha actual del receptor (asignación original del match)
        rowR = ejecuta_one_tx(conn, """
                                    SELECT tt.id_turno, t.fecha_turno
                                    FROM turno_trabajador tt
                                             JOIN turno t ON t.id_turno = tt.id_turno
                                    WHERE tt.id_turno_trabajador = %s LIMIT 1
                                    """, [info["id_asig_receptor"]])

        if not rowE or not rowR:
            # Si faltan datos, no podemos hacer swap con seguridad
            raise Exception("No se pudieron leer los turnos ofertados.")

        turno_emisor = int(rowE["id_turno"])
        fecha_emisor = str(rowE["fecha_turno"])

        turno_receptor = int(rowR["id_turno"])
        fecha_receptor = str(rowR["fecha_turno"])

        # 3) Asegurar que existen turnos "L" para ambos días (si no, crearlos)
        turno_L_emisor = GestionMatches._get_or_create_turno_L_por_fecha_tx(conn, fecha_emisor)
        turno_L_receptor = GestionMatches._get_or_create_turno_L_por_fecha_tx(conn, fecha_receptor)

        # 4) Aplicar los 4 cambios finales

        # Emisor: su día original pasa a Libre
        GestionMatches._set_turno_en_fecha_tx(conn, info["id_emisor"], fecha_emisor, turno_L_emisor)
        # Emisor: en el día del receptor pasa a tener el turno que ofrecía el receptor
        GestionMatches._set_turno_en_fecha_tx(conn, info["id_emisor"], fecha_receptor, turno_receptor)

        # Receptor: su día original pasa a Libre
        GestionMatches._set_turno_en_fecha_tx(conn, info["id_receptor"], fecha_receptor, turno_L_receptor)
        # Receptor: en el día del emisor pasa a tener el turno que ofrecía el emisor
        GestionMatches._set_turno_en_fecha_tx(conn, info["id_receptor"], fecha_emisor, turno_emisor)

    @staticmethod
    def _insertar_log_tx(conn, id_admin: int, tipo_actor: str, id_validacion: int,
                         id_match: int, info: dict, comentario: str):
        """
        Inserta un log del intercambio en la BBDD de logs.

        Para qué sirve:
        - Auditoría: saber quién validó/denegó, qué match fue, y entre qué trabajadores.

        Nota:
        - before/after de asignaciones quedan iguales porque no “movemos” filas,
          solo cambiamos turno_trabajador.id_turno.
        """
        sql = """
            INSERT INTO rhinder_logs.log_cambio_turno
            (id_actor, tipo_actor, id_validacion, id_match,
             id_trabajador_emisor, id_trabajador_receptor,
             id_asig_emisor_before, id_asig_emisor_after,
             id_asig_receptor_before, id_asig_receptor_after,
             comentario)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """
        ejecuta_insert_tx(conn, sql, [
            id_admin, tipo_actor, id_validacion, id_match,
            info["id_emisor"], info["id_receptor"],
            info["id_asig_emisor"], info["id_asig_emisor"],
            info["id_asig_receptor"], info["id_asig_receptor"],
            comentario
        ])

    @staticmethod
    def _get_or_create_turno_L_por_fecha_tx(conn, fecha_iso: str) -> int:
        """
        Obtiene (o crea) el turno 'L' (Libre) para una fecha concreta.

        Pasos:
        1) Busca el id_tipo_turno asociado a nomenclatura='L'
        2) Busca si existe un turno (tabla turno) con esa fecha y ese tipo
        3) Si no existe, lo inserta
        4) Devuelve id_turno

        Parámetros:
        - fecha_iso: fecha en formato 'YYYY-MM-DD'
        """
        # 1) id_tipo_turno de 'L'
        row = ejecuta_one_tx(
            conn,
            "SELECT id_tipo_turno FROM tipo_turno WHERE nomenclatura='L' LIMIT 1"
        )
        if not row:
            raise Exception("No existe el tipo_turno 'L'. Ejecuta el seed de tipo_turno.")

        id_tipo_L = row["id_tipo_turno"]

        # 2) ¿Existe ya un turno L para esa fecha?
        row = ejecuta_one_tx(conn, """
                                   SELECT id_turno
                                   FROM turno
                                   WHERE id_tipo_turno = %s
                                     AND fecha_turno = %s LIMIT 1
                                   """, [id_tipo_L, fecha_iso])

        if row:
            return row["id_turno"]

        # 3) Si no existe, lo creamos
        return ejecuta_insert_tx(
            conn,
            "INSERT INTO turno (id_tipo_turno, fecha_turno) VALUES (%s, %s)",
            [id_tipo_L, fecha_iso]
        )

    @staticmethod
    def _set_turno_en_fecha_tx(conn, id_trabajador: int, fecha_iso: str, id_turno_nuevo: int):
        """
        Asigna a un trabajador un turno concreto (id_turno_nuevo) en una fecha dada.

        Estrategia:
        - Si ya existe una fila turno_trabajador para ese trabajador y esa fecha -> UPDATE.
        - Si no existe -> INSERT.

        Parámetros:
        - id_trabajador: id del trabajador
        - fecha_iso: fecha en formato 'YYYY-MM-DD'
        - id_turno_nuevo: id_turno que queremos poner ese día
        """
        fila = ejecuta_one_tx(conn, """
            SELECT tt.id_turno_trabajador
            FROM turno_trabajador tt
            JOIN turno t ON t.id_turno = tt.id_turno
            WHERE tt.id_trabajador=%s AND t.fecha_turno=%s
            LIMIT 1
        """, [id_trabajador, fecha_iso])

        if fila:
            # Existe asignación para ese día -> la actualizamos
            ejecuta_update_delete_tx(conn, """
                UPDATE turno_trabajador
                SET id_turno=%s
                WHERE id_turno_trabajador=%s
            """, [id_turno_nuevo, fila["id_turno_trabajador"]])
        else:
            # No existe -> la creamos
            ejecuta_insert_tx(conn, """
                INSERT INTO turno_trabajador (id_turno, id_trabajador)
                VALUES (%s, %s)
            """, [id_turno_nuevo, id_trabajador])

    @staticmethod
    def _obtener_turnos_before_tx(conn, info: dict):
        """
        Obtiene un snapshot “before” leyendo las asignaciones originales del match.

        Para qué sirve:
        - Loguear / auditar qué tenía cada uno antes del swap.
        - Comparar antes/después (aunque el “after” se obtiene tras el swap).

        Devuelve:
        - dict con:
            emisor_fecha, emisor_turno, receptor_fecha, receptor_turno
        """
        emisor = ejecuta_one_tx(conn, """
                                      SELECT t.fecha_turno, tp.nomenclatura
                                      FROM turno_trabajador tt
                                               JOIN turno t ON t.id_turno = tt.id_turno
                                               JOIN tipo_turno tp ON tp.id_tipo_turno = t.id_tipo_turno
                                      WHERE tt.id_turno_trabajador = %s
                                      """, [info["id_asig_emisor"]])

        receptor = ejecuta_one_tx(conn, """
                                        SELECT t.fecha_turno, tp.nomenclatura
                                        FROM turno_trabajador tt
                                                 JOIN turno t ON t.id_turno = tt.id_turno
                                                 JOIN tipo_turno tp ON tp.id_tipo_turno = t.id_tipo_turno
                                        WHERE tt.id_turno_trabajador = %s
                                        """, [info["id_asig_receptor"]])

        return {
            "emisor_fecha": str(emisor["fecha_turno"]),
            "emisor_turno": emisor["nomenclatura"],
            "receptor_fecha": str(receptor["fecha_turno"]),
            "receptor_turno": receptor["nomenclatura"],
        }
