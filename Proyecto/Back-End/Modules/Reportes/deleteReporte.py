from flask import Blueprint, jsonify
import psycopg2, os

delete_reporte_bp = Blueprint("delete_reporte_bp", __name__)

def get_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

@delete_reporte_bp.route("/reportes/<int:reporte_id>", methods=["DELETE"])
def delete_reporte(reporte_id):
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM reportes WHERE reporte_id = %s", (reporte_id,))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"mensaje": "Reporte eliminado"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500