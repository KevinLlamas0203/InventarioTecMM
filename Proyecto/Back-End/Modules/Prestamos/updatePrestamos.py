from flask import Blueprint, request, jsonify
import psycopg2
import psycopg2.extras
import os
import json

update_prestamo_bp = Blueprint('update_prestamo', __name__)

def get_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

@update_prestamo_bp.route("/prestamos/<int:id_prestamo>", methods=["PUT"])
def update_prestamo(id_prestamo):
    data = request.get_json()

    try:
        conn = get_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        campos  = []
        valores = []

        for campo in ["solicitante", "alumnos", "docente", "lab", "inicio", "fin", "notas", "estado"]:
            if campo in data:
                campos.append(f"{campo} = %s")
                valores.append(data[campo])

        if "items" in data:
            campos.append("items = %s")
            valores.append(json.dumps(data["items"]))

        if not campos:
            return jsonify({"success": False, "message": "No hay campos para actualizar"}), 400

        valores.append(id_prestamo)
        cur.execute(f"""
            UPDATE prestamos SET {', '.join(campos)}
            WHERE id = %s
        """, valores)

        conn.commit()

        # Devolver registro actualizado
        cur.execute("SELECT * FROM prestamos WHERE id = %s", (id_prestamo,))
        row = cur.fetchone()
        cur.close()
        conn.close()

        if not row:
            return jsonify({"success": False, "message": "Préstamo no encontrado"}), 404

        p = dict(row)
        for campo in ["inicio", "fin", "creado_en"]:
            if p.get(campo):
                p[campo] = p[campo].isoformat()

        return jsonify({
            "success":  True,
            "message":  "Préstamo actualizado correctamente",
            "prestamo": p
        }), 200

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500