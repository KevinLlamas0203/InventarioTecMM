from flask import Blueprint, request, jsonify
import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

update_usr_bp = Blueprint('update_usuario', __name__)

DATABASE_URL = os.getenv("DATABASE_URL")


def get_db_connection():
    return psycopg2.connect(DATABASE_URL)


# ── PUT /api/usuarios/<id> ────────────────────────────────────────────────────
@update_usr_bp.route('/api/usuarios/<int:id_usuario>', methods=['PUT'])
def update_usuario(id_usuario):
    """
    Actualiza los datos de un usuario y/o sus credenciales.
    Solo se actualizan los campos que se envíen en el body (actualización parcial).

    Body JSON (todos opcionales, al menos uno requerido):
    {
        "nombre":             "María",
        "apellido_paterno":   "González",
        "apellido_materno":   "Ríos",
        "numero_telefonico":  3121234567,
        "direccion":          "Calle 5, Col. Centro",
        "correo_electronico": "nuevo@dominio.com",
        "nivel_acceso":       2,
        "email_credencial":   "nuevo_acceso@sistema.mx",
        "password":           "nueva_clave_456"
    }
    """
    data = request.get_json()

    if not data:
        return jsonify({'success': False, 'message': 'No se recibieron datos.'}), 400

    # ── Separar campos de usuarios y de credenciales ──────────────────────────
    campos_usuario = {
        'nombre':             data.get('nombre'),
        'apellido_paterno':   data.get('apellido_paterno'),
        'apellido_materno':   data.get('apellido_materno'),
        'numero_telefonico':  data.get('numero_telefonico'),
        'direccion':          data.get('direccion'),
        'correo_electronico': data.get('correo_electronico'),
        'nivel_acceso':       data.get('nivel_acceso'),
    }
    campos_credencial = {
        'email':   data.get('email_credencial'),
        'pasword': data.get('password'),
    }

    # Filtrar solo los que vienen en el body (no None)
    upd_usuario    = {k: v for k, v in campos_usuario.items()    if v is not None}
    upd_credencial = {k: v for k, v in campos_credencial.items() if v is not None}

    if not upd_usuario and not upd_credencial:
        return jsonify({
            'success': False,
            'message': 'Debes enviar al menos un campo para actualizar.'
        }), 400

    # ── Validaciones de negocio ───────────────────────────────────────────────
    if 'nivel_acceso' in upd_usuario and upd_usuario['nivel_acceso'] not in (1, 2, 3):
        return jsonify({'success': False, 'message': 'nivel_acceso debe ser 1, 2 o 3.'}), 400

    if 'pasword' in upd_credencial and len(str(upd_credencial['pasword'])) < 8:
        return jsonify({'success': False, 'message': 'La contraseña debe tener al menos 8 caracteres.'}), 400

    # Truncar strings según longitud de columna
    truncados = {
        'nombre':             40,
        'apellido_paterno':   40,
        'apellido_materno':   40,
        'direccion':          100,
        'correo_electronico': 150,
    }
    for campo, maxlen in truncados.items():
        if campo in upd_usuario and isinstance(upd_usuario[campo], str):
            upd_usuario[campo] = upd_usuario[campo].strip()[:maxlen]

    if 'email' in upd_credencial and isinstance(upd_credencial['email'], str):
        upd_credencial['email'] = upd_credencial['email'].strip()[:100]

    try:
        conn = get_db_connection()
        cur  = conn.cursor()

        # ── Verificar que el usuario existe ──────────────────────────────────
        cur.execute(
            "SELECT id_usuario FROM usuarios WHERE id_usuario = %s",
            (id_usuario,)
        )
        if not cur.fetchone():
            cur.close()
            conn.close()
            return jsonify({
                'success': False,
                'message': f'No se encontró el usuario con ID #{id_usuario}.'
            }), 404

        # ── Verificar duplicados antes de actualizar ──────────────────────────
        if 'correo_electronico' in upd_usuario:
            cur.execute(
                "SELECT id_usuario FROM usuarios WHERE correo_electronico = %s AND id_usuario <> %s",
                (upd_usuario['correo_electronico'], id_usuario)
            )
            if cur.fetchone():
                cur.close()
                conn.close()
                return jsonify({
                    'success': False,
                    'message': 'Ese correo electrónico ya pertenece a otro usuario.'
                }), 409

        if 'email' in upd_credencial:
            cur.execute(
                """
                SELECT c.id_credencial FROM credenciales c
                WHERE c.email = %s AND c.fk_id_usuario <> %s
                """,
                (upd_credencial['email'], id_usuario)
            )
            if cur.fetchone():
                cur.close()
                conn.close()
                return jsonify({
                    'success': False,
                    'message': 'Ese email de credencial ya está en uso por otro usuario.'
                }), 409

        # ── UPDATE tabla usuarios ─────────────────────────────────────────────
        if upd_usuario:
            set_parts  = [f"{col} = %s" for col in upd_usuario.keys()]
            set_clause = ", ".join(set_parts)
            values     = list(upd_usuario.values()) + [id_usuario]

            cur.execute(
                f"UPDATE usuarios SET {set_clause} WHERE id_usuario = %s",
                values
            )

        # ── UPDATE tabla credenciales ─────────────────────────────────────────
        if upd_credencial:
            set_parts  = [f"{col} = %s" for col in upd_credencial.keys()]
            set_clause = ", ".join(set_parts)
            values     = list(upd_credencial.values()) + [id_usuario]

            cur.execute(
                f"UPDATE credenciales SET {set_clause} WHERE fk_id_usuario = %s",
                values
            )

        conn.commit()

        # ── Retornar datos actualizados ───────────────────────────────────────
        cur.execute(
            """
            SELECT
                u.id_usuario, u.nombre, u.apellido_paterno, u.apellido_materno,
                u.numero_telefonico, u.dirrecion, u.correo_electronico, u.nivel_acceso,
                c.id_credencial, c.email
            FROM usuarios u
            LEFT JOIN credenciales c ON c.fk_id_usuario = u.id_usuario
            WHERE u.id_usuario = %s
            """,
            (id_usuario,)
        )
        row = cur.fetchone()

        cur.close()
        conn.close()

        (id_u, nombre, ap, am, tel, dir_, correo, nivel,
         id_cred, email_cred) = row

        return jsonify({
            'success': True,
            'message': f'Usuario #{id_usuario} actualizado correctamente.',
            'usuario': {
                'id_usuario':         id_u,
                'nombre':             nombre,
                'apellido_paterno':   ap,
                'apellido_materno':   am,
                'numero_telefonico':  tel,
                'direccion':          dir_,
                'correo_electronico': correo,
                'nivel_acceso':       nivel,
                'credencial': {
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