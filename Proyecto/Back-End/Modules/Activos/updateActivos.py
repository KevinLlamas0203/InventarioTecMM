# Blueprint registrado en appActivos.py
from flask import Blueprint, request, jsonify
import psycopg2
import os

update_bp = Blueprint("update_bp", __name__)

def get_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

@update_bp.route("/activos/<int:activo_id>", methods=["PUT"])
def update_activo(activo_id):
    data = request.get_json()

    nombre      = data.get("nombre")
    descripcion = data.get("descripcion")
    categoria   = data.get("categoria")
    estado      = data.get("estado")
    ubicacion   = data.get("ubicacion")
    asignado_a  = data.get("asignado_a")
    fecha_alta  = data.get("fecha_alta")   # Formato: YYYY-MM-DD

    if not all([nombre, categoria, estado]):
        return jsonify({"error": "Los campos nombre, categoria y estado son obligatorios"}), 400

    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            UPDATE activos
            SET nombre      = %s,
                descripcion = %s,
                categoria   = %s,
                estado      = %s,
                ubicacion   = %s,
                asignado_a  = %s,
                fecha_alta  = %s
            WHERE activo_id = %s
        """, (nombre, descripcion, categoria, estado, ubicacion, asignado_a, fecha_alta, activo_id))

        if cur.rowcount == 0:
            conn.rollback()
            cur.close()
            conn.close()
            return jsonify({"error": f"Activo con ID {activo_id} no encontrado"}), 404

        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"mensaje": f"Activo {activo_id} actualizado exitosamente"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500