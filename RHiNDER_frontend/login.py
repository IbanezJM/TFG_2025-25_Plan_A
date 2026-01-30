from xml.etree.ElementTree import tostring

from flask import Flask, render_template, request, session, make_response

import requests

from datetime import datetime, timedelta, timezone

app = Flask(__name__)

app.config['SECRET_KEY'] = 'secret!'


# Define la duración del token de acceso (access token).
#app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(minutes=15)

API_URL = 'http://192.168.10.10:5001'



# Ruta principal
@app.route('/')
def index():
    return render_template('comun/login.html')



# Lógica de logueo
@app.route("/login", methods=["GET", "POST"])
def login():

    if request.method == "GET":
        return render_template("comun/login.html")

    # -------- POST --------
    username = (request.form.get("usuario") or "").strip()
    password = (request.form.get("password") or "").strip()

    # Validación mínima (por si JS falla o está desactivado)
    if not username or not password:
        return render_template("comun/login.html", error_login="Usuario y contraseña obligatorios."), 200

    payload = {"usuario": username, "password": password}

    # Llamada al API (5001)
    try:
        response = requests.post(f"{API_URL}/login", json=payload, timeout=5)
    except requests.RequestException:
        return render_template("comun/login.html", error_login="No se pudo conectar con el servidor."), 200

    # ----------------------------
    # RESPUESTA DEL BACKEND
    # ----------------------------
    if response.status_code == 200:
        data = response.json()

    elif response.status_code == 401:
        try:
            msg = response.json().get("msg", "Credenciales incorrectas.")
        except Exception:
            msg = "Credenciales incorrectas."
        return render_template("comun/login.html", error_login=msg), 200

    elif response.status_code == 403:
        try:
            msg = response.json().get("msg", "Usuario bloqueado.")
        except Exception:
            msg = "Usuario bloqueado."
        return render_template("comun/login.html", error_login=msg), 200

    else:
        return render_template(
            "comun/login.html",
            error_login=f"No se pudo iniciar sesión. ({response.status_code})"
        ), 200

    token = data.get("access_token")
    user = data.get("user", {})

    if not token or not user:
        return render_template("comun/login.html", error_login="Respuesta inválida del servidor."), 200

    # Guardar sesión
    session["usuario"] = user.get("username")
    session["rol"] = user.get("rol")

    #expires = datetime.now(timezone.utc) + timedelta(minutes=15)

    rol = user.get("rol", "")
    username = user.get("username", "")

    # Render + cookies según rol
    if rol == "Trabajador/a":
        html = render_template(
            "trabajador/panel_trabajador.html",
            titulo="Panel Inicial del Trabajador/a",
            fecha=datetime.now().strftime("%d/%m/%Y"),
            username=username,
            rol=rol
        )
    elif rol == "Coordinador/a":
        html = render_template(
            "coordinador/panel_coordinador.html",
            titulo="Panel Inicial del Coordinador/a",
            fecha=datetime.now().strftime("%d/%m/%Y"),
            username=username,
            rol=rol
        )
    elif rol == "Administrador/a":
        html = render_template(
            "administrador/panel_administrador.html",
            titulo="Panel Inicial del Administrador/a",
            fecha=datetime.now().strftime("%d/%m/%Y"),
            username=username,
            rol=rol
        )
    else:
        # Rol desconocido -> vuelve al login con error
        return render_template("comun/login.html", error_login="Rol de usuario no válido."), 200

    dashboard = make_response(html)

    dashboard.set_cookie("JWT", token,  path="/")
    dashboard.set_cookie("rol", rol, path="/")
    dashboard.set_cookie("id", str(user.get("id", "")),  path="/")
    dashboard.set_cookie("nombre", username,  path="/")

    return dashboard


# ==========================================
#  RUTAS
# ==========================================

# ==========================================
#   TRABAJADOR
# ==========================================
@app.route('/trabajador/panel_trabajador')
def panel_trabajador():
    jwt_cookie = request.cookies.get('JWT')

    return render_template('trabajador/panel_trabajador.html', titulo='Panel del Trabajador/a', username=session.get('usuario'), rol=request.cookies.get('rol'), token=jwt_cookie)

# ruta solicitudes enviadas
@app.route('/trabajador/solicitudes-enviadas')
def solicitudes_enviadas():

    return render_template('trabajador/solicitudes_enviadas.html', titulo='Solicitudes Enviadas', username=session['usuario'], rol=request.cookies.get('rol')   )

# ruta solicitudes enviadas
@app.route('/trabajador/solicitudes-recibidas')
def solicitudes_recibidas():

    return render_template('trabajador/solicitudes_recibidas.html', titulo='Solicitudes Recibidas', username=session['usuario'], rol=request.cookies.get('rol')  )

# ruta historial matches
@app.route('/trabajador/historial-matches')
def historial_matches():

    return render_template('trabajador/historial_matches.html', titulo='Historial de Matches', username=session['usuario'] , rol=request.cookies.get('rol')  )

# ruta perfil
@app.route('/perfil')
def perfil():

    return render_template('comun/perfil.html', titulo='Perfil', username=session['usuario'], rol=request.cookies.get('rol')   )




# ==========================================
#   COORDINADOR
# ==========================================

# panel coordinador
@app.route('/coordinador/panel_coordinador')
def panel_coordinador():
    jwt_cookie = request.cookies.get('JWT')

    return render_template(
        'coordinador/panel_coordinador.html', titulo='Panel del Coordinador/a', username=session.get('usuario'), rol=request.cookies.get('rol'), token=jwt_cookie )


# ruta matches pendientes
@app.route('/matches_pendientes_validacion')
def matches_pendientes_validacion():

    return render_template('coordinador/matches_pendientes_validacion.html', titulo='Validacion de Matches', rol=request.cookies.get('rol'), username=session['usuario'])


# ruta historial validaciones
@app.route('/validaciones')
def validaciones():
    return render_template('coordinador/historial_validaciones.html', titulo='Historial de Validaciones', username=session['usuario'], rol=request.cookies.get('rol'))



# ==========================================
#   ADMINISTRADOR
# ==========================================

@app.route("/panel_administrador")
def panel_administrador():
    return render_template("administrador/panel_administrador.html", titulo="Panel del Administrador", username=session['usuario'], rol=request.cookies.get('rol'))




if __name__ == '__main__':
    app.run(debug=True, port=5000)