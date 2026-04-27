from flask import Blueprint, request, jsonify
import psycopg2
import os

create_consumible_bp = Blueprint("create_consumible_bp", __name__)

def get_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

@create_consumible_bp.route("/consumibles", methods=["POST"])
def create_consumible():
    data = request.get_json()

    nombre          = data.get("nombre")
    descripcion     = data.get("descripcion")
    categoria       = data.get("categoria")
    unidad          = data.get("unidad")
    stock_actual    = data.get("stock_actual", 0)
    stock_minimo    = data.get("stock_minimo", 10)
    precio_unitario = data.get("precio_unitario")
    ubicacion       = data.get("ubicacion")
    fecha_registro  = data.get("fecha_registro")

    if not all([nombre, categoria, unidad]):
        return jsonify({"error": "Los campos nombre, categoria y unidad son obligatorios"}), 400

    try:
        conn = get_connection()
        cur  = conn.cursor()

        cur.execute("""
            INSERT INTO consumibles
                (nombre, descripcion, categoria, unidad, stock_actual, stock_minimo, precio_unitario, ubicacion, fecha_registro)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING consumible_id
        """, (nombre, descripcion, categoria, unidad, stock_actual, stock_minimo, precio_unitario, ubicacion, fecha_registro))

        nuevo_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "mensaje": "Consumible creado exitosamente",
            "consumible_id": nuevo_id
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500