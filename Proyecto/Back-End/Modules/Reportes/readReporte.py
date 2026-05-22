from flask import Blueprint, jsonify
import psycopg2, os
from datetime import date
from dateutil.relativedelta import relativedelta

read_reporte_bp = Blueprint("read_reporte_bp", __name__)

def get_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

# ─── Listar préstamos ───────────────────────────────
@read_reporte_bp.route("/reportes", methods=["GET"])
def get_prestamos():
    try:
        conn = get_connection()
        cur  = conn.cursor()

        cur.execute("""
            SELECT id, folio, solicitante, alumnos, docente, lab,
                   inicio, fin, items, notas, estado
            FROM prestamos
            ORDER BY inicio DESC
        """)
        rows = cur.fetchall()
        cols = [desc[0] for desc in cur.description]

        cur.close()
        conn.close()

        prestamos = [dict(zip(cols, row)) for row in rows]

        return jsonify({
            "success": True,
            "prestamos": prestamos
        }), 200

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

# ─── Estadísticas de préstamos ──────────────────────
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

        # Préstamos este mes
        cur.execute("SELECT COUNT(*) FROM prestamos WHERE inicio >= %s", (inicio_mes,))
        prestamos_mes = cur.fetchone()[0]

        # Préstamos mes pasado
        cur.execute("""
            SELECT COUNT(*) FROM prestamos
            WHERE inicio >= %s AND inicio < %s
        """, (inicio_mes_pasado, fin_mes_pasado))
        prestamos_mes_pasado = cur.fetchone()[0]

        # Totales por estado
        cur.execute("SELECT COUNT(*) FROM prestamos WHERE estado = 'Pendiente'")
        pendientes = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM prestamos WHERE estado = 'Activo'")
        activos = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM prestamos WHERE estado = 'Devuelto'")
        devueltos = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM prestamos WHERE estado = 'Vencido'")
        vencidos = cur.fetchone()[0]

        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "total": prestamos_mes,
            "pendiente": pendientes,
            "activo": activos,
            "devuelto": devueltos,
            "vencido": vencidos,
            "mes_pasado": prestamos_mes_pasado
        }), 200

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
