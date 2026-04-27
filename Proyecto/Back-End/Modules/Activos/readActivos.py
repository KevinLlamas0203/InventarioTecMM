# Blueprint registrado en appActivos.py
from flask import Blueprint, jsonify
import psycopg2
import os

read_bp = Blueprint("read_bp", __name__)

def get_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

def activo_to_dict(row):
    return {
        "activo_id":   row[0],
        "nombre":      row[1],
        "descripcion": row[2],
        "categoria":   row[3],
        "estado":      row[4],
        "ubicacion":   row[5],
        "asignado_a":  row[6],
        "fecha_alta":  str(row[7]) if row[7] else None   # Devuelve YYYY-MM-DD
    }

@read_bp.route("/activos", methods=["GET"])
def get_all_activos():
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM activos ORDER BY activo_id ASC")
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify([activo_to_dict(row) for row in rows]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@read_bp.route("/activos/<int:activo_id>", methods=["GET"])
def get_activo(activo_id):
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM activos WHERE activo_id = %s", (activo_id,))
        row = cur.fetchone()
        cur.close()
        conn.close()

        if row is None:
            return jsonify({"error": f"Activo con ID {activo_id} no encontrado"}), 404

        return jsonify(activo_to_dict(row)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500