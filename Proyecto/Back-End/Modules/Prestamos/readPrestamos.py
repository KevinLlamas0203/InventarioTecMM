import psycopg2
from psycopg2.extras import RealDictCursor
import os
from flask import Blueprint, request, jsonify

read_prestamo_bp = Blueprint('read_prestamo', __name__)

def get_connection():
    return psycopg2.connect(os.environ['DATABASE_URL'], sslmode='require')

# ── Obtener todos (con filtros opcionales) ──────────────────────
@read_prestamo_bp.route('/prestamos', methods=['GET'])
def obtener_prestamos():
    estado  = request.args.get('estado')
    lab     = request.args.get('lab')
    buscar  = request.args.get('buscar', '')

    query  = "SELECT * FROM prestamos WHERE 1=1"
    params = []

    if estado:
        query += " AND estado = %s"
        params.append(estado)

    if lab:
        query += " AND lab = %s"
        params.append(lab)

    if buscar:
        query += " AND (solicitante ILIKE %s OR docente ILIKE %s OR folio ILIKE %s)"
        like = f"%{buscar}%"
        params.extend([like, like, like])

    query += " ORDER BY id DESC"

    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            prestamos = [dict(row) for row in cur.fetchall()]
            return jsonify({
                'total': len(prestamos),
                'prestamos': prestamos
            }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

# ── Obtener uno por ID ──────────────────────────────────────────
@read_prestamo_bp.route('/prestamos/<int:prestamo_id>', methods=['GET'])
def obtener_prestamo(prestamo_id):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM prestamos WHERE id = %s", (prestamo_id,))
            prestamo = cur.fetchone()
            if not prestamo:
                return jsonify({'error': 'Préstamo no encontrado'}), 404
            return jsonify(dict(prestamo)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

# ── Stats (conteo por estado) ───────────────────────────────────
@read_prestamo_bp.route('/prestamos/stats', methods=['GET'])
def stats_prestamos():
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT
                  COUNT(*)                                      AS total,
                  COUNT(*) FILTER (WHERE estado='Pendiente')   AS pendiente,
                  COUNT(*) FILTER (WHERE estado='Activo')      AS activo,
                  COUNT(*) FILTER (WHERE estado='Devuelto')    AS devuelto,
                  COUNT(*) FILTER (WHERE estado='Vencido')     AS vencido
                FROM prestamos
            """)
            return jsonify(dict(cur.fetchone())), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()