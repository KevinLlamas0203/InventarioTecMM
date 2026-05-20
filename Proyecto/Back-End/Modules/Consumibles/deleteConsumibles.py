from flask import Blueprint, jsonify
import psycopg2
import os

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
            return jsonify({"error": "No encontrado"}), 404
        conn.commit()
        cur.close(); conn.close()
        return jsonify({"mensaje": "Consumible eliminado"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500