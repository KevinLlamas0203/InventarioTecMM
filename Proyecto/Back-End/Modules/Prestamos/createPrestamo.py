from flask import Blueprint, request, jsonify
import psycopg2
import psycopg2.extras
import os
import json
from datetime import datetime

create_prestamo_bp = Blueprint('create_prestamo', __name__)

def get_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

def generar_folio(cur):
    cur.execute("SELECT folio FROM prestamos ORDER BY id DESC LIMIT 1")
    row = cur.fetchone()
    if row:
        try:
            num = int(row[0].replace('P-', '')) + 1
        except:
            num = 1
    else:
        num = 1
    return f"P-{str(num).zfill(3)}"

@create_prestamo_bp.route("/prestamos", methods=["POST"])
def create_prestamo():
    data = request.get_json()

    solicitante = data.get("solicitante", "").strip()
    alumnos     = data.get("alumnos")
    docente     = data.get("docente", "").strip()
    lab         = data.get("lab", "").strip()
    inicio      = data.get("inicio")
    fin         = data.get("fin")
    items       = data.get("items", [])
    notas       = data.get("notas", "")
    estado      = data.get("estado", "Pendiente")

    if not all([solicitante, alumnos, docente, lab, inicio, fin]):
        return jsonify({"success": False, "message": "Faltan campos obligatorios"}), 400

    if not items:
        return jsonify({"success": False, "message": "Agrega al menos un artículo"}), 400

    try:
        conn = get_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        folio = generar_folio(cur)

        cur.execute("""
            INSERT INTO prestamos
                (folio, solicitante, alumnos, docente, lab, inicio, fin, items, notas, estado, creado_en)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            RETURNING id
        """, (
            folio, solicitante, int(alumnos), docente, lab,
            inicio, fin,
            json.dumps(items),
            notas, estado
        ))

        nuevo_id = cur.fetchone()["id"]
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": f"Préstamo {folio} registrado correctamente",
            "prestamo": {
                "id": nuevo_id, "folio": folio,
                "solicitante": solicitante, "alumnos": int(alumnos),
                "docente": docente, "lab": lab,
                "inicio": inicio, "fin": fin,
                "items": items, "notas": notas, "estado": estado
            }
        }), 201

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500