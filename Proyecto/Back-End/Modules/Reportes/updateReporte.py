from flask import Blueprint, request, jsonify
import psycopg2, os

update_reporte_bp = Blueprint("update_reporte_bp", __name__)

def get_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

@update_reporte_bp.route("/reportes/<int:reporte_id>", methods=["PUT"])
def update_reporte(reporte_id):
    data = request.get_json()
    titulo    = data.get("titulo")
    tipo      = data.get("tipo")
    contenido = data.get("contenido")

    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            UPDATE reportes
            SET titulo = COALESCE(%s, titulo),
                tipo = COALESCE(%s, tipo),
                contenido = COALESCE(%s, contenido)
            WHERE reporte_id = %s
        """, (titulo, tipo, contenido, reporte_id))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"mensaje": "Reporte actualizado"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500