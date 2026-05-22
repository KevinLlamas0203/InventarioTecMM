from flask import Blueprint, jsonify
import psycopg2, os
from datetime import datetime, date
from dateutil.relativedelta import relativedelta

read_reporte_bp = Blueprint("read_reporte_bp", __name__)

def get_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

@read_reporte_bp.route("/reportes/stats", methods=["GET"])
def get_stats():
    try:
        conn = get_connection()
        cur  = conn.cursor()

        # Inicio del mes actual
        inicio_mes = date.today().replace(day=1)
        # Inicio del mes pasado
        inicio_mes_pasado = (inicio_mes - relativedelta(months=1))
        fin_mes_pasado    = inicio_mes

        # Reportes este mes
        cur.execute("SELECT COUNT(*) FROM reportes WHERE fecha >= %s", (inicio_mes,))
        reportes_mes = cur.fetchone()[0]

        # Reportes mes pasado (para calcular diferencia)
        cur.execute("""
            SELECT COUNT(*) FROM reportes
            WHERE fecha >= %s AND fecha < %s
        """, (inicio_mes_pasado, fin_mes_pasado))
        reportes_mes_pasado = cur.fetchone()[0]

        # Total activos
        cur.execute("SELECT COUNT(*) FROM activos")
        total_activos = cur.fetchone()[0]

        # Total consumibles con stock bajo (≤10)
        cur.execute("SELECT COUNT(*) FROM consumibles WHERE stock_actual <= 10")
        alertas_stock = cur.fetchone()[0]

        cur.close()
        conn.close()

        diferencia = reportes_mes - reportes_mes_pasado

        return jsonify({
            "reportes_mes":        reportes_mes,
            "reportes_mes_pasado": reportes_mes_pasado,
            "diferencia_mes":      diferencia,
            "total_activos":       total_activos,
            "alertas_stock":       alertas_stock,
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500