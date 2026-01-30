"""
Operaciones relacionadas con la tabla 'usuario'.

Este módulo pertenece a la capa DAL (Data Access Layer) y contiene
consultas y actualizaciones relacionadas con usuarios:
- login (búsqueda por username + password)
- perfil del usuario
- cambio de contraseña
- comprobación de roles (admin/coordinador)
- listado y activación/bloqueo de usuarios (admin)
"""

from .DB_Conexion import ejecuta_one, ejecuta_all, ejecuta_Update_Delete


class GestionUsuarios:
    """
    ---------------------------------------------------------
    Clase DAL para acceder a datos de la tabla usuario.
    ---------------------------------------------------------
    Importante:
    - Aquí NO va lógica de interfaz (solo SQL y validaciones simples).
    - Las contraseñas están en MD5 (por compatibilidad del proyecto).
    ---------------------------------------------------------
    """

    # =========================================================
    # 1) LOGIN: BUSCAR USUARIO POR CREDENCIALES
    # =========================================================
    @staticmethod
    def dameUsuario(username, password):
        """
        ---------------------------------------------------------
        Devuelve el usuario que coincide con username + password.
        ---------------------------------------------------------
        Se usa en el endpoint de login.
        - Si existe, devuelve datos básicos del usuario + su rol
        - Si no existe, devuelve None
        ---------------------------------------------------------
        @param username: nombre de usuario
        @param password: contraseña ya hasheada (MD5 en tu caso)
        @return: dict {id_user, username, rol} o None
        """
        sql = """
              SELECT usuario.id_trabajador AS id_user, \
                     usuario.username, \
                     rol.rol               AS rol, \
                     usuario.activo        AS activo
              FROM usuario
                       JOIN rol ON usuario.id_rol = rol.id_rol
              WHERE usuario.username = %s
                AND usuario.password = %s LIMIT 1 \
              """
        return ejecuta_one(sql, (username, password))

    # =========================================================
    # 2) PERFIL: OBTENER USUARIO POR ID (SIN PASSWORD)
    # =========================================================
    @staticmethod
    def get_usuario_por_id(id_user: int):
        """
        ---------------------------------------------------------
        Devuelve datos del usuario por id (sin incluir password).
        ---------------------------------------------------------
        Se usa para mostrar información del perfil.
        ---------------------------------------------------------
        @param id_user: id del usuario
        @return: dict con datos del usuario o None si no existe
        """
        sql = """
              SELECT u.id_trabajador AS id_user,
                     u.username,
                     u.email,
                     u.activo,
                     r.rol
              FROM usuario u
                       JOIN rol r ON r.id_rol = u.id_rol
              WHERE u.id_trabajador = %s LIMIT 1 \
              """
        return ejecuta_one(sql, (id_user,))

    # =========================================================
    # 3) OBTENER PASSWORD ACTUAL (PARA CAMBIO DE CONTRASEÑA)
    # =========================================================
    @staticmethod
    def get_password_por_id(id_user: int):
        """
        ---------------------------------------------------------
        Devuelve la contraseña (hash) almacenada en la BD.
        ---------------------------------------------------------
        Se usa típicamente antes de actualizar password, para comprobar
        que la contraseña actual introducida es correcta.
        ---------------------------------------------------------
        @param id_user: id del usuario
        @return: string (hash) o None si el usuario no existe
        """
        sql = """
              SELECT password
              FROM usuario
              WHERE id_trabajador = %s LIMIT 1
              """
        row = ejecuta_one(sql, (id_user,))
        return row["password"] if row else None

    # =========================================================
    # 4) ACTUALIZAR PASSWORD
    # =========================================================
    @staticmethod
    def actualizar_password(id_user: int, nueva_password: str):
        """
        ---------------------------------------------------------
        Actualiza la contraseña del usuario.
        ---------------------------------------------------------
        Importante:
        - Se espera recibir la contraseña ya hasheada (MD5) desde el endpoint.
        - Devuelve el número de filas afectadas (0 si no encontró el usuario).
        ---------------------------------------------------------
        @param id_user: id del usuario
        @param nueva_password: nueva contraseña (hash MD5)
        @return: filas afectadas (int)
        """
        sql = """
              UPDATE usuario
              SET password = %s
              WHERE id_trabajador = %s LIMIT 1
              """
        return ejecuta_Update_Delete(sql, (nueva_password, id_user))

    # =========================================================
    # 5) OBTENER TIPO DE ACTOR (ROL NORMALIZADO)
    # =========================================================
    @staticmethod
    def obtener_tipo_actor(user_id: int) -> str:
        """
        ---------------------------------------------------------
        Devuelve un rol normalizado para usar en autorización.
        ---------------------------------------------------------
        Devuelve:
          - "coordinador" si el usuario es Coordinador/a
          - "administrador" si el usuario es Administrador/a
          - "" si no tiene permisos especiales o no existe
        ---------------------------------------------------------
        @param user_id: id del usuario autenticado
        @return: string con tipo de actor ("coordinador"/"administrador"/"")
        """
        sql = """
              SELECT r.rol
              FROM usuario u
                       JOIN rol r ON r.id_rol = u.id_rol
              WHERE u.id_trabajador = %s LIMIT 1
              """
        row = ejecuta_one(sql, [user_id])
        if not row:
            return ""

        rol = row["rol"]

        # Normalizamos el texto del rol para usarlo en lógica del backend
        if rol == "Coordinador/a":
            return "coordinador"
        if rol == "Administrador/a":
            return "administrador"

        # Cualquier otro rol (p. ej. Trabajador/a) no tiene permisos especiales
        return ""

    # =========================================================
    # 6) LISTAR USUARIOS (ADMIN) CON FILTROS
    # =========================================================
    @staticmethod
    def listar_usuarios(activo=None, id_rol=None, q=None):
        """
        ---------------------------------------------------------
        Devuelve lista de usuarios (sin password) con filtros opcionales.
        ---------------------------------------------------------
        Filtros:
        - activo: 0 o 1 (o None)
        - id_rol: int (o None)
        - q: texto para buscar por username o email (o None)
        ---------------------------------------------------------
        Importante:
        - Construimos el SQL dinámicamente, añadiendo condiciones solo si vienen.
        - Usamos parámetros %s para evitar SQL injection.
        ---------------------------------------------------------
        @return: lista de dicts con usuarios
        """
        sql = """
              SELECT u.id_trabajador AS id_user,
                     u.username,
                     u.email,
                     u.activo,
                     u.id_rol,
                     r.rol
              FROM usuario u
                       JOIN rol r ON r.id_rol = u.id_rol
              WHERE 1 = 1 \
              """
        params = []

        # Filtro por activo (solo aceptamos 0 o 1)
        if activo in (0, 1):
            sql += " AND u.activo = %s"
            params.append(activo)

        # Filtro por rol
        if id_rol is not None:
            sql += " AND u.id_rol = %s"
            params.append(id_rol)

        # Búsqueda por username/email (LIKE con %texto%)
        if q:
            sql += " AND (u.username LIKE %s OR u.email LIKE %s)"
            like = f"%{q}%"
            params.append(like)
            params.append(like)

        # Orden (por id descendente: más nuevos primero)
        sql += " ORDER BY u.id_trabajador DESC"

        return ejecuta_all(sql, params)

    # =========================================================
    # 7) BLOQUEAR / DESBLOQUEAR USUARIO (ADMIN)
    # =========================================================
    @staticmethod
    def actualizar_activo(id_user: int, activo: int):
        """
        ---------------------------------------------------------
        Actualiza el campo activo:
        - activo = 1 => usuario habilitado
        - activo = 0 => usuario bloqueado
        ---------------------------------------------------------
        Se usa en el panel de administrador para gestionar usuarios.
        ---------------------------------------------------------
        @param id_user: id del usuario a modificar
        @param activo: 0 o 1
        @return: filas afectadas (int)
        """
        sql = """
              UPDATE usuario
              SET activo = %s
              WHERE id_trabajador = %s \
              """
        return ejecuta_Update_Delete(sql, (activo, id_user))


# ============================================================
# HELPERS DE AUTORIZACIÓN Y ROL
# ============================================================
def _es_coordinador_o_admin(user_id: int) -> bool:
    """
    ------------------------------------------------------------
    Comprueba si el usuario tiene rol de coordinador o administrador.
    ------------------------------------------------------------
    @param user_id: ID del usuario autenticado
    @return: True si es coordinador o administrador
    """
    tipo_actor = GestionUsuarios.obtener_tipo_actor(user_id)
    return tipo_actor in ("coordinador", "administrador")
