from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from dotenv import load_dotenv
import sys
import os

load_dotenv()

base_dir = os.path.abspath(os.path.dirname(__file__))

# ── Módulo Activos ────────────────────────────────────────────────────────────
sys.path.append(os.path.join(base_dir, "Modules", "Activos"))

from createActivos import create_bp
from readActivos   import read_bp
from updateActivos import update_bp
from deleteActivos import delete_bp

# ── Módulo Usuarios ───────────────────────────────────────────────────────────
sys.path.append(os.path.join(base_dir, "Modules", "Usuarios"))

from createUsuario import create_usr_bp
from readUsuario   import read_usr_bp
from updateUsuario import update_usr_bp
from deleteUsuario import delete_usr_bp

app = Flask(__name__)
CORS(app)

DATABASE_URL = os.getenv("DATABASE_URL")


# ── Conexión a DB ─────────────────────────────────────────────────────────────
def get_db_connection():
    return psycopg2.connect(DATABASE_URL)


# ── Blueprints: Activos ───────────────────────────────────────────────────────
app.register_blueprint(create_bp)
app.register_blueprint(read_bp)
app.register_blueprint(update_bp)
app.register_blueprint(delete_bp)

# ── Blueprints: Usuarios ──────────────────────────────────────────────────────
app.register_blueprint(create_usr_bp)
app.register_blueprint(read_usr_bp)
app.register_blueprint(update_usr_bp)
app.register_blueprint(delete_usr_bp)


# ── LOGIN ─────────────────────────────────────────────────────────────────────
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()

    if not data:
        return jsonify({'success': False, 'message': 'No se recibieron datos.'}), 400

    email    = data.get('email', '').strip()
    password = data.get('password', '').strip()

    if not email or not password:
        return jsonify({'success': False, 'message': 'Por favor completa todos los campos.'}), 400

    try:
        conn = get_db_connection()
        cur  = conn.cursor()

        cur.execute(
            """
            SELECT u.id_usuario, u.nombre, c.email, u.nivel_acceso
            FROM credenciales c
            JOIN usuarios u ON c.fk_id_usuario = u.id_usuario
            WHERE c.email = %s AND c.pasword = %s
            """,
            (email, password)
        )
        user = cur.fetchone()

        cur.close()
        conn.close()

        if user:
            user_id, nombre, correo, nivel_acceso = user
            return jsonify({
                'success': True,
                'message': 'Acceso correcto.',
                'usuario': {
                    'id':     user_id,
                    'nombre': nombre,
                    'email':  correo,
                    'nivel':  nivel_acceso
                }
            })
        else:
            return jsonify({'success': False, 'message': 'Correo electrónico o contraseña incorrectos.'}), 401

    except Exception as e:
        return jsonify({'success': False, 'message': f'Error de conexión: {str(e)}'}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)