from flask import Blueprint, jsonify
from Activos.db_helpers import get_connection

read_bp = Blueprint("read_movimientos_bp", __name__)


def has_table(cur, table_name):
    cur.execute(
        """
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_name = %s
        )
        """,
        (table_name,)
    )
    return cur.fetchone()[0]


def has_column(cur, table_name, column_name):
    cur.execute(
        """
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = %s
              AND column_name = %s
        )
        """,
        (table_name, column_name)
    )
    return cur.fetchone()[0]


def movimiento_to_dict(row):
    return {
        "id_movimiento": row[0],
        "tipo_movimiento": row[1],
        "fecha_movimiento": row[2].isoformat() if row[2] else None,
        "activo_id": row[3],
        "activo_nombre": row[4],
        "empleado": row[5],
        "ubicacion": row[6],
        "observaciones": row[7],
    }


def usuario_to_dict(row):
    nombre_completo = ' '.join([part for part in [row[1], row[2], row[3]] if part and part.strip()])
    return {
        "id_usuario": row[0],
        "nombre_completo": nombre_completo,
        "correo_electronico": row[4]
    }


@read_bp.route("/movimientos/usuarios", methods=["GET"])
def get_movimientos_usuarios():
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT id_usuario, nombre, apellido_paterno, apellido_materno, correo_electronico
            FROM usuarios
            ORDER BY nombre, apellido_paterno, apellido_materno
            """
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify([usuario_to_dict(row) for row in rows]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@read_bp.route("/movimientos/ubicaciones", methods=["GET"])
def get_movimientos_ubicaciones():
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT nombre FROM ubicaciones ORDER BY nombre"
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify([{"nombre": row[0]} for row in rows]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def get_tipo_movimientos(cur):
    tipo_table = "tipo_movimientos" if has_table(cur, "tipo_movimientos") else "estados"
    cur.execute(
        f"SELECT nombre FROM {tipo_table} ORDER BY nombre"
    )
    return cur.fetchall()


@read_bp.route("/movimientos/tipo_movimientos", methods=["GET"])
def get_movimientos_tipo_movimientos():
    try:
        conn = get_connection()
        cur = conn.cursor()
        rows = get_tipo_movimientos(cur)
        cur.close()
        conn.close()
        return jsonify([{"nombre": row[0]} for row in rows]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@read_bp.route("/movimientos/estados", methods=["GET"])
def get_movimientos_estados():
    try:
        conn = get_connection()
        cur = conn.cursor()
        rows = get_tipo_movimientos(cur)
        cur.close()
        conn.close()
        return jsonify([{"nombre": row[0]} for row in rows]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@read_bp.route("/movimientos", methods=["GET"])
def get_all_movimientos():
    try:
        conn = get_connection()
        cur = conn.cursor()

        use_tipo_movimientos = has_table(cur, "tipo_movimientos") and has_column(cur, "movimientos", "fk_id_tipo_movimiento")
        has_tipo_movimiento_col = has_column(cur, "movimientos", "tipo_movimiento")

        if use_tipo_movimientos:
            tipo_join = "LEFT JOIN tipo_movimientos tm ON m.fk_id_tipo_movimiento = tm.id_tipo_movimiento"
            if has_tipo_movimiento_col:
                tipo_expr = "COALESCE(tm.nombre, m.tipo_movimiento) AS tipo_movimiento"
            else:
                tipo_expr = "tm.nombre AS tipo_movimiento"
        elif has_column(cur, "movimientos", "fk_id_estado"):
            tipo_join = "LEFT JOIN estados e ON m.fk_id_estado = e.id_estado"
            if has_tipo_movimiento_col:
                tipo_expr = "COALESCE(e.nombre, m.tipo_movimiento) AS tipo_movimiento"
            else:
                tipo_expr = "e.nombre AS tipo_movimiento"
        elif has_tipo_movimiento_col:
            tipo_join = ""
            tipo_expr = "m.tipo_movimiento AS tipo_movimiento"
        else:
            tipo_join = ""
            tipo_expr = "NULL AS tipo_movimiento"

        cur.execute(
            f"""
            SELECT
                m.id_movimiento,
                {tipo_expr},
                m.fecha_movimiento,
                a.id_activo,
                a.nombre AS activo_nombre,
                (u.nombre || ' ' || u.apellido_paterno || COALESCE(' ' || u.apellido_materno, '')) AS empleado,
                ub.nombre AS ubicacion,
                m.observaciones
            FROM movimientos m
            LEFT JOIN activos a ON m.fk_id_activo = a.id_activo
            LEFT JOIN usuarios u ON m.fk_id_usuario = u.id_usuario
            LEFT JOIN ubicaciones ub ON m.fk_id_ubicacion = ub.id_ubicacion
            {tipo_join}
            ORDER BY m.fecha_movimiento DESC
            """
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify([movimiento_to_dict(row) for row in rows]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
