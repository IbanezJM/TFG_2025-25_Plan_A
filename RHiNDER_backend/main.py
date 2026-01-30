# main.py
from flask import Flask, make_response
from flask_restful import Api
from flask_jwt_extended import JWTManager
from flask_cors import CORS
import datetime
from datetime import timedelta
from flask.json.provider import DefaultJSONProvider




# IMPORTAR MODULOS DE ENDPOINTS
# ================================================================

# trabajador
from endpoints.EP_Login import Login
from endpoints.EP_Turnos import Turnos, DiasLibresUsuario
from endpoints.EP_SolicitudesEnviadas import SolicitudesEnviadas, SolicitudesEnviadasExpiradasCount
from endpoints.EP_Respuestas import RespuestasSolicitudesActivasUsuario, TurnosUsadosRespuestas, RespuestasExpiradasAviso
from endpoints.EP_SolicitudesRecibidas import SolicitudesRecibidas,SolicitudesNuevasRecibidas, SolicitudesRecibidasExpiradasCount

from endpoints.EP_Matches import HistorialMatches
from endpoints.EP_Usuarios import UsuarioPorId, UsuarioPassword


# coordinador
from endpoints.EP_EstadisticasCoordinador import  EstadisticasValidacionesEstado,  EstadisticasValidacionesPorDia
from endpoints.EP_Matches import MatchesPendientesValidacion, MatchesVistos, MatchValidar, MatchDenegar
from endpoints.EP_Validaciones import HistorialValidaciones, ValidacionesNuevas, ValidacionesVistas



# administrador
from endpoints.EP_Usuarios import AdminDameUsuarios, AdminActualizarEstadoUsuario





# CONFIGURACIÓN FLASK
# ================================================================


# 1) CREACIÓN DE LA APLICACIÓN FLASK
# ----------------------------------------------------------------
# instancia ppal (app) -> actuará como servidor web -> contiene configuración.
# ================================================================
app = Flask(__name__)


# ================================================================
# 2) CONFIGURACIÓN DE CORS
# ----------------------------------------------------------------
# CORS permite que un navegador autorice peticiones entre PUERTOS.
# En este caso:
#   - FRONTEND → http://localhost:5000
#   - BACKEND  → http://localhost:5001
#
# Sin esto, el navegador bloquearía TODAS las peticiones fetch().
#
# Con resources = { r"/*": {"origins": "http://localhost:5000"} }
# le decimos:
#   → Permite que SOLO el frontend (puerto 5000) llame a la API.
# ================================================================
CORS(app, resources={r"/*": {
  "origins": [
    "https://www.rhinder.com",
    "https://rhinder.com",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
  ]
}})



# ================================================================
# 3) SERIALIZADOR JSON PERSONALIZADO
# ----------------------------------------------------------------
# Flask por defecto NO sabe convertir objetos datetime/date a JSON.
# Esto provoca errores si un endpoint devuelve fechas.
#
# CustomJSONProvider reemplaza el serializador de Flask para que:

#   - Si un valor es datetime o date → lo convierte automáticamente
#     al formato ISO8601 (ejemplo: "2025-11-22T14:30:00")
#
# Esto permite devolver objetos Python "normales" sin preocuparse.
# ================================================================
class CustomJSONProvider(DefaultJSONProvider):

    def default(self, obj):

        # Si el objeto es una fecha, lo convertimos a texto ISO8601
        if isinstance(obj, (datetime.date, datetime.datetime)):
            return obj.isoformat()

        # Para cualquier otro tipo, usamos el método estándar
        return super().default(obj)

# Reemplazamos el serializador interno de Flask por el nuestro
app.json = CustomJSONProvider(app)


# ================================================================
# 4) CONFIGURACIÓN DE JWT
# ----------------------------------------------------------------
# JWT (JSON Web Token) permite autenticar usuarios sin sesiones.
#
# - JWT_SECRET_KEY: clave usada para firmar los tokens.
# - create_access_token(): crea tokens en /login
# - @jwt_required(): protege endpoints
# - get_jwt_identity(): obtiene el id del usuario autenticado
#
# IMPORTANTE: en producción esta clave debe venir de variables
#             de entorno, no escrita en el código.
# ================================================================
app.config["JWT_SECRET_KEY"] = "cambia-esta-clave-secreta"
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(minutes=15)
jwt = JWTManager(app)


# ================================================================
# 5) API RESTful
# ----------------------------------------------------------------
# Api(app) permite registrar clases de recursos como:
#   api.add_resource(Login, "/login")
#   api.add_resource(Solicitudes, "/solicitud")
#
# Cada clase puede tener métodos GET/POST/PUT/DELETE.
# ================================================================
api = Api(app)


# ================================================================
# 6) REPRESENTACIÓN JSON PARA FLASK-RESTFUL
# ----------------------------------------------------------------
# Flask-RESTful utiliza SU PROPIO sistema de serialización,
# que NO usa el JSON provider que configuramos arriba.
#
# Por eso definimos:
#   @api.representation('application/json')
#
# Esto garantiza que:
#   - TODAS las respuestas JSON pasen por output_json()
#   - TODAS las fechas se conviertan correctamente
#   - SIEMPRE se envíe Content-Type: application/json
#
# El método output_json recibe el "data" que devuelve un recurso,
# y lo convierte a JSON usando nuestra configuración personalizada.
# ================================================================
@api.representation('application/json')
def output_json(data, code, headers=None):
    """
    Serializa la respuesta en JSON usando el JSON provider personalizado.

    data → lo que devuelve el recurso (dict, list, mensaje)
    code → código HTTP (200, 400, 404...)
    headers → cabeceras opcionales
    """

    # convertimos 'data' en JSON real usando nuestro provider
    resp = make_response(app.json.dumps(data), code)

    # añadimos cabeceras extra si se enviaron
    resp.headers.extend(headers or {})

    # aseguramos que el navegador lo trate como JSON
    resp.headers['Content-Type'] = 'application/json'

    return resp



# =====================================================================
# REGISTRO DE RECURSOS (ENDPOINTS DE LA API)
# =====================================================================


# -----------------------------------------------------
# ENDPOINT DE LOGIN (acceso público)
#   POST /login
# -----------------------------------------------------
# Esta ruta permite que el usuario envíe credenciales y reciba su JWT.
# No requiere autenticación previa.
api.add_resource(Login, "/login")



# -----------------------------------------------------
# TRABAJADOR
# -----------------------------------------------------

# -----------------------------------------------------
# ENDPOINTS VER CALENDARIO DE TURNOS (requiere JWT)
#
# GET  /calendario
#       → Obtiene los turnos de un trabajador
#
# -----------------------------------------------------
api.add_resource( Turnos,"/turnos")
api.add_resource( DiasLibresUsuario,  "/turnos/libres/<int:id_user>")


# -----------------------------------------------------
# ENDPOINTS DE SOLICITUDES ENVIADAS (requiere JWT)
#
# GET  /solicitud
#       → Obtiene las solicitudes creadas por el usuario
#
# POST /solicitud
#       → Crea una solicitud nueva para un turno del usuario
#
# PUT  /solicitud/cancelar/<id_solicitud>
#       → Cancela una solicitud creada por el usuario si está activa
# -----------------------------------------------------
api.add_resource(
    SolicitudesEnviadas,
    "/solicitud",                                # GET + POST
    "/solicitud/cancelar/<int:id_solicitud>"          # PUT
)

api.add_resource(
    SolicitudesEnviadasExpiradasCount,
    "/solicitudes/enviadas/expiradas/count"
)



# -----------------------------------------------------
# ENDPOINT DE RESPUESTAS A MIS SOLICITUDES (requiere JWT)
#   GET /respuestas
#
# Devuelve todas las respuestas que otros usuarios han hecho
# a mis solicitudes activas.
# -----------------------------------------------------
api.add_resource(
    RespuestasSolicitudesActivasUsuario,
"/respuestas",
    "/respuestas/vistas"
)

api.add_resource(
    TurnosUsadosRespuestas,
"/respuestas/turnos-usados")

api.add_resource(
    RespuestasExpiradasAviso,
    "/respuestas/expiradas/avisar"
)



# -----------------------------------------------------
# ENDPOINT DE SOLICITUDES RECIBIDAS (requiere JWT)
#   GET /solicitudes-recibidas
#
# Devuelve las solicitudes que OTROS trabajadores han enviado
# solicitando un intercambio de turno conmigo.
# -----------------------------------------------------
api.add_resource(
    SolicitudesRecibidas,
            "/solicitudes/recibidas",
                "/solicitudes/vistas/<int:id_solicitud>"
)

api.add_resource(SolicitudesNuevasRecibidas,
                 "/solicitudes/recibidas/nuevas",
                 "/solicitudes/recibidas/nuevas/vista/<int:id_solicitud>")


api.add_resource(
    SolicitudesRecibidasExpiradasCount,
    "/solicitudes/recibidas/expiradas/count"
)


# -----------------------------------------------------
# ENDPOINT DE HISTORIAL DE MATCHES (requiere JWT)
#   GET /matches
#
# Devuelve todos los matches en los que el usuario participó:
#   - como emisor de la solicitud
#   - o como receptor ganador
# -----------------------------------------------------




# -----------------------------------------------------
# ENDPOINT GESTION DE USUARIOS (requiere JWT)
#   GET /usuario
#
# -----------------------------------------------------
api.add_resource(UsuarioPorId, "/usuario")
api.add_resource(UsuarioPassword, "/usuario/password")



# -----------------------------------------------------
# COORDINADOR
# -----------------------------------------------------

# -----------------------------------------------------
# ENDPOINT ESTADISTICAS COORDINADOR(requiere JWT)
#   GET /
#
# -----------------------------------------------------
api.add_resource(EstadisticasValidacionesEstado, "/coordinador/estadisticas/validaciones/estado")
api.add_resource(EstadisticasValidacionesPorDia, "/coordinador/estadisticas/validaciones/por-dia")

# -----------------------------------------------------
# ENDPOINT VALIDACIÓN DE MATCHES (requiere JWT)
#   GET /matches
#
# -----------------------------------------------------
api.add_resource(HistorialMatches,"/matches")
api.add_resource(MatchesPendientesValidacion, "/matches/pendientes")
api.add_resource(MatchesVistos, "/matches/vistos")
api.add_resource(MatchValidar, "/matches/validar/<int:id_match>")
api.add_resource(MatchDenegar, "/matches/denegar/<int:id_match>")



# -----------------------------------------------------
# ENDPOINT VALIDACIONES (requiere JWT)
#   GET /
#
# -----------------------------------------------------

api.add_resource(HistorialValidaciones, "/validaciones")
api.add_resource(ValidacionesNuevas, "/validaciones/nuevas")
api.add_resource(ValidacionesVistas, "/validaciones/vistas")



# -----------------------------------------------------
# ADMIN
# -----------------------------------------------------
api.add_resource(AdminDameUsuarios, "/usuarios")
api.add_resource(AdminActualizarEstadoUsuario, "/usuarios/estado/<int:id_user>")



if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5001)
