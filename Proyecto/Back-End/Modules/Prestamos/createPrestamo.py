import psycopg2
from psycopg2.extras import RealDictCursor
import json, os
from flask import Blueprint, request, jsonify
from datetime import datetime

create_prestamo_bp = Blueprint('create_prestamo', __name__)

def get_connection():
    return psycopg2.connect(os.environ['DATABASE_URL'], sslmode='require')

def generar_folio(cur):
    # Genera el siguiente folio: P-001, P-002, etc.
    cur.execute("SELECT COUNT(*) FROM prestamos")
    total = cur.fetchone()['count']
    return f"P-{total + 1:03d}"

@create_prestamo_bp.route('/prestamos', methods=['POST'])
def crear_prestamo():
    data = request.get_json()

    # Validar campos obligatorios
    required = ['solicitante', 'alumnos', 'docente', 'lab', 'inicio', 'fin', 'items']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'El campo {field} es obligatorio'}), 400

    # Validar que fin > inicio
    inicio = datetime.fromisoformat(data['inicio'])
    fin    = datetime.fromisoformat(data['fin'])
    if fin <= inicio:
        return jsonify({'error': 'La fecha de devolución debe ser posterior al inicio'}), 400

    if not data['items'] or not isinstance(data['items'], list):
        return jsonify({'error': 'Debes incluir al menos un artículo'}), 400

    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            folio = generar_folio(cur)

            cur.execute("""
                INSERT INTO prestamos
                  (folio, solicitante, alumnos, docente, lab,
                   inicio, fin, items, notas, estado)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'Pendiente')
                RETURNING *
            """, (
                folio,
                data['solicitante'].strip(),
                int(data['alumnos']),
                data['docente'].strip(),
                data['lab'],
                inicio,
                fin,
                json.dumps(data['items']),   # JSONB
                data.get('notas', '').strip()
            ))

            nuevo = dict(cur.fetchone())
            conn.commit()
            return jsonify({
                'message': 'Préstamo registrado correctamente',
                'prestamo': nuevo
            }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()