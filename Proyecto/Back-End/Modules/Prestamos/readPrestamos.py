from flask import Blueprint, request, jsonify
import psycopg2
import psycopg2.extras
import os
import sys

read_prestamo_bp = Blueprint('read_prestamo', __name__)

def get_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

@read_prestamo_bp.route("/prestamos", methods=["GET"])
def get_prestamos():
    estado = request.args.get("estado", "").strip()
    lab    = request.args.get("lab", "").strip()
    buscar = request.args.get("buscar", "").strip()

    try:
        conn = get_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        sql    = "SELECT * FROM prestamos WHERE 1=1"
        params = []

        if estado:
            sql += " AND estado = %s"
            params.append(estado)

        if lab:
            sql += " AND lab = %s"
            params.append(lab)

        if buscar:
            sql += " AND (LOWER(solicitante) LIKE %s OR LOWER(docente) LIKE %s OR LOWER(folio) LIKE %s)"
            like = f"%{buscar.lower()}%"
            params.extend([like, like, like])

        sql += " ORDER BY id DESC"

        cur.execute(sql, params)
        rows = cur.fetchall()
        cur.close()
        conn.close()

        # Convertir a lista de dicts (items ya es jsonb → Python list)
        prestamos = []
        for row in rows:
            p = dict(row)
            # Formatear fechas a string ISO
            for campo in ["inicio", "fin", "creado_en"]:
                if p.get(campo):
                    p[campo] = p[campo].isoformat()
            prestamos.append(p)

        return jsonify({
            "success":   True,
            "total":     len(prestamos),
            "prestamos": prestamos
        }), 200

    except Exception as e:
        print(f"❌ Error al leer préstamos: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500


@read_prestamo_bp.route("/prestamos/stats", methods=["GET"])
def get_stats():
    try:
        conn = get_connection()
        cur  = conn.cursor()
        cur.execute("""
            SELECT
                COUNT(*)                                        AS total,
                COUNT(*) FILTER (WHERE estado = 'Pendiente')   AS pendiente,
                COUNT(*) FILTER (WHERE estado = 'Activo')      AS activo,
                COUNT(*) FILTER (WHERE estado = 'Devuelto')    AS devuelto,
                COUNT(*) FILTER (WHERE estado = 'Vencido')     AS vencido
            FROM prestamos
        """)
        row = cur.fetchone()
        cur.close()
        conn.close()
        return jsonify({
            "success":   True,
            "total":     row[0],
            "pendiente": row[1],
            "activo":    row[2],
            "devuelto":  row[3],
            "vencido":   row[4]
        }), 200
    except Exception as e:
        print(f"❌ Error al leer stats: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500


@read_prestamo_bp.route("/prestamos/<int:id_prestamo>", methods=["GET"])
def get_prestamo(id_prestamo):
    try:
        conn = get_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
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

        return jsonify({"success": True, "prestamo": p}), 200

    except Exception as e:
        print(f"❌ Error al leer préstamo específico: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500