from flask import Blueprint, jsonify
import psycopg2
import os
from Historial.historial_helper import registrar_historial

delete_consumible_bp = Blueprint("delete_consumible_bp", __name__)

def get_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

@delete_consumible_bp.route("/consumibles/<int:id>", methods=["DELETE"])
def delete_consumible(id):
    try:
        conn = get_connection()
        cur  = conn.cursor()
        cur.execute("DELETE FROM consumibles WHERE consumible_id = %s", (id,))
        if cur.rowcount == 0:
            cur.close(); conn.close()
            return jsonify({"error": "No encontrado"}), 404
        conn.commit()
        registrar_historial(
            accion     = "ELIMINAR",
            entidad    = "consumible",
            entidad_id = id,
            usuario    = "Sistema",
            detalle    = f"Eliminó consumible con ID: {id}",
        )
        cur.close(); conn.close()
        return jsonify({"mensaje": "Consumible eliminado"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500