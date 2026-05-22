import psycopg2
from psycopg2.extras import RealDictCursor
import os
from flask import Blueprint, jsonify

delete_prestamo_bp = Blueprint('delete_prestamo', __name__)

def get_connection():
    return psycopg2.connect(os.environ['DATABASE_URL'], sslmode='require')

@delete_prestamo_bp.route('/prestamos/<int:prestamo_id>', methods=['DELETE'])
def eliminar_prestamo(prestamo_id):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Guardar datos antes de borrar para el mensaje de confirmación
            cur.execute(
                "SELECT folio, solicitante FROM prestamos WHERE id = %s",
                (prestamo_id,)
            )
            prestamo = cur.fetchone()
            if not prestamo:
                return jsonify({'error': 'Préstamo no encontrado'}), 404

            cur.execute("DELETE FROM prestamos WHERE id = %s", (prestamo_id,))
            conn.commit()

            return jsonify({
                'message': f"Préstamo {prestamo['folio']} eliminado correctamente",
                'eliminado': {
                    'folio': prestamo['folio'],
                    'solicitante': prestamo['solicitante']
                }
            }), 200

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()