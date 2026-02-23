from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)

# ✅ Permite peticiones desde CUALQUIER origen:
#    - HTML en carpeta /front abierto directamente (file://)
#    - HTML servido desde otro puerto o carpeta distinta
CORS(app, resources={r"/api/*": {"origins": "*"}})

DATABASE_URL = os.getenv("DATABASE_URL")


def get_db_connection():
    """Establece y retorna una conexión a PostgreSQL."""
    conn = psycopg2.connect(DATABASE_URL)
    return conn


@app.route('/api/login', methods=['POST'])
def login():
    """
    Recibe JSON con { email, password },
    compara contra la tabla 'credenciales':
        email    → columna email
        password → columna pasword
    Retorna JSON con { success, message }
    """
    data = request.get_json()

    if not data:
        return jsonify({'success': False, 'message': 'No se recibieron datos.'}), 400

    email    = data.get('email', '').strip()
    password = data.get('password', '').strip()

    # Validación de campos vacíos
    if not email or not password:
        return jsonify({'success': False, 'message': 'Por favor completa todos los campos.'}), 400

    try:
        conn = get_db_connection()
        cur  = conn.cursor()

        # Consulta segura con parámetros (evita SQL Injection)
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