# endpoints/Usuarios.py

from flask import request
from flask_restful import Resource
from flask_jwt_extended import jwt_required, get_jwt_identity

from database.DB_Gestion_Usuarios import GestionUsuarios

import hashlib


# ============================================================
# HELPER DE AUTORIZACIÓN (ADMIN)
# ============================================================
def exigir_admin(user_id: int):
    """
    ------------------------------------------------------------
    Comprueba si el usuario es administrador.
    ------------------------------------------------------------
    @param user_id: ID del usuario autenticado
    @return:
      - (True, None) si es administrador
      - (False, (respuesta_json, http_code)) si no lo es
    """
    tipo = GestionUsuarios.obtener_tipo_actor(user_id)

    if tipo != "administrador":
        return False, (
            {"ok": False, "message": "Acceso denegado. Solo Administrador/a."},
            403
        )

    return True, None


# ============================================================
# UTILIDAD: HASH MD5
# ============================================================
def md5_hex(texto: str) -> str:
    """
    ------------------------------------------------------------
    Genera el hash MD5 hexadecimal de un texto.
    ------------------------------------------------------------
    ⚠️ Nota: Se mantiene MD5 por compatibilidad con el sistema
    actual, aunque no es recomendado para producción moderna.
    ------------------------------------------------------------
    @param texto: Texto plano
    @return: Hash MD5 en formato hexadecimal
    """
    return hashlib.md5(texto.encode("utf-8")).hexdigest()


# ============================================================
# USUARIO: DATOS BÁSICOS
# ============================================================
class UsuarioPorId(Resource):
    """
    ------------------------------------------------------------
    GET /usuarios/<id_user>
    ------------------------------------------------------------
    Devuelve los datos públicos/básicos del usuario autenticado.
    No incluye información sensible como la contraseña.
    ------------------------------------------------------------
    """

    @jwt_required()
    def get(self):
        """
        --------------------------------------------------------
        Obtiene el perfil del usuario autenticado a partir del JWT.
        --------------------------------------------------------
        @return:
          - 200 + datos del usuario
          - 404 si el usuario no existe
        """

        # ID del usuario autenticado (extraído del JWT)
        id_user = int(get_jwt_identity())

        # Obtiene el usuario desde la base de datos
        user = GestionUsuarios.get_usuario_por_id(id_user)

        # Usuario no encontrado
        if not user:
            return {"ok": False, "message": "Usuario no encontrado."}, 404

        # Devuelve los datos del usuario
        return user





# ============================================================
# USUARIO: CAMBIO DE CONTRASEÑA
# ============================================================

class UsuarioPassword(Resource):

    @jwt_required()
    def put(self):
        user_id = int(get_jwt_identity())
        data = request.get_json(silent=True) or {}

        password_actual = (data.get("password_actual") or "").strip()
        password_nueva  = (data.get("password_nueva")  or "").strip()

        # 1) Validaciones
        if not password_actual or not password_nueva:
            return {"ok": False, "message": "Faltan campos obligatorios."}, 400

        if len(password_nueva) < 8:
            return {"ok": False, "message": "La nueva contraseña debe tener al menos 8 caracteres."}, 400

        # 2) Leer hash actual en BD
        hash_bd = GestionUsuarios.get_password_por_id(user_id)
        if not hash_bd:
            return {"ok": False, "message": "Usuario no encontrado."}, 404

        hash_bd = str(hash_bd).lower().strip()
        hash_actual = md5_hex(password_actual).lower().strip()

        # 3) Comprobar actual
        if hash_actual != hash_bd:
            return {"ok": False, "message": "La contraseña actual no es correcta."}, 401

        # 4) Evitar update si es igual
        nueva_hash = md5_hex(password_nueva).lower().strip()
        if nueva_hash == hash_bd:
            return {"ok": True, "message": "La nueva contraseña es igual a la actual."}, 200

        # 5) Update
        try:
            rows = GestionUsuarios.actualizar_password(user_id, nueva_hash)
        except Exception as e:
            # log real
            print("ERROR actualizar_password:", repr(e))
            return {"ok": False, "message": "Error interno actualizando la contraseña."}, 500

        if not rows or int(rows) == 0:
            return {"ok": False, "message": "No se pudo actualizar la contraseña."}, 409

        return {"ok": True, "message": "Contraseña actualizada correctamente."}, 200


# ============================================================
# ADMIN: LISTADO DE USUARIOS
# ============================================================
class AdminDameUsuarios(Resource):
    """
    ------------------------------------------------------------
    GET /admin/usuarios
    ------------------------------------------------------------
    Devuelve un listado de usuarios con filtros opcionales.
    ------------------------------------------------------------
    Query params:
      - activo=0|1
      - id_rol=<int>
      - q=<texto>
    ------------------------------------------------------------
    """

    @jwt_required()
    def get(self):
        """
        --------------------------------------------------------
        Listado de usuarios para administración.
        --------------------------------------------------------
        @return:
          - 200 + lista de usuarios
          - 400 si parámetros inválidos
          - 403 si no es administrador
        """

        # Usuario autenticado
        user_id = int(get_jwt_identity())

        # Control de permisos
        ok, error = exigir_admin(user_id)
        if not ok:
            return error

        # Parámetros de filtrado
        activo = request.args.get("activo", type=int)
        id_rol = request.args.get("id_rol", type=int)
        q = (request.args.get("q") or "").strip() or None

        # Validación de parámetro activo
        if activo is not None and activo not in (0, 1):
            return {
                "ok": False,
                "message": "Parámetro 'activo' inválido. Usa 0 o 1."
            }, 400

        # Consulta a base de datos
        usuarios = GestionUsuarios.listar_usuarios(
            activo=activo,
            id_rol=id_rol,
            q=q
        )

        # Respuesta estándar
        return {
            "ok": True,
            "data": usuarios,
            "count": len(usuarios)
        }, 200


# ============================================================
# ADMIN: ACTIVAR / DESACTIVAR USUARIO
# ============================================================
class AdminActualizarEstadoUsuario(Resource):
    """
    ------------------------------------------------------------
    POST /admin/usuarios/<id_user>/estado
    ------------------------------------------------------------
    Activa o desactiva un usuario.
    ------------------------------------------------------------
    Body JSON:
    { "activo": 0 }  o  { "activo": 1 }
    ------------------------------------------------------------
    """

    @jwt_required()
    def post(self, id_user: int):
        """
        --------------------------------------------------------
        Actualiza el estado activo/inactivo de un usuario.
        --------------------------------------------------------
        @param id_user: ID del usuario a modificar
        @return:
          - 200 si se actualiza correctamente
          - 400 si el valor es inválido
          - 403 si no es administrador
          - 404 si el usuario no existe
        """

        # Usuario autenticado
        user_id = int(get_jwt_identity())

        # Control de permisos
        ok, error = exigir_admin(user_id)
        if not ok:
            return error

        # Cuerpo de la petición
        data = request.get_json(silent=True) or {}
        activo = data.get("activo", None)

        # Validación del campo activo
        if activo not in (0, 1):
            return {
                "ok": False,
                "message": "Campo 'activo' debe ser 0 o 1."
            }, 400

        # Actualización en BD
        rows = GestionUsuarios.actualizar_activo(
            int(id_user),
            int(activo)
        )

        # Usuario no encontrado o sin cambios
        if rows == 0:
            return {
                "ok": False,
                "message": "Usuario no encontrado o sin cambios."
            }, 404

        # Éxito
        return {
            "ok": True,
            "message": "Estado actualizado.",
            "id_user": int(id_user),
            "activo": int(activo)
        }, 200
