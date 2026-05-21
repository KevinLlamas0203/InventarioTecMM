from flask import Blueprint, request, jsonify
import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

create_usr_bp = Blueprint('create_usuario', __name__)

DATABASE_URL = os.getenv("DATABASE_URL")


def get_db_connection():
    return psycopg2.connect(DATABASE_URL)


# ── POST /api/usuarios ────────────────────────────────────────────────────────
@create_usr_bp.route('/api/usuarios', methods=['POST'])
def create_usuario():
    """
    Registra un nuevo usuario y sus credenciales de acceso en una sola transacción.

    Body JSON esperado:
    {
        "nombre":            "María",
        "apellido_paterno":  "González",
        "apellido_materno":  "Ríos",          (opcional)
        "numero_telefonico": 3121234567,
        "direccion":         "Calle 5, Col. Centro",  (opcional)
        "correo_electronico":"maria@dominio.com",      ← se usa en usuarios Y credenciales
        "nivel_acceso":      1,                (1=Básico, 2=Operador, 3=Admin)
        "password":          "contraseña123"
    }
    """
    data = request.get_json()

    if not data:
        return jsonify({'success': False, 'message': 'No se recibieron datos.'}), 400

    # ── Campos obligatorios ───────────────────────────────────────────────────
    campos_req = ['nombre', 'apellido_paterno', 'numero_telefonico',
                  'correo_electronico', 'nivel_acceso', 'password']

    for campo in campos_req:
        if not data.get(campo) and data.get(campo) != 0:
            return jsonify({
                'success': False,
                'message': f'El campo "{campo}" es obligatorio.'
            }), 400

    nombre            = str(data['nombre']).strip()[:40]
    apellido_paterno  = str(data['apellido_paterno']).strip()[:40]
    apellido_materno  = str(data.get('apellido_materno', '') or '').strip()[:40] or None
    numero_telefonico = data['numero_telefonico']
    direccion         = str(data.get('direccion', '') or '').strip()[:100] or None
    correo_electronico= str(data['correo_electronico']).strip()[:150]
    nivel_acceso      = int(data['nivel_acceso'])
    # El mismo correo se usa como email de acceso en credenciales
    email_credencial  = correo_electronico
    password          = str(data['password'])

    if nivel_acceso not in (1, 2, 3):
        return jsonify({'success': False, 'message': 'nivel_acceso debe ser 1, 2 o 3.'}), 400

    if len(password) < 8:
        return jsonify({'success': False, 'message': 'La contraseña debe tener al menos 8 caracteres.'}), 400

    try:
        conn = get_db_connection()
        cur  = conn.cursor()

        # ── Verificar que el correo electrónico no esté duplicado ────────────
        cur.execute(
            "SELECT id_usuario FROM usuarios WHERE correo_electronico = %s",
            (correo_electronico,)
        )
        if cur.fetchone():
            cur.close()
            conn.close()
            return jsonify({
                'success': False,
                'message': 'Ya existe un usuario con ese correo electrónico.'
            }), 409

        # ── Verificar que el email de credencial no esté duplicado ───────────
        cur.execute(
            "SELECT id_credencial FROM credenciales WHERE email = %s",
            (email_credencial,)
        )
        if cur.fetchone():
            cur.close()
            conn.close()
            return jsonify({
                'success': False,
                'message': 'Ya existe una credencial con ese email de acceso.'
            }), 409

        # ── Insertar usuario ──────────────────────────────────────────────────
        cur.execute(
            """
            INSERT INTO usuarios
                (nombre, apellido_paterno, apellido_materno,
                 numero_telefonico, dirrecion, correo_electronico, nivel_acceso)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id_usuario
            """,
            (nombre, apellido_paterno, apellido_materno,
             numero_telefonico, direccion, correo_electronico, nivel_acceso)
        )
        nuevo_id = cur.fetchone()[0]

        # ── Insertar credenciales ─────────────────────────────────────────────
        cur.execute(
            """
            INSERT INTO credenciales (email, pasword, fk_id_usuario)
            VALUES (%s, %s, %s)
            RETURNING id_credencial
            """,
            (email_credencial, password, nuevo_id)
        )
        nuevo_id_cred = cur.fetchone()[0]

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            'success': True,
            'message': f'Usuario "{nombre} {apellido_paterno}" registrado correctamente.',
            'usuario': {
                'id_usuario':         nuevo_id,
                'nombre':             nombre,
                'apellido_paterno':   apellido_paterno,
                'apellido_materno':   apellido_materno,
                'numero_telefonico':  numero_telefonico,
                'dirreccion':          direccion,
                'correo_electronico': correo_electronico,
                'nivel_acceso':       nivel_acceso,
                'credencial': {
                    'id_credencial': nuevo_id_cred,
                    'email':         email_credencial
                }
            }
        }), 201

    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return jsonify({'success': False, 'message': f'Error de base de datos: {str(e)}'}), 500