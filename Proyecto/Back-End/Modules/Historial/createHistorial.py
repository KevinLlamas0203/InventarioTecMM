from flask import Blueprint, request, jsonify
import psycopg2, os

create_historial_bp = Blueprint("create_historial_bp", __name__)

def get_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

@create_historial_bp.route("/historial", methods=["POST"])
def create_historial():
    data = request.get_json()

    accion      = data.get("accion")      # ej: "CREAR", "EDITAR", "ELIMINAR"
    entidad     = data.get("entidad")     # ej: "activo", "reporte"
    entidad_id  = data.get("entidad_id")
    usuario     = data.get("usuario")
    detalle     = data.get("detalle")
    fecha_accion = data.get("fecha_accion")

    if not all([accion, entidad]):
        return jsonify({"error": "Los campos accion y entidad son obligatorios"}), 400

    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO historial (accion, entidad, entidad_id, usuario, detalle, fecha_accion)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING historial_id
        """, (accion, entidad, entidad_id, usuario, detalle, fecha_accion))
        nuevo_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"mensaje": "Registro creado", "historial_id": nuevo_id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500