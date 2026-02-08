from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# MODELO - refleja tu tabla credenciales
class Credencial(db.Model):
    __tablename__ = 'credenciales'
    
    id_credenciales = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100), nullable=False)
    pasword = db.Column(db.String(255), nullable=False)  # Nota: mantuve "pasword" como en tu tabla
    id_user = db.Column(db.Integer, nullable=False)

# ENDPOINTS para trabajar con credenciales

# 1. OBTENER TODAS LAS CREDENCIALES (GET)
@app.route('/credenciales', methods=['GET'])
def get_credenciales():
    credenciales = Credencial.query.all()
    return jsonify([{
        'id_credenciales': c.id_credenciales,
        'email': c.email,
        'pasword': c.pasword,
        'id_user': c.id_user
    } for c in credenciales])

# 2. OBTENER UNA CREDENCIAL POR ID (GET)
@app.route('/credenciales/<int:id>', methods=['GET'])
def get_credencial(id):
    credencial = Credencial.query.get_or_404(id)
    return jsonify({
        'id_credenciales': credencial.id_credenciales,
        'email': credencial.email,
        'pasword': credencial.pasword,
        'id_user': credencial.id_user
    })

# 3. OBTENER CREDENCIAL POR EMAIL (GET) - Útil para login
@app.route('/credenciales/email/<string:email>', methods=['GET'])
def get_credencial_by_email(email):
    credencial = Credencial.query.filter_by(email=email).first()
    if credencial:
        return jsonify({
            'id_credenciales': credencial.id_credenciales,
            'email': credencial.email,
            'pasword': credencial.pasword,
            'id_user': credencial.id_user
        })
    return jsonify({'error': 'Credencial no encontrada'}), 404

# 4. CREAR NUEVA CREDENCIAL (POST)
@app.route('/credenciales', methods=['POST'])
def create_credencial():
    data = request.get_json()
    
    # Validar que el email no exista
    existe = Credencial.query.filter_by(email=data['email']).first()
    if existe:
        return jsonify({'error': 'El email ya existe'}), 400
    
    nueva_credencial = Credencial(
        email=data['email'],
        pasword=data['pasword'],
        id_user=data['id_user']
    )
    
    db.session.add(nueva_credencial)
    db.session.commit()
    
    return jsonify({'mensaje': 'Credencial creada exitosamente'}), 201

# 5. ACTUALIZAR CREDENCIAL (PUT)
@app.route('/credenciales/<int:id>', methods=['PUT'])
def update_credencial(id):
    credencial = Credencial.query.get_or_404(id)
    data = request.get_json()
    
    credencial.email = data.get('email', credencial.email)
    credencial.pasword = data.get('pasword', credencial.pasword)
    credencial.id_user = data.get('id_user', credencial.id_user)
    
    db.session.commit()
    
    return jsonify({'mensaje': 'Credencial actualizada exitosamente'})

# 6. ELIMINAR CREDENCIAL (DELETE)
@app.route('/credenciales/<int:id>', methods=['DELETE'])
def delete_credencial(id):
    credencial = Credencial.query.get_or_404(id)
    
    db.session.delete(credencial)
    db.session.commit()
    
    return jsonify({'mensaje': 'Credencial eliminada exitosamente'})

# Rutas de prueba
@app.route('/')
def home():
    return {'mensaje': 'API funcionando correctamente'}

@app.route('/test-db')
def test_db():
    try:
        db.engine.connect()
        return {'mensaje': 'Conexión a la base de datos exitosa'}
    except Exception as e:
        return {'error': str(e)}, 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)