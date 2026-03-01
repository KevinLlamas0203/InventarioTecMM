# Blueprint registrado en appActivos.py
from flask import Blueprint, request, jsonify
import psycopg2
import os

create_bp = Blueprint("create_bp", __name__)

def get_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

@create_bp.route("/activos", methods=["POST"])
def create_activo():
    data = request.get_json()

    nombre      = data.get("nombre")
    descripcion = data.get("descripcion")
    categoria   = data.get("categoria")
    estado      = data.get("estado")
    ubicacion   = data.get("ubicacion")
    asignado_a  = data.get("asignado_a")   # Puede ser None
    fecha_alta  = data.get("fecha_alta")   # Formato: YYYY-MM-DD

    if not all([nombre, categoria, estado]):
        return jsonify({"error": "Los campos nombre, categoria y estado son obligatorios"}), 400

    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            INSERT INTO activos (nombre, descripcion, categoria, estado, ubicacion, asignado_a, fecha_alta)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING activo_id
        """, (nombre, descripcion, categoria, estado, ubicacion, asignado_a, fecha_alta))

        nuevo_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "mensaje": "Activo creado exitosamente",
            "activo_id": nuevo_id
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500