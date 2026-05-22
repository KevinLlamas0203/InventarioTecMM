# Proyecto/Back-End/Modules/Reportes/readReporte.py
from flask import Blueprint, jsonify
import psycopg2, os

read_reporte_bp = Blueprint("read_reporte_bp", __name__)

def get_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

@read_reporte_bp.route("/api/reportes/estadisticas", methods=["GET"])
def estadisticas_reportes():
    try:
        conn = get_connection()
        cur = conn.cursor()

        # Reportes este mes
        cur.execute("""
            SELECT COUNT(*) 
            FROM reportes 
            WHERE EXTRACT(MONTH FROM fecha) = EXTRACT(MONTH FROM CURRENT_DATE)
              AND EXTRACT(YEAR FROM fecha) = EXTRACT(YEAR FROM CURRENT_DATE);
        """)
        total_mes = cur.fetchone()[0]

        # Completados
        cur.execute("SELECT COUNT(*) FROM reportes WHERE estado = 'completado';")
        completados = cur.fetchone()[0]

        # En procesamiento
        cur.execute("SELECT COUNT(*) FROM reportes WHERE estado = 'procesando';")
        en_proceso = cur.fetchone()[0]

        porcentaje_exito = (completados / total_mes * 100) if total_mes > 0 else 0

        cur.close()
        conn.close()

        return jsonify({
            "reportes_mes": total_mes,
            "completados": completados,
            "porcentaje_exito": round(porcentaje_exito, 1),
            "en_proceso": en_proceso,
            "tiempo_promedio": "3 seg"  # puedes calcularlo con AVG si tienes tiempos
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
