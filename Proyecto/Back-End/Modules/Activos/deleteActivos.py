# Blueprint registrado en appActivos.py
from flask import Blueprint, jsonify
import psycopg2
import os

delete_bp = Blueprint("delete_bp", __name__)

def get_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

@delete_bp.route("/activos/<int:activo_id>", methods=["DELETE"])
def delete_activo(activo_id):
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("DELETE FROM activos WHERE activo_id = %s", (activo_id,))

        if cur.rowcount == 0:
            conn.rollback()
            cur.close()
            conn.close()
            return jsonify({"error": f"Activo con ID {activo_id} no encontrado"}), 404

        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"mensaje": f"Activo {activo_id} eliminado exitosamente"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500