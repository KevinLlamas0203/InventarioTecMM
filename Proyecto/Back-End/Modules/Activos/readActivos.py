# Blueprint registrado en appActivos.py
from flask import Blueprint, jsonify
from Activos.db_helpers import get_connection

read_bp = Blueprint("read_bp", __name__)

def activo_to_dict(row):
    return {
        "activo_id":   row[0],
        "nombre":      row[1],
        "descripcion": row[2],
        "categoria":   row[3],
        "estado":      row[4],
        "ubicacion":   row[5],
        "asignado_a":  row[6],
        "fecha_alta":  str(row[7]) if row[7] else None
    }

@read_bp.route("/activos", methods=["GET"])
def get_all_activos():
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        a.id_activo AS activo_id,
                        a.nombre,
                        a.descripcion,
                        c.nombre AS categoria,
                        e.nombre AS estado,
                        ub.nombre AS ubicacion,
                        (u.nombre || ' ' || u.apellido_paterno || COALESCE(' ' || u.apellido_materno, '')) AS asignado_a,
                        a.fecha_alta
                    FROM activos a
                    LEFT JOIN categorias c ON a.fk_id_categoria = c.id_categoria
                    LEFT JOIN estados e ON a.fk_id_estado = e.id_estado
                    LEFT JOIN ubicaciones ub ON a.fk_id_ubicacion = ub.id_ubicacion
                    LEFT JOIN usuarios u ON a.fk_id_usuario = u.id_usuario
                    ORDER BY a.id_activo ASC
                    """
                )
                rows = cur.fetchall()
        return jsonify([activo_to_dict(row) for row in rows]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@read_bp.route("/activos/<int:activo_id>", methods=["GET"])
def get_activo(activo_id):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        a.id_activo AS activo_id,
                        a.nombre,
                        a.descripcion,
                        c.nombre AS categoria,
                        e.nombre AS estado,
                        ub.nombre AS ubicacion,
                        (u.nombre || ' ' || u.apellido_paterno || COALESCE(' ' || u.apellido_materno, '')) AS asignado_a,
                        a.fecha_alta
                    FROM activos a
                    LEFT JOIN categorias c ON a.fk_id_categoria = c.id_categoria
                    LEFT JOIN estados e ON a.fk_id_estado = e.id_estado
                    LEFT JOIN ubicaciones ub ON a.fk_id_ubicacion = ub.id_ubicacion
                    LEFT JOIN usuarios u ON a.fk_id_usuario = u.id_usuario
                    WHERE a.id_activo = %s
                    """,
                    (activo_id,)
                )
                row = cur.fetchone()

        if row is None:
            return jsonify({"error": f"Activo con ID {activo_id} no encontrado"}), 404

        return jsonify(activo_to_dict(row)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500