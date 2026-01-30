"""
Paquete DAL (Data Access Layer) de RHiNDER.

Este paquete agrupa toda la lógica de acceso a datos de la aplicación.
Su objetivo es separar el acceso a base de datos del resto de la lógica
de la aplicación (endpoints, servicios, etc.).
"""

from .DB_Conexion import conecta_rhinder, ejecuta_all, ejecuta_one, ejecuta_insert
from .DB_Gestion_Usuarios import GestionUsuarios
from .DB_Turnos import GestionTurnos
from .DB_Gestion_Solicitudes_Enviadas import GestionSolicitudesEnviadas
from .DB_Gestion_Respuestas import GestionRespuestas
from .DB_Gestion_Solicitudes_Recibidas import GestionSolicitudesRecibidas
from .DB_Gestion_Matches import GestionMatches





# ============================================================
# API PÚBLICA DEL PAQUETE DAL
# ============================================================
# __all__ define explícitamente qué elementos se exportan
# cuando se hace:
#   from database import *s
__all__ = [
    "conecta_rhinder",
    "ejecuta_all",
    "ejecuta_one",
    "ejecuta_insert",
    "GestionUsuarios",
    "GestionTurnos",
    "GestionSolicitudesEnviadas",
    "GestionRespuestas",
    "GestionSolicitudesRecibidas",
    "GestionMatches",
]
