"""
Operaciones relacionadas con turnos y calendario de trabajadores.

Este módulo pertenece a la capa DAL (Data Access Layer) y se encarga
de consultar los turnos asignados a los trabajadores, así como
información derivada como los días libres.
"""

from .DB_Conexion import ejecuta_all


class GestionTurnos:
    """
    ---------------------------------------------------------
    Clase DAL para gestionar consultas sobre turnos.
    ---------------------------------------------------------
    No modifica datos, solo realiza consultas SELECT.
    Se utiliza principalmente para:
    - Calendarios mensuales
    - Comprobación de días libres
    - Visualización de turnos en el frontend
    ---------------------------------------------------------
    """

    # =========================================================
    # 1) TURNOS DE UN TRABAJADOR EN UN MES CONCRETO
    # =========================================================
    @staticmethod
    def getTurnosTrabajadorMes(user_id, year, month):
        """
        ---------------------------------------------------------
        Devuelve los turnos asignados a un trabajador para un mes
        y año concretos.
        ---------------------------------------------------------
        Se utiliza para pintar el calendario mensual del usuario.
        ---------------------------------------------------------
        Parámetros:
        - user_id: identificador del trabajador
        - year: año numérico (ej. 2025)
        - month: mes numérico (1..12)
        ---------------------------------------------------------
        Devuelve:
        Lista de diccionarios, cada uno representando un turno:
        [
            {
                "id_turno_trabajador": 123,
                "id_turno": 456,
                "fecha_turno": "2025-11-18",
                "id_tipo_turno": 2,
                "nomenclatura": "M",
                "turno": "Mañana"
            },
            ...
        ]
        ---------------------------------------------------------
        """

        sql = """
            SELECT
                tt.id_trabajador AS id_user,
                tt.id_turno_trabajador,
                t.id_turno,
                t.fecha_turno,
                tp.id_tipo_turno,
                tp.nomenclatura,
                tp.turno
            FROM turno_trabajador tt
            JOIN turno t
                ON t.id_turno = tt.id_turno
            JOIN tipo_turno tp
                ON tp.id_tipo_turno = t.id_tipo_turno
            WHERE
                tt.id_trabajador = %s
                AND YEAR(t.fecha_turno) = %s
                AND MONTH(t.fecha_turno) = %s
            ORDER BY
                t.fecha_turno ASC;
        """

        return ejecuta_all(sql, (user_id, year, month))

    # =========================================================
    # 2) DÍAS LIBRES DE UN USUARIO EN UN MES CONCRETO
    # =========================================================
    @staticmethod
    def diasLibresUsuario(user_id, year, month):
        """
        ---------------------------------------------------------
        Devuelve los días en los que un usuario tiene turno LIBRE
        ('L') en un mes y año concretos.
        ---------------------------------------------------------
        Se utiliza para:
        - Filtrar solicitudes recibidas
        - Comprobar disponibilidad del usuario
        - Marcar días libres en el calendario
        ---------------------------------------------------------
        Parámetros:
        - user_id: identificador del trabajador
        - year: año numérico
        - month: mes numérico (1..12)
        ---------------------------------------------------------
        Devuelve:
        Lista de fechas (ordenadas) en las que el usuario está libre.
        ---------------------------------------------------------
        """

        sql = """
        SELECT t.fecha_turno
        FROM turno_trabajador tt
        JOIN turno t
            ON t.id_turno = tt.id_turno
        JOIN tipo_turno tp
            ON tp.id_tipo_turno = t.id_tipo_turno
        WHERE tt.id_trabajador = %s
          AND YEAR(t.fecha_turno) = %s
          AND MONTH(t.fecha_turno) = %s
          AND tp.nomenclatura = 'L'
        ORDER BY t.fecha_turno ASC;
        """

        return ejecuta_all(sql, (user_id, year, month))
