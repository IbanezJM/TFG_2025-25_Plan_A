"""
Módulo de conexión a la base de datos y helpers genéricos para ejecutar SQL.

Responsabilidades:
- Crear conexiones a la base de datos
- Ejecutar consultas SELECT / INSERT / UPDATE / DELETE
- Gestionar transacciones cuando es necesario
"""

import pymysql.cursors


# =====================================================
# CONEXIÓN SIMPLE (AUTOCOMMIT)
# =====================================================
def conecta_rhinder():
    """
    -----------------------------------------------------
    Establece una conexión a la base de datos MySQL
    para operaciones simples.
    -----------------------------------------------------
    Características:
    - autocommit=True: cada operación se confirma automáticamente
    - cursor devuelve diccionarios (DictCursor)
    - soporte completo de Unicode (utf8mb4)
    -----------------------------------------------------
    Uso recomendado:
    - SELECT
    - INSERT simples
    - UPDATE / DELETE simples
    -----------------------------------------------------
    @return: conexión a la base de datos
    """
    db = pymysql.connect(
        host="127.0.0.1",
        port=3306,
        user="remoto",
        password="1111",
        database="rhinder_db",
        autocommit=True,
        cursorclass=pymysql.cursors.DictCursor,
        charset="utf8mb4",
    )
    return db


# =====================================================
# HELPERS SQL SIN TRANSACCIÓN
# =====================================================
def ejecuta_all(sql, params=None):
    """
    -----------------------------------------------------
    Ejecuta una consulta SELECT que devuelve varias filas.
    -----------------------------------------------------
    @param sql: consulta SQL
    @param params: parámetros de la consulta
    @return: lista de diccionarios
    """
    conn = conecta_rhinder()
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql, params)
            return cursor.fetchall()
    finally:
        # Cerrar siempre la conexión
        conn.close()


def ejecuta_one(sql, params=None):
    """
    -----------------------------------------------------
    Ejecuta una consulta SELECT que devuelve una sola fila.
    -----------------------------------------------------
    @param sql: consulta SQL
    @param params: parámetros de la consulta
    @return: diccionario o None
    """
    conn = conecta_rhinder()
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql, params)
            return cursor.fetchone()
    finally:
        conn.close()


def ejecuta_insert(sql, params=None):
    """
    -----------------------------------------------------
    Ejecuta una consulta INSERT.
    -----------------------------------------------------
    - Confirma automáticamente la operación
    - Devuelve el ID del registro insertado
    -----------------------------------------------------
    @param sql: consulta SQL
    @param params: parámetros de la consulta
    @return: lastrowid
    """
    conn = conecta_rhinder()
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql, params)
            conn.commit()
            return cursor.lastrowid
    finally:
        conn.close()


def ejecuta_Update_Delete(sql, params=None):
    """
    -----------------------------------------------------
    Ejecuta una consulta UPDATE o DELETE.
    -----------------------------------------------------
    - Confirma automáticamente los cambios
    - Devuelve el número de filas afectadas
    -----------------------------------------------------
    @param sql: consulta SQL
    @param params: parámetros de la consulta
    @return: número de filas afectadas
    """
    conn = conecta_rhinder()
    try:
        with conn.cursor() as cursor:
            rows = cursor.execute(sql, params)
            conn.commit()
            return rows
    finally:
        conn.close()


# =====================================================
# CONEXIONES CON TRANSACCIONES (AUTOCOMMIT = FALSE)
# =====================================================
def conecta_rhinder_tx():
    """
    -----------------------------------------------------
    Crea una conexión para trabajar con transacciones.
    -----------------------------------------------------
    Características:
    - autocommit=False
    - requiere commit() o rollback() manual
    -----------------------------------------------------
    Uso recomendado:
    - Operaciones críticas
    - Varias consultas dependientes entre sí
    -----------------------------------------------------
    @return: conexión a la base de datos
    """
    return pymysql.connect(
        host="127.0.0.1",
        port=3306,
        user="remoto",
        password="1111",
        database="rhinder_db",
        autocommit=False,
        cursorclass=pymysql.cursors.DictCursor,
        charset="utf8mb4",
    )


def ejecuta_one_tx(conn, sql, params=None):
    """
    -----------------------------------------------------
    Ejecuta un SELECT que devuelve una sola fila dentro
    de una transacción.
    -----------------------------------------------------
    @param conn: conexión abierta en modo transacción
    @param sql: consulta SQL
    @param params: parámetros de la consulta
    @return: diccionario o None
    """
    with conn.cursor() as cursor:
        cursor.execute(sql, params or [])
        return cursor.fetchone()


def ejecuta_all_tx(conn, sql, params=None):
    """
    -----------------------------------------------------
    Ejecuta un SELECT que devuelve varias filas dentro
    de una transacción.
    -----------------------------------------------------
    @param conn: conexión abierta en modo transacción
    @param sql: consulta SQL
    @param params: parámetros de la consulta
    @return: lista de diccionarios
    """
    with conn.cursor() as cursor:
        cursor.execute(sql, params or [])
        return cursor.fetchall()


def ejecuta_insert_tx(conn, sql, params=None):
    """
    -----------------------------------------------------
    Ejecuta un INSERT dentro de una transacción.
    -----------------------------------------------------
    IMPORTANTE:
    - NO hace commit aquí
    - El commit/rollback se gestiona fuera
    -----------------------------------------------------
    @param conn: conexión abierta en modo transacción
    @param sql: consulta SQL
    @param params: parámetros de la consulta
    @return: lastrowid
    """
    with conn.cursor() as cursor:
        cursor.execute(sql, params or [])
        return cursor.lastrowid


def ejecuta_update_delete_tx(conn, sql, params=None):
    """
    -----------------------------------------------------
    Ejecuta un UPDATE o DELETE dentro de una transacción.
    -----------------------------------------------------
    @param conn: conexión abierta en modo transacción
    @param sql: consulta SQL
    @param params: parámetros de la consulta
    @return: número de filas afectadas
    """
    with conn.cursor() as cursor:
        return cursor.execute(sql, params or [])


# =====================================================
# TURNO TEMPORAL TMP (HELPER DE BACKEND)
# =====================================================
def get_or_create_turno_tmp_tx(conn):
    """
    -----------------------------------------------------
    Obtiene o crea el turno temporal (TMP) dentro de una
    transacción.
    -----------------------------------------------------
    Lógica:
    1) Buscar el tipo de turno con nomenclatura 'TMP'
    2) Si no existe, crearlo
    3) Buscar el turno TMP con fecha fija 1900-01-01
    4) Si no existe, crearlo
    -----------------------------------------------------
    @param conn: conexión abierta en modo transacción
    @return: id_turno del turno temporal
    """

    # 1) Buscar el tipo de turno TMP
    row = ejecuta_one_tx(
        conn,
        "SELECT id_tipo_turno FROM tipo_turno WHERE nomenclatura=%s LIMIT 1",
        ("TMP",),
    )

    if row:
        id_tipo_tmp = row["id_tipo_turno"]
    else:
        # Crear el tipo de turno TMP si no existe
        id_tipo_tmp = ejecuta_insert_tx(
            conn,
            "INSERT INTO tipo_turno (turno, nomenclatura) VALUES (%s, %s)",
            ("Temporal", "TMP"),
        )

    # 2) Buscar el turno TMP con fecha fija
    row = ejecuta_one_tx(
        conn,
        "SELECT id_turno FROM turno WHERE id_tipo_turno=%s AND fecha_turno=%s LIMIT 1",
        (id_tipo_tmp, "1900-01-01"),
    )

    if row:
        return row["id_turno"]

    # Crear el turno TMP si no existe
    return ejecuta_insert_tx(
        conn,
        "INSERT INTO turno (id_tipo_turno, fecha_turno) VALUES (%s, %s)",
        (id_tipo_tmp, "1900-01-01"),
    )

