from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from dotenv import load_dotenv
import sys
import os

load_dotenv()

# ── Paths ─────────────────────────────────────────────────────────────────────
base_dir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(base_dir, '.env'))

# Agregar la carpeta Modules al path para encontrar los blueprints
sys.path.append(os.path.join(base_dir, "Modules"))
sys.path.append(os.path.join(base_dir, "Modules", "Activos"))
sys.path.append(os.path.join(base_dir, "Modules", "Consumibles"))

from Activos.createActivos import create_bp
from Activos.readActivos   import read_bp
from Activos.updateActivos import update_bp
from Activos.deleteActivos import delete_bp

from Movimientos.createMovimientos import create_bp as create_movimientos_bp
from Movimientos.readMovimientos import read_bp as read_movimientos_bp

from Asignaciones.asignaciones import asignaciones_bp

from Consumibles.createConsumibles import create_consumible_bp
from Consumibles.readConsumibles import read_consumible_bp
from Consumibles.updateConsumibles import update_consumible_bp
from Consumibles.deleteConsumibles import delete_consumible_bp

from Reportes.createReporte import create_reporte_bp
from Reportes.readReporte import read_reporte_bp


from Historial.createHistorial import create_historial_bp
from Historial.readHistorial import read_historial_bp

# ── App ───────────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)

DATABASE_URL = os.getenv("DATABASE_URL")

# ── Registrar blueprints ──────────────────────────────────────────────────────
app.register_blueprint(create_bp)
app.register_blueprint(read_bp)
app.register_blueprint(update_bp)
app.register_blueprint(delete_bp)
app.register_blueprint(create_movimientos_bp)
app.register_blueprint(read_movimientos_bp)
app.register_blueprint(asignaciones_bp)

app.register_blueprint(create_consumible_bp)
app.register_blueprint(read_consumible_bp)
app.register_blueprint(update_consumible_bp)
app.register_blueprint(delete_consumible_bp)

app.register_blueprint(create_reporte_bp)
app.register_blueprint(read_reporte_bp)

app.register_blueprint(create_historial_bp)
app.register_blueprint(read_historial_bp)

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
                    'email': correo,
                    'nivel': nivel_acceso
                }
            })
        else:
            return jsonify({'success': False, 'message': 'Correo electrónico o contraseña incorrectos.'}), 401

    except Exception as e:
        return jsonify({'success': False, 'message': f'Error de conexión: {str(e)}'}), 500



if __name__ == '__main__':
    app.run(debug=True, port=5000)