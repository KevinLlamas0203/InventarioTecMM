from flask import Blueprint, jsonify
import psycopg2
import os

read_consumible_bp = Blueprint("read_consumible_bp", __name__)

def get_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

def consumible_to_dict(row):
    return {
        "consumible_id":  row[0],
        "nombre":         row[1],
        "descripcion":    row[2],
        "categoria":      row[3],
        "unidad":         row[4],
        "stock_actual":   row[5],
        "stock_minimo":   row[6],
        "precio_unitario": float(row[7]) if row[7] is not None else None,
        "ubicacion":      row[8],
        "fecha_registro": str(row[9]) if row[9] else None  # YYYY-MM-DD
    }

@read_consumible_bp.route("/consumibles", methods=["GET"])
def get_all_consumibles():
    try:
        conn = get_connection()
        cur  = conn.cursor()
        cur.execute("SELECT * FROM consumibles ORDER BY consumible_id ASC")
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify([consumible_to_dict(row) for row in rows]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@read_consumible_bp.route("/consumibles/<int:consumible_id>", methods=["GET"])
def get_consumible(consumible_id):
    try:
        conn = get_connection()
        cur  = conn.cursor()
        cur.execute("SELECT * FROM consumibles WHERE consumible_id = %s", (consumible_id,))
        row = cur.fetchone()
        cur.close()
        conn.close()

        if row is None:
            return jsonify({"error": f"Consumible con ID {consumible_id} no encontrado"}), 404

        return jsonify(consumible_to_dict(row)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
