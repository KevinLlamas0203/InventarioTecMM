from flask import Blueprint, request, jsonify
import psycopg2
import os

update_consumible_bp = Blueprint("update_consumible_bp", __name__)

def get_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

@update_consumible_bp.route("/consumibles/<int:consumible_id>", methods=["PUT"])
def update_consumible(consumible_id):
    data = request.get_json()

    nombre          = data.get("nombre")
    descripcion     = data.get("descripcion")
    categoria       = data.get("categoria")
    unidad          = data.get("unidad")
    stock_actual    = data.get("stock_actual")
    stock_minimo    = data.get("stock_minimo")
    precio_unitario = data.get("precio_unitario")
    ubicacion       = data.get("ubicacion")
    fecha_registro  = data.get("fecha_registro")

    if not all([nombre, categoria, unidad]):
        return jsonify({"error": "Los campos nombre, categoria y unidad son obligatorios"}), 400

    try:
        conn = get_connection()
        cur  = conn.cursor()

        cur.execute("""
            UPDATE consumibles SET
                nombre          = %s,
                descripcion     = %s,
                categoria       = %s,
                unidad          = %s,
                stock_actual    = %s,
                stock_minimo    = %s,
                precio_unitario = %s,
                ubicacion       = %s,
                fecha_registro  = %s
            WHERE consumible_id = %s
        """, (nombre, descripcion, categoria, unidad, stock_actual, stock_minimo,
              precio_unitario, ubicacion, fecha_registro, consumible_id))

        if cur.rowcount == 0:
            conn.close()
            return jsonify({"error": f"Consumible con ID {consumible_id} no encontrado"}), 404

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"mensaje": f"Consumible {consumible_id} actualizado exitosamente"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@update_consumible_bp.route("/consumibles/<int:consumible_id>/stock", methods=["PATCH"])
def update_stock(consumible_id):
    """Endpoint exclusivo para añadir/restar stock sin tocar los demás campos."""
    data       = request.get_json()
    cantidad   = data.get("cantidad")   # positivo = añadir, negativo = restar
    operacion  = data.get("operacion", "sumar")  # "sumar" | "restar" | "set"

    if cantidad is None:
        return jsonify({"error": "El campo cantidad es obligatorio"}), 400

    try:
        conn = get_connection()
        cur  = conn.cursor()

        if operacion == "set":
            cur.execute(
                "UPDATE consumibles SET stock_actual = %s WHERE consumible_id = %s RETURNING stock_actual",
                (cantidad, consumible_id)
            )
        elif operacion == "restar":
            cur.execute(
                "UPDATE consumibles SET stock_actual = GREATEST(0, stock_actual - %s) WHERE consumible_id = %s RETURNING stock_actual",
                (cantidad, consumible_id)
            )
        else:  # sumar (default)
            cur.execute(
                "UPDATE consumibles SET stock_actual = stock_actual + %s WHERE consumible_id = %s RETURNING stock_actual",
                (cantidad, consumible_id)
            )

        row = cur.fetchone()
        if row is None:
            conn.close()
            return jsonify({"error": f"Consumible con ID {consumible_id} no encontrado"}), 404

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "mensaje": "Stock actualizado exitosamente",
            "stock_actual": row[0]
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
