from flask import Blueprint, request, jsonify
import psycopg2
import os

create_reporte_bp = Blueprint("create_reporte_bp", __name__)

def get_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

@create_reporte_bp.route("/reportes", methods=["POST"])
def create_reporte():
    data = request.get_json()

    titulo       = data.get("titulo")
    tipo         = data.get("tipo")         # ej: "mensual", "incidencia"
    contenido    = data.get("contenido")
    generado_por = data.get("generado_por") # usuario o sistema
    fecha        = data.get("fecha")        # YYYY-MM-DD

    if not all([titulo, tipo]):
        return jsonify({"error": "Los campos titulo y tipo son obligatorios"}), 400

    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO reportes (titulo, tipo, contenido, generado_por, fecha)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING reporte_id
        """, (titulo, tipo, contenido, generado_por, fecha))
        nuevo_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"mensaje": "Reporte creado exitosamente", "reporte_id": nuevo_id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500