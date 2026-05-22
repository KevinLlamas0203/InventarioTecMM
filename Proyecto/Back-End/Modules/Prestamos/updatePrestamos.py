import psycopg2
from psycopg2.extras import RealDictCursor
import json, os
from flask import Blueprint, request, jsonify
from datetime import datetime

update_prestamo_bp = Blueprint('update_prestamo', __name__)

ESTADOS_VALIDOS = ['Pendiente', 'Activo', 'Devuelto', 'Cancelado', 'Vencido']

def get_connection():
    return psycopg2.connect(os.environ['DATABASE_URL'], sslmode='require')

# ── Editar datos del préstamo ───────────────────────────────────
@update_prestamo_bp.route('/prestamos/<int:prestamo_id>', methods=['PUT'])
def editar_prestamo(prestamo_id):
    data = request.get_json()
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT estado FROM prestamos WHERE id = %s", (prestamo_id,))
            row = cur.fetchone()
            if not row:
                return jsonify({'error': 'Préstamo no encontrado'}), 404

            # Solo se puede editar si está Pendiente o Activo
            if row['estado'] not in ['Pendiente', 'Activo']:
                return jsonify({'error': 'Solo se pueden editar préstamos Pendientes o Activos'}), 400

            inicio = datetime.fromisoformat(data['inicio'])
            fin    = datetime.fromisoformat(data['fin'])
            if fin <= inicio:
                return jsonify({'error': 'La devolución debe ser posterior al inicio'}), 400

            cur.execute("""
                UPDATE prestamos SET
                  solicitante = %s, alumnos = %s, docente = %s,
                  lab = %s, inicio = %s, fin = %s,
                  items = %s, notas = %s
                WHERE id = %s
                RETURNING *
            """, (
                data['solicitante'].strip(),
                int(data['alumnos']),
                data['docente'].strip(),
                data['lab'],
                inicio, fin,
                json.dumps(data['items']),
                data.get('notas', '').strip(),
                prestamo_id
            ))

            actualizado = dict(cur.fetchone())
            conn.commit()
            return jsonify({
                'message': 'Préstamo actualizado',
                'prestamo': actualizado
            }), 200

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

# ── Cambiar solo el estado ──────────────────────────────────────
@update_prestamo_bp.route('/prestamos/<int:prestamo_id>/estado', methods=['PATCH'])
def cambiar_estado(prestamo_id):
    data        = request.get_json()
    nuevo_estado = data.get('estado')

    if nuevo_estado not in ESTADOS_VALIDOS:
        return jsonify({'error': 'Estado no válido'}), 400

    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "UPDATE prestamos SET estado = %s WHERE id = %s RETURNING folio, estado",
                (nuevo_estado, prestamo_id)
            )
            if cur.rowcount == 0:
                return jsonify({'error': 'Préstamo no encontrado'}), 404
            resultado = dict(cur.fetchone())
            conn.commit()
            return jsonify({
                'message': f"Estado actualizado a {nuevo_estado}",
                'prestamo': resultado
            }), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()