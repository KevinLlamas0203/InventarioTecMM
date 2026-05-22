from flask import Blueprint, jsonify, request
import psycopg2, os

read_historial_bp = Blueprint("read_historial_bp", __name__)

def get_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

@read_historial_bp.route("/historial", methods=["GET"])
def get_historial():
    entidad = request.args.get("entidad")   # filtro opcional
    try:
        conn = get_connection()
        cur = conn.cursor()
        if entidad:
            cur.execute("SELECT * FROM historial WHERE entidad = %s ORDER BY fecha_accion DESC", (entidad,))
        else:
            cur.execute("SELECT * FROM historial ORDER BY fecha_accion DESC")
        rows = cur.fetchall()
        cols = [desc[0] for desc in cur.description]
        cur.close()
        conn.close()
        return jsonify([dict(zip(cols, row)) for row in rows]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500