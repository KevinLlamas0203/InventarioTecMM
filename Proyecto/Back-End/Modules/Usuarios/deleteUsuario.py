from flask import Blueprint, jsonify
import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

delete_usr_bp = Blueprint('delete_usuario', __name__)

DATABASE_URL = os.getenv("DATABASE_URL")


def get_db_connection():
    return psycopg2.connect(DATABASE_URL)


# ── DELETE /api/usuarios/<id> ─────────────────────────────────────────────────
@delete_usr_bp.route('/api/usuarios/<int:id_usuario>', methods=['DELETE'])
def delete_usuario(id_usuario):
    """
    Elimina un usuario y sus credenciales asociadas en una sola transacción.
    Primero elimina la fila de 'credenciales' (FK) y luego la de 'usuarios'.

    Respuesta 200  → eliminación exitosa con resumen del registro eliminado.
    Respuesta 404  → usuario no encontrado.
    Respuesta 500  → error de base de datos.
    """
    try:
        conn = get_db_connection()
        cur  = conn.cursor()

        # ── Verificar que el usuario existe y obtener sus datos ───────────────
        cur.execute(
            """
            SELECT
                u.id_usuario, u.nombre, u.apellido_paterno, u.apellido_materno,
                u.correo_electronico, u.nivel_acceso,
                c.id_credencial, c.email
            FROM usuarios u
            LEFT JOIN credenciales c ON c.fk_id_usuario = u.id_usuario
            WHERE u.id_usuario = %s
            """,
            (id_usuario,)
        )
        row = cur.fetchone()

        if not row:
            cur.close()
            conn.close()
            return jsonify({
                'success': False,
                'message': f'No se encontró el usuario con ID #{id_usuario}.'
            }), 404

        (id_u, nombre, ap, am, correo, nivel,
         id_cred, email_cred) = row

        # ── Eliminar credenciales primero (FK constraint) ─────────────────────
        if id_cred:
            cur.execute(
                "DELETE FROM credenciales WHERE fk_id_usuario = %s",
                (id_usuario,)
            )

        # ── Eliminar usuario ──────────────────────────────────────────────────
        cur.execute(
            "DELETE FROM usuarios WHERE id_usuario = %s",
            (id_usuario,)
        )

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            'success': True,
            'message': f'Usuario "{nombre} {ap}" (ID #{id_u}) eliminado correctamente.',
            'eliminado': {
                'id_usuario':         id_u,
                'nombre':             nombre,
                'apellido_paterno':   ap,
                'apellido_materno':   am,
                'correo_electronico': correo,
                'nivel_acceso':       nivel,
                'credencial_eliminada': {
                    'id_credencial': id_cred,
                    'email':         email_cred
                } if id_cred else None
            }
        }), 200

    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return jsonify({'success': False, 'message': f'Error de base de datos: {str(e)}'}), 500