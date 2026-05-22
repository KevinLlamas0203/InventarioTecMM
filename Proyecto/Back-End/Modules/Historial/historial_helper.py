import os
import psycopg2
from datetime import datetime


def registrar_historial(accion, entidad, entidad_id=None, usuario="Sistema", detalle=""):
    """
    Registra una acción en el historial del sistema.
    Escribe directamente en la BD (sin HTTP) para evitar imports circulares.

    Parámetros:
        accion     (str): "CREAR", "EDITAR", "ELIMINAR", "LOGIN", "LOGOUT", "ASIGNAR"
        entidad    (str): "activo", "consumible", "usuario", "sistema", "reporte"
        entidad_id (int): ID del registro afectado (opcional)
        usuario    (str): Nombre del usuario que realizó la acción
        detalle    (str): Descripción legible del cambio
    """
    try:
        conn = psycopg2.connect(os.getenv("DATABASE_URL"))
        cur  = conn.cursor()
        cur.execute(
            """
            INSERT INTO historial (accion, entidad, entidad_id, usuario, detalle, fecha_accion)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (accion, entidad, entidad_id, usuario, detalle, datetime.now())
        )
        conn.commit()
        cur.close()
        conn.close()
    except Exception:
        # El historial NUNCA debe bloquear ni fallar la operación principal
        pass