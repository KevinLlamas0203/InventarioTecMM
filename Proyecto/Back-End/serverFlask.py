from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from dotenv import load_dotenv
import sys
import os

load_dotenv()

# Agregar la carpeta Modules/Activos al path para encontrar los blueprints
base_dir = os.path.abspath(os.path.dirname(__file__))
sys.path.append(os.path.join(base_dir, "Modules", "Activos"))

from createActivos import create_bp
from readActivos   import read_bp
from updateActivos import update_bp
from deleteActivos import delete_bp

app = Flask(__name__)
CORS(app)

DATABASE_URL = os.getenv("DATABASE_URL")

# ── Registrar blueprints de Activos ──────────────────────────────────────────
app.register_blueprint(create_bp)
app.register_blueprint(read_bp)
app.register_blueprint(update_bp)
app.register_blueprint(delete_bp)


# ── Conexión a DB ─────────────────────────────────────────────────────────────
def get_db_connection():
    return psycopg2.connect(DATABASE_URL)


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
            "SELECT email FROM credenciales WHERE email = %s AND pasword = %s",
            (email, password)
        )
        user = cur.fetchone()

        cur.close()
        conn.close()

        if user:
            return jsonify({'success': True, 'message': 'Acceso correcto.'})
        else:
            return jsonify({'success': False, 'message': 'Correo electrónico o contraseña incorrectos.'}), 401

    except Exception as e:
        return jsonify({'success': False, 'message': f'Error de conexión: {str(e)}'}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)