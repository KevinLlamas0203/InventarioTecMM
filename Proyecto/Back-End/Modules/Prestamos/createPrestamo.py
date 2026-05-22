from flask import Blueprint, request, jsonify
import psycopg2
import psycopg2.extras
import os
import json
from datetime import datetime
import sys

create_prestamo_bp = Blueprint('create_prestamo', __name__)

def get_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

def generar_folio(cur):
    """Genera un folio único incrementando el número del último folio registrado"""
    try:
        # Obtener el último folio más reciente
        cur.execute("SELECT folio FROM prestamos ORDER BY id DESC LIMIT 1")
        row = cur.fetchone()
        
        if row and row[0]:
            folio = row[0]
            # Extraer el número del folio (ej: "P-001" → 1)
            try:
                num = int(folio.replace('P-', '').replace('p-', ''))
                num += 1
            except (ValueError, AttributeError):
                # Si falla la conversión, buscar el máximo numérico
                cur.execute("""
                    SELECT MAX(CAST(REGEXP_REPLACE(folio, '[^0-9]', '', 'g') AS INTEGER)) 
                    FROM prestamos 
                    WHERE folio ~ '^P-[0-9]+$'
                """)
                max_num = cur.fetchone()[0]
                num = (max_num or 0) + 1
        else:
            num = 1
        
        nuevo_folio = f"P-{str(num).zfill(3)}"
        print(f"✅ Folio generado: {nuevo_folio}")
        return nuevo_folio
    except Exception as e:
        print(f"⚠️  Error generando folio, usando default: {e}")
        import random
        # Fallback: generar folio con timestamp
        return f"P-{random.randint(100, 999)}"

@create_prestamo_bp.route("/prestamos", methods=["POST"])
def create_prestamo():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "message": "No se recibieron datos JSON válidos"}), 400

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
        
        # Validar que alumnos sea número
        try:
            alumnos = int(alumnos)
        except (ValueError, TypeError):
            return jsonify({"success": False, "message": "El campo 'alumnos' debe ser un número"}), 400

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
        print(f"❌ Error al crear préstamo: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": f"Error al guardar: {str(e)}"}), 500