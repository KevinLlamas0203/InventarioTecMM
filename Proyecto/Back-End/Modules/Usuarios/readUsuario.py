from flask import Blueprint, request, jsonify
import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

read_usr_bp = Blueprint('read_usuario', __name__)

DATABASE_URL = os.getenv("DATABASE_URL")


def get_db_connection():
    return psycopg2.connect(DATABASE_URL)


# ── GET /api/usuarios ─────────────────────────────────────────────────────────
@read_usr_bp.route('/api/usuarios', methods=['GET'])
def get_usuarios():
    """
    Retorna la lista completa de usuarios con sus credenciales.

    Query params opcionales:
      - nivel   : filtra por nivel_acceso (1, 2 o 3)
      - buscar  : filtra por nombre, apellido o correo (búsqueda parcial, insensible a mayúsculas)
      - orden   : campo de ordenamiento → 'id' | 'nombre' | 'nivel'  (default: 'id')
    """
    nivel   = request.args.get('nivel',  '').strip()
    buscar  = request.args.get('buscar', '').strip()
    orden   = request.args.get('orden',  'id').strip()

    # Columna de orden permitida (evitar SQL injection)
    orden_map = {
        'id':     'u.id_usuario',
        'nombre': 'u.nombre',
        'nivel':  'u.nivel_acceso'
    }
    order_col = orden_map.get(orden, 'u.id_usuario')

    try:
        conn = get_db_connection()
        cur  = conn.cursor()

        sql = """
            SELECT
                u.id_usuario,
                u.nombre,
                u.apellido_paterno,
                u.apellido_materno,
                u.numero_telefonico,
                u.direccion,
                u.correo_electronico,
                u.nivel_acceso,
                c.id_credencial,
                c.email AS email_credencial
            FROM usuarios u
            LEFT JOIN credenciales c ON c.fk_id_usuario = u.id_usuario
            WHERE 1=1
        """
        params = []

        if nivel:
            sql += " AND u.nivel_acceso = %s"
            params.append(int(nivel))

        if buscar:
            sql += """
                AND (
                    LOWER(u.nombre)             LIKE %s OR
                    LOWER(u.apellido_paterno)   LIKE %s OR
                    LOWER(u.apellido_materno)   LIKE %s OR
                    LOWER(u.correo_electronico) LIKE %s
                )
            """
            like = f'%{buscar.lower()}%'
            params.extend([like, like, like, like])

        sql += f" ORDER BY {order_col} ASC"

        cur.execute(sql, params)
        rows = cur.fetchall()

        cur.close()
        conn.close()

        usuarios = []
        for row in rows:
            (id_usuario, nombre, apellido_paterno, apellido_materno,
             numero_telefonico, direccion, correo_electronico, nivel_acceso,
             id_credencial, email_credencial) = row

            usuarios.append({
                'id_usuario':         id_usuario,
                'nombre':             nombre,
                'apellido_paterno':   apellido_paterno,
                'apellido_materno':   apellido_materno,
                'numero_telefonico':  numero_telefonico,
                'direccion':          direccion,
                'correo_electronico': correo_electronico,
                'nivel_acceso':       nivel_acceso,
                'credencial': {
                    'id_credencial': id_credencial,
                    'email':         email_credencial
                } if id_credencial else None
            })

        return jsonify({
            'success':  True,
            'total':    len(usuarios),
            'usuarios': usuarios
        }), 200

    except ValueError:
        return jsonify({'success': False, 'message': 'El parámetro "nivel" debe ser un número entero.'}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error de base de datos: {str(e)}'}), 500


# ── GET /api/usuarios/<id> ────────────────────────────────────────────────────
@read_usr_bp.route('/api/usuarios/<int:id_usuario>', methods=['GET'])
def get_usuario_by_id(id_usuario):
    """
    Retorna un usuario específico con sus credenciales por id_usuario.
    """
    try:
        conn = get_db_connection()
        cur  = conn.cursor()

        cur.execute(
            """
            SELECT
                u.id_usuario,
                u.nombre,
                u.apellido_paterno,
                u.apellido_materno,
                u.numero_telefonico,
                u.direccion,
                u.correo_electronico,
                u.nivel_acceso,
                c.id_credencial,
                c.email AS email_credencial
            FROM usuarios u
            LEFT JOIN credenciales c ON c.fk_id_usuario = u.id_usuario
            WHERE u.id_usuario = %s
            """,
            (id_usuario,)
        )
        row = cur.fetchone()

        cur.close()
        conn.close()

        if not row:
            return jsonify({
                'success': False,
                'message': f'No se encontró el usuario con ID #{id_usuario}.'
            }), 404

        (id_u, nombre, apellido_paterno, apellido_materno,
         numero_telefonico, direccion, correo_electronico, nivel_acceso,
         id_credencial, email_credencial) = row

        return jsonify({
            'success': True,
            'usuario': {
                'id_usuario':         id_u,
                'nombre':             nombre,
                'apellido_paterno':   apellido_paterno,
                'apellido_materno':   apellido_materno,
                'numero_telefonico':  numero_telefonico,
                'direccion':          direccion,
                'correo_electronico': correo_electronico,
                'nivel_acceso':       nivel_acceso,
                'credencial': {
                    'id_credencial': id_credencial,
                    'email':         email_credencial
                } if id_credencial else None
            }
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': f'Error de base de datos: {str(e)}'}), 500