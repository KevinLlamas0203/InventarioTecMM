# Blueprint registrado en appActivos.py
from flask import Blueprint, jsonify
from Activos.db_helpers import get_connection

read_bp = Blueprint("read_bp", __name__)

CANONICAL_STATES = ["Disponible", "En uso", "Mantenimiento", "Dado de baja"]
STATE_ALIASES = {
    "En mantenimiento": "Mantenimiento",
    "Baja": "Dado de baja",
}


def normalize_state(value):
    return STATE_ALIASES.get(value, value)

def activo_to_dict(row):
    return {
        "activo_id":   row[0],
        "nombre":      row[1],
        "descripcion": row[2],
        "categoria":   row[3],
        "estado":      normalize_state(row[4]),
        "ubicacion":   row[5],
        "asignado_a":  row[6],
        "fecha_alta":  str(row[7]) if row[7] else None
    }


def usuario_to_dict(row):
    nombre_completo = " ".join([part for part in [row[1], row[2], row[3]] if part and part.strip()])
    return {
        "id_usuario": row[0],
        "nombre_completo": nombre_completo,
        "correo_electronico": row[4],
    }


@read_bp.route("/activos/catalogos", methods=["GET"])
def get_activos_catalogos():
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT nombre FROM categorias ORDER BY nombre")
                categorias = [row[0] for row in cur.fetchall()]

                estados = CANONICAL_STATES

                cur.execute("SELECT nombre FROM ubicaciones ORDER BY nombre")
                ubicaciones = [row[0] for row in cur.fetchall()]

                cur.execute(
                    """
                    SELECT id_usuario, nombre, apellido_paterno, apellido_materno, correo_electronico
                    FROM usuarios
                    ORDER BY nombre, apellido_paterno, apellido_materno
                    """
                )
                usuarios = [usuario_to_dict(row) for row in cur.fetchall()]

        return jsonify({
            "categorias": categorias,
            "estados": estados,
            "ubicaciones": ubicaciones,
            "usuarios": usuarios,
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

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
