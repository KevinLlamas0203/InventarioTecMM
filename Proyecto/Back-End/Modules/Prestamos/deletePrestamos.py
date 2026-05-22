from flask import Blueprint, jsonify
import psycopg2
import os

delete_prestamo_bp = Blueprint('delete_prestamo', __name__)

def get_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

@delete_prestamo_bp.route("/prestamos/<int:id_prestamo>", methods=["DELETE"])
def delete_prestamo(id_prestamo):
    try:
        conn = get_connection()
        cur  = conn.cursor()

        cur.execute("SELECT folio FROM prestamos WHERE id = %s", (id_prestamo,))
        row = cur.fetchone()

        if not row:
            cur.close()
            conn.close()
            return jsonify({"success": False, "message": "Préstamo no encontrado"}), 404

        folio = row[0]
        cur.execute("DELETE FROM prestamos WHERE id = %s", (id_prestamo,))
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": f"Préstamo {folio} eliminado correctamente"
        }), 200

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500