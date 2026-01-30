# endpoints/EP_Login.py

from flask import request
from flask_restful import Resource
from flask_jwt_extended import create_access_token
import hashlib

# Importar módulos de acceso a base de datos
from database.DB_Gestion_Usuarios import GestionUsuarios


# ============================================================
# LOGIN DE USUARIO
# ============================================================
class Login(Resource):
    """
    ------------------------------------------------------------
    Endpoint encargado de autenticar a un usuario mediante
    usuario y contraseña y generar un token JWT.
    ------------------------------------------------------------
    """

    def post(self):
        """
        --------------------------------------------------------
        POST /login
        --------------------------------------------------------
        Recibe las credenciales del usuario y, si son correctas,
        devuelve un token de acceso JWT junto con los datos
        básicos del usuario.
        --------------------------------------------------------
        Body JSON:
          {
            "usuario": "...",
            "password": "..."
          }
        --------------------------------------------------------
        @return:
          - 200 + token JWT y datos del usuario
          - 400 si faltan credenciales
          - 401 si las credenciales son incorrectas
        """

        # Leer datos enviados (JSON o formulario)
        data = request.get_json(silent=True) or request.values

        # Obtener credenciales
        username = data.get("usuario")
        raw_password = data.get("password")

        # Validación de campos obligatorios
        if not username or not raw_password:
            return {
                "msg": "Faltan credenciales (usuario y password)"
            }, 400

        # Convertir la contraseña a hash MD5 (por compatibilidad)
        password = hashlib.md5(
            raw_password.encode()
        ).hexdigest()

        # Comprobar credenciales en base de datos
        user = GestionUsuarios.dameUsuario(username, password)

        # Credenciales incorrectas
        if not user:
            return {
                "msg": "Credenciales inválidas"
            }, 401

        # ✅ Bloqueo por activo
        if int(user.get("activo", 0)) != 1:
            return {"msg": "Usuario bloqueado. Contacte con el administrador."}, 403

        # Generar token JWT con el ID del usuario como identidad
        access_token = create_access_token(
            identity=str(user["id_user"])
        )

        # Respuesta de login correcto
        return {
            "access_token": access_token,
            "user": {
                "id": user["id_user"],
                "username": user["username"],
                "rol": user["rol"],
            },
        }, 200
