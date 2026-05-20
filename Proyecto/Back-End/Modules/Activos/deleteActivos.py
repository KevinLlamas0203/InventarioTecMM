# Blueprint registrado en appActivos.py
from flask import Blueprint, jsonify
import psycopg2
from Activos.db_helpers import get_connection

delete_bp = Blueprint("delete_bp", __name__)

@delete_bp.route("/activos/<int:activo_id>", methods=["DELETE"])
def delete_activo(activo_id):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM movimientos WHERE fk_id_activo = %s", (activo_id,))
                cur.execute("DELETE FROM asignaciones WHERE fk_id_activo = %s", (activo_id,))
                cur.execute("DELETE FROM activos WHERE id_activo = %s", (activo_id,))

                if cur.rowcount == 0:
                    return jsonify({"error": f"Activo con ID {activo_id} no encontrado"}), 404

            conn.commit()
            return jsonify({"mensaje": f"Activo {activo_id} eliminado exitosamente junto con sus movimientos y asignaciones"}), 200

    except psycopg2.errors.ForeignKeyViolation as e:
        return jsonify({"error": "Violación de clave foránea", "detalle": str(e)}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 500