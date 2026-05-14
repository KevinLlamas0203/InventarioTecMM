from flask import Blueprint, jsonify
import psycopg2
import psycopg2.extras
import os

read_consumible_bp = Blueprint("read_consumible_bp", __name__)

def get_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

@read_consumible_bp.route("/consumibles", methods=["GET"])
def list_consumibles():
    try:
        conn = get_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT consumible_id, nombre, descripcion, categoria,
                   stock_actual, stock_minimo, ubicacion,
                   fecha_registro::text
            FROM consumibles
            ORDER BY consumible_id DESC
        """)
        rows = cur.fetchall()
        cur.close(); conn.close()
        return jsonify(list(rows)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@read_consumible_bp.route("/consumibles/<int:id>", methods=["GET"])
def get_consumible(id):
    try:
        conn = get_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT consumible_id, nombre, descripcion, categoria,
                   stock_actual, stock_minimo, ubicacion,
                   fecha_registro::text
            FROM consumibles WHERE consumible_id = %s
        """, (id,))
        row = cur.fetchone()
        cur.close(); conn.close()
        if not row:
            return jsonify({"error": "No encontrado"}), 404
        return jsonify(dict(row)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500