from flask import Blueprint, jsonify, request

from Activos.db_helpers import get_connection

read_bp = Blueprint("read_movimientos_bp", __name__)
CANONICAL_STATES = ["Disponible", "En uso", "Mantenimiento", "Dado de baja"]
STATE_ALIASES = {
    "En mantenimiento": "Mantenimiento",
    "Baja": "Dado de baja",
}


def has_table(cur, table_name):
    cur.execute(
        """
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_name = %s
        )
        """,
        (table_name,),
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
        (table_name, column_name),
    )
    return cur.fetchone()[0]


def movimiento_to_dict(row):
    return {
        "id_movimiento": row[0],
        "tipo_movimiento": row[1],
        "estado_final": STATE_ALIASES.get(row[2], row[2]),
        "fecha_movimiento": row[3].isoformat() if row[3] else None,
        "activo_id": row[4],
        "activo_nombre": row[5],
        "empleado": row[6],
        "ubicacion": row[7],
        "observaciones": row[8],
    }


def usuario_to_dict(row):
    nombre_completo = " ".join([part for part in [row[1], row[2], row[3]] if part and part.strip()])
    return {
        "id_usuario": row[0],
        "nombre_completo": nombre_completo,
        "correo_electronico": row[4],
    }


@read_bp.route("/movimientos/usuarios", methods=["GET"])
def get_movimientos_usuarios():
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id_usuario, nombre, apellido_paterno, apellido_materno, correo_electronico
                    FROM usuarios
                    ORDER BY nombre, apellido_paterno, apellido_materno
                    """
                )
                rows = cur.fetchall()
        return jsonify([usuario_to_dict(row) for row in rows]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@read_bp.route("/movimientos/ubicaciones", methods=["GET"])
def get_movimientos_ubicaciones():
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT nombre FROM ubicaciones ORDER BY nombre")
                rows = cur.fetchall()
        return jsonify([{"nombre": row[0]} for row in rows]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def get_tipo_movimiento_rows(cur):
    if has_table(cur, "tipos_movimiento"):
        cur.execute("SELECT id_tipo_movimiento, nombre_tipo FROM tipos_movimiento ORDER BY nombre_tipo")
        return cur.fetchall()
    if has_table(cur, "tipo_movimientos"):
        cur.execute("SELECT id_tipo_movimiento, nombre FROM tipo_movimientos ORDER BY nombre")
        return cur.fetchall()
    return []


def get_estado_rows(cur):
    rows = []
    for nombre in CANONICAL_STATES:
        cur.execute("SELECT id_estado, nombre FROM estados WHERE nombre = %s LIMIT 1", (nombre,))
        row = cur.fetchone()
        if row:
            rows.append(row)
        else:
            rows.append((nombre, nombre))
    return rows


@read_bp.route("/movimientos/tipo_movimientos", methods=["GET"])
@read_bp.route("/movimientos/tipos_movimiento", methods=["GET"])
def get_movimientos_tipos_movimiento():
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                rows = get_tipo_movimiento_rows(cur)
        return jsonify([{"id": row[0], "nombre": row[1]} for row in rows]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@read_bp.route("/movimientos/estados", methods=["GET"])
def get_movimientos_estados():
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                rows = get_estado_rows(cur)
        return jsonify([{"id": row[0], "nombre": row[1]} for row in rows]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@read_bp.route("/movimientos", methods=["GET"])
def get_all_movimientos():
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                activo_id = request.args.get("activo_id", type=int)
                tipo_movimiento = request.args.get("tipo_movimiento")
                estado = request.args.get("estado")
                ubicacion = request.args.get("ubicacion")
                empleado = request.args.get("empleado")
                fecha_desde = request.args.get("fecha_desde")
                fecha_hasta = request.args.get("fecha_hasta")

                use_tipo_movimientos = has_table(cur, "tipos_movimiento") and has_column(
                    cur, "movimientos", "fk_id_tipo_movimiento"
                )
                has_tipo_movimiento_col = has_column(cur, "movimientos", "tipo_movimiento")
                has_tipo_movimientos_legacy = has_table(cur, "tipo_movimientos") and has_column(
                    cur, "movimientos", "fk_id_tipo_movimiento"
                )
                has_fk_estado = has_column(cur, "movimientos", "fk_id_estado")

                if use_tipo_movimientos:
                    tipo_join = "LEFT JOIN tipos_movimiento tm ON m.fk_id_tipo_movimiento = tm.id_tipo_movimiento"
                    tipo_expr = "tm.nombre_tipo AS tipo_movimiento"
                    tipo_name_column = "tm.nombre_tipo"
                elif has_tipo_movimientos_legacy:
                    tipo_join = "LEFT JOIN tipo_movimientos tm ON m.fk_id_tipo_movimiento = tm.id_tipo_movimiento"
                    tipo_expr = "tm.nombre AS tipo_movimiento"
                    tipo_name_column = "tm.nombre"
                elif has_tipo_movimiento_col:
                    tipo_join = ""
                    tipo_expr = "m.tipo_movimiento AS tipo_movimiento"
                    tipo_name_column = None
                else:
                    tipo_join = ""
                    tipo_expr = "NULL AS tipo_movimiento"
                    tipo_name_column = None

                estado_join = "LEFT JOIN estados e ON m.fk_id_estado = e.id_estado" if has_fk_estado else ""
                estado_expr = "e.nombre AS estado_final" if has_fk_estado else "NULL AS estado_final"

                where_clauses = []
                query_params = []

                if activo_id is not None:
                    where_clauses.append("a.id_activo = %s")
                    query_params.append(activo_id)

                if tipo_movimiento:
                    tipo_clauses = []
                    if tipo_movimiento.isdigit():
                        tipo_clauses.append("m.fk_id_tipo_movimiento = %s")
                        query_params.append(int(tipo_movimiento))
                    if tipo_name_column:
                        tipo_clauses.append(f"{tipo_name_column} = %s")
                        query_params.append(tipo_movimiento)
                    if has_tipo_movimiento_col:
                        tipo_clauses.append("m.tipo_movimiento = %s")
                        query_params.append(tipo_movimiento)
                    where_clauses.append(f"({' OR '.join(tipo_clauses)})")

                if estado:
                    where_clauses.append("e.nombre = %s" if has_fk_estado else "m.estado = %s")
                    query_params.append(estado)

                if ubicacion:
                    where_clauses.append("ub.nombre = %s")
                    query_params.append(ubicacion)

                if empleado:
                    where_clauses.append(
                        "(u.nombre || ' ' || u.apellido_paterno || COALESCE(' ' || u.apellido_materno, '')) = %s"
                    )
                    query_params.append(empleado)

                if fecha_desde:
                    where_clauses.append("m.fecha_movimiento >= %s")
                    query_params.append(fecha_desde)

                if fecha_hasta:
                    where_clauses.append("m.fecha_movimiento <= %s")
                    query_params.append(fecha_hasta)

                where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""

                cur.execute(
                    f"""
                    SELECT
                        m.id_movimiento,
                        {tipo_expr},
                        {estado_expr},
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
                    {estado_join}
                    {where_sql}
                    ORDER BY m.fecha_movimiento DESC
                    """,
                    tuple(query_params),
                )
                rows = cur.fetchall()

        return jsonify([movimiento_to_dict(row) for row in rows]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
