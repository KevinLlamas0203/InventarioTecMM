from flask import Blueprint, jsonify, request
import psycopg2, os

read_reporte_bp = Blueprint("read_reporte_bp", __name__)

def get_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

@read_reporte_bp.route("/reportes", methods=["GET"])
def get_reportes():
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM reportes ORDER BY fecha DESC")
        rows = cur.fetchall()
        cols = [desc[0] for desc in cur.description]
        cur.close()
        conn.close()
        return jsonify([dict(zip(cols, row)) for row in rows]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@read_reporte_bp.route("/reportes/<int:reporte_id>", methods=["GET"])
def get_reporte(reporte_id):
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM reportes WHERE reporte_id = %s", (reporte_id,))
        row = cur.fetchone()
        cols = [desc[0] for desc in cur.description]
        cur.close()
        conn.close()
        if not row:
            return jsonify({"error": "Reporte no encontrado"}), 404
        return jsonify(dict(zip(cols, row))), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500