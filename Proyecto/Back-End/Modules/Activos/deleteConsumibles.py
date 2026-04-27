from flask import Blueprint, jsonify
import psycopg2
import os

delete_consumible_bp = Blueprint("delete_consumible_bp", __name__)

def get_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

@delete_consumible_bp.route("/consumibles/<int:consumible_id>", methods=["DELETE"])
def delete_consumible(consumible_id):
    try:
        conn = get_connection()
        cur  = conn.cursor()

        cur.execute("DELETE FROM consumibles WHERE consumible_id = %s", (consumible_id,))

        if cur.rowcount == 0:
            conn.close()
            return jsonify({"error": f"Consumible con ID {consumible_id} no encontrado"}), 404

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"mensaje": f"Consumible {consumible_id} eliminado exitosamente"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
