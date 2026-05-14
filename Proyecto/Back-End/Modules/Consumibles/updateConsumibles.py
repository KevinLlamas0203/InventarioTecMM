from flask import Blueprint, request, jsonify
import psycopg2
import os

update_consumible_bp = Blueprint("update_consumible_bp", __name__)

def get_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

@update_consumible_bp.route("/consumibles/<int:id>", methods=["PUT"])
def update_consumible(id):
    data = request.get_json()

    nombre         = (data.get("nombre") or "").strip()
    descripcion    = data.get("descripcion")
    categoria      = (data.get("categoria") or "").strip()
    stock_actual   = data.get("stock_actual", 0)
    stock_minimo   = data.get("stock_minimo", 10)
    ubicacion      = data.get("ubicacion")
    fecha_registro = data.get("fecha_registro")

    if not nombre or not categoria:
        return jsonify({"error": "nombre y categoria son obligatorios"}), 400

    try:
        conn = get_connection()
        cur  = conn.cursor()
        cur.execute("""
            UPDATE consumibles SET
                nombre=%s, descripcion=%s, categoria=%s,
                stock_actual=%s, stock_minimo=%s,
                ubicacion=%s, fecha_registro=%s
            WHERE consumible_id=%s
        """, (nombre, descripcion, categoria,
              stock_actual, stock_minimo, ubicacion, fecha_registro, id))
        if cur.rowcount == 0:
            return jsonify({"error": "No encontrado"}), 404
        conn.commit()
        cur.close(); conn.close()
        return jsonify({"mensaje": "Consumible actualizado"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@update_consumible_bp.route("/consumibles/<int:id>/stock", methods=["PATCH"])
def update_stock(id):
    data      = request.get_json()
    cantidad  = data.get("cantidad", 0)
    operacion = data.get("operacion", "sumar")  # "sumar" o "restar"

    if not isinstance(cantidad, int) or cantidad < 1:
        return jsonify({"error": "cantidad debe ser un entero positivo"}), 400

    try:
        conn = get_connection()
        cur  = conn.cursor()
        if operacion == "restar":
            cur.execute("""
                UPDATE consumibles
                SET stock_actual = GREATEST(0, stock_actual - %s)
                WHERE consumible_id = %s
                RETURNING stock_actual
            """, (cantidad, id))
        else:
            cur.execute("""
                UPDATE consumibles
                SET stock_actual = stock_actual + %s
                WHERE consumible_id = %s
                RETURNING stock_actual
            """, (cantidad, id))

        row = cur.fetchone()
        if not row:
            return jsonify({"error": "No encontrado"}), 404
        conn.commit()
        cur.close(); conn.close()
        return jsonify({"stock_actual": row[0]}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500