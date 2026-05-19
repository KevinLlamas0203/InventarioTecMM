from flask import Blueprint, request, jsonify
from datetime import datetime
from Activos.db_helpers import get_connection, get_or_create_fk_id, get_fk_id

asignaciones_bp = Blueprint("asignaciones_bp", __name__)


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


def format_full_name(row):
    return ' '.join([part for part in [row[1], row[2], row[3]] if part and part.strip()])


@asignaciones_bp.route("/asignaciones/usuarios", methods=["GET"])
def get_asignaciones_usuarios():
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
        return jsonify([
            {
                "id_usuario": row[0],
                "nombre_completo": format_full_name(row),
                "correo_electronico": row[4]
            }
            for row in rows
        ]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@asignaciones_bp.route("/asignaciones/activos", methods=["GET"])
def get_asignaciones_activos():
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT id_activo, nombre
            FROM activos
            ORDER BY nombre
            """
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify([
            {"id_activo": row[0], "nombre": row[1]}
            for row in rows
        ]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@asignaciones_bp.route("/asignaciones/ubicaciones", methods=["GET"])
def get_asignaciones_ubicaciones():
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT nombre FROM ubicaciones ORDER BY nombre")
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify([{"nombre": row[0]} for row in rows]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@asignaciones_bp.route("/asignaciones/estados", methods=["GET"])
def get_asignaciones_estados():
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT id_estado, nombre FROM estados ORDER BY nombre")
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify([
            {"id_estado": row[0], "nombre": row[1]}
            for row in rows
        ]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def ensure_assignment_columns(cur):
    if not has_column(cur, "asignaciones", "tipo_asignacion"):
        cur.execute("ALTER TABLE asignaciones ADD COLUMN tipo_asignacion VARCHAR")
    if not has_column(cur, "asignaciones", "notas"):
        cur.execute("ALTER TABLE asignaciones ADD COLUMN notas TEXT")


def assignment_to_dict(row, include_extended=False):
    assignment = {
        "id_asignacion": row[0],
        "fk_id_activo": row[1],
        "activo_nombre": row[2],
        "fk_id_usuario": row[3],
        "usuario_nombre": row[4],
        "usuario_email": row[5],
        "fk_id_ubicacion": row[6],
        "ubicacion": row[7],
        "fk_id_estado": row[8],
        "estado_nombre": row[9],
        "fecha_inicio": row[10].isoformat() if row[10] else None,
        "fecha_fin": row[11].isoformat() if row[11] else None,
        "tipo_asignacion": row[12] if len(row) > 12 else None,
        "notas": row[13] if len(row) > 13 else None,
    }

    if assignment["fecha_fin"]:
        try:
            fecha_fin = datetime.fromisoformat(assignment["fecha_fin"])
            if fecha_fin.date() < datetime.utcnow().date():
                assignment["estado"] = "Vencida"
            else:
                assignment["estado"] = "Activa"
        except ValueError:
            assignment["estado"] = "Activa"
    else:
        assignment["estado"] = "Activa"

    if include_extended:
        assignment["status"] = assignment["estado"]

    return assignment


@asignaciones_bp.route("/asignaciones", methods=["GET"])
def get_asignaciones():
    try:
        conn = get_connection()
        cur = conn.cursor()
        assignment_columns = [
            "a.id_asignacion",
            "a.fk_id_activo",
            "act.nombre AS activo_nombre",
            "a.fk_id_usuario",
            "u.nombre AS usuario_nombre",
            "u.correo_electronico",
            "a.fk_id_ubicacion",
            "ub.nombre AS ubicacion",
            "a.fk_id_estado",
            "est.nombre AS estado_nombre",
            "a.fecha_inicio",
            "a.fecha_fin"
        ]

        has_tipo = has_column(cur, "asignaciones", "tipo_asignacion")
        has_notas = has_column(cur, "asignaciones", "notas")
        if has_tipo:
            assignment_columns.append("a.tipo_asignacion")
        if has_notas:
            assignment_columns.append("a.notas")

        query = f"""
            SELECT {', '.join(assignment_columns)}
            FROM asignaciones a
            LEFT JOIN activos act ON a.fk_id_activo = act.id_activo
            LEFT JOIN usuarios u ON a.fk_id_usuario = u.id_usuario
            LEFT JOIN ubicaciones ub ON a.fk_id_ubicacion = ub.id_ubicacion
            LEFT JOIN estados est ON a.fk_id_estado = est.id_estado
            ORDER BY a.fecha_inicio DESC
        """

        cur.execute(query)
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify([assignment_to_dict(row) for row in rows]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@asignaciones_bp.route("/asignaciones/<int:assignment_id>", methods=["GET"])
def get_asignacion(assignment_id):
    try:
        conn = get_connection()
        cur = conn.cursor()

        columns = [
            "a.id_asignacion",
            "a.fk_id_activo",
            "act.nombre AS activo_nombre",
            "a.fk_id_usuario",
            "u.nombre AS usuario_nombre",
            "u.correo_electronico",
            "a.fk_id_ubicacion",
            "ub.nombre AS ubicacion",
            "a.fk_id_estado",
            "est.nombre AS estado_nombre",
            "a.fecha_inicio",
            "a.fecha_fin"
        ]

        if has_column(cur, "asignaciones", "tipo_asignacion"):
            columns.append("a.tipo_asignacion")
        if has_column(cur, "asignaciones", "notas"):
            columns.append("a.notas")

        query = f"""
            SELECT {', '.join(columns)}
            FROM asignaciones a
            LEFT JOIN activos act ON a.fk_id_activo = act.id_activo
            LEFT JOIN usuarios u ON a.fk_id_usuario = u.id_usuario
            LEFT JOIN ubicaciones ub ON a.fk_id_ubicacion = ub.id_ubicacion
            LEFT JOIN estados est ON a.fk_id_estado = est.id_estado
            WHERE a.id_asignacion = %s
        """
        cur.execute(query, (assignment_id,))
        row = cur.fetchone()
        cur.close()
        conn.close()
        if not row:
            return jsonify({"error": "Asignación no encontrada"}), 404
        return jsonify(assignment_to_dict(row, include_extended=True)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@asignaciones_bp.route("/asignaciones", methods=["POST"])
def create_asignacion():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Body JSON requerido"}), 400

    activo_id = data.get("activo_id")
    usuario_id = data.get("usuario_id")
    tipo_asignacion = data.get("tipo_asignacion")
    ubicacion = data.get("ubicacion")
    fecha_inicio = data.get("fecha_inicio")
    fecha_fin = data.get("fecha_fin")
    notas = data.get("notas")

    missing = []
    if not activo_id:
        missing.append("activo_id")
    if not usuario_id:
        missing.append("usuario_id")
    if not tipo_asignacion:
        missing.append("tipo_asignacion")
    if not ubicacion:
        missing.append("ubicacion")
    if not fecha_inicio:
        missing.append("fecha_inicio")

    if missing:
        return jsonify({"error": f"Campos obligatorios faltantes: {', '.join(missing)}"}), 400

    try:
        fecha_inicio_val = datetime.fromisoformat(fecha_inicio)
    except Exception:
        return jsonify({"error": "Formato de fecha de inicio inválido"}), 400

    fecha_fin_val = None
    if fecha_fin:
        try:
            fecha_fin_val = datetime.fromisoformat(fecha_fin)
        except Exception:
            return jsonify({"error": "Formato de fecha de fin inválido"}), 400

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                ensure_assignment_columns(cur)

                fk_ubicacion = get_or_create_fk_id(cur, "ubicaciones", "id_ubicacion", "nombre", ubicacion)
                fk_estado = get_fk_id(cur, "estados", "id_estado", "nombre", "En uso")
                if fk_estado is None:
                    fk_estado = get_or_create_fk_id(cur, "estados", "id_estado", "nombre", "En uso")

                insert_columns = ["fk_id_activo", "fk_id_usuario", "fk_id_ubicacion", "fk_id_estado", "fecha_inicio"]
                insert_values = [activo_id, usuario_id, fk_ubicacion, fk_estado, fecha_inicio_val]
                placeholders = ["%s"] * len(insert_columns)

                if fecha_fin_val is not None:
                    insert_columns.append("fecha_fin")
                    insert_values.append(fecha_fin_val)
                    placeholders.append("%s")

                if tipo_asignacion is not None:
                    insert_columns.append("tipo_asignacion")
                    insert_values.append(tipo_asignacion)
                    placeholders.append("%s")

                if notas is not None:
                    insert_columns.append("notas")
                    insert_values.append(notas)
                    placeholders.append("%s")

                cur.execute(
                    f"INSERT INTO asignaciones ({', '.join(insert_columns)}) VALUES ({', '.join(placeholders)}) RETURNING id_asignacion",
                    tuple(insert_values)
                )
                new_id = cur.fetchone()[0]

                cur.execute(
                    "UPDATE activos SET fk_id_usuario = %s, fk_id_ubicacion = %s, fk_id_estado = %s WHERE id_activo = %s",
                    (usuario_id, fk_ubicacion, fk_estado, activo_id)
                )
            conn.commit()

        return jsonify({"message": "Asignación creada exitosamente", "id_asignacion": new_id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@asignaciones_bp.route("/asignaciones/<int:assignment_id>", methods=["PUT"])
def update_asignacion(assignment_id):
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Body JSON requerido"}), 400

    fecha_fin = data.get("fecha_fin")
    estado = data.get("estado")

    if not fecha_fin and not estado:
        return jsonify({"error": "Debe proporcionar fecha_fin o estado para actualizar"}), 400

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                set_clauses = []
                values = []

                if fecha_fin:
                    try:
                        fecha_fin_val = datetime.fromisoformat(fecha_fin)
                    except Exception:
                        return jsonify({"error": "Formato de fecha de fin inválido"}), 400
                    set_clauses.append("fecha_fin = %s")
                    values.append(fecha_fin_val)

                if estado:
                    fk_estado = get_fk_id(cur, "estados", "id_estado", "nombre", estado)
                    if fk_estado is None:
                        fk_estado = get_or_create_fk_id(cur, "estados", "id_estado", "nombre", estado)
                    set_clauses.append("fk_id_estado = %s")
                    values.append(fk_estado)

                if not set_clauses:
                    return jsonify({"error": "No hay cambios válidos para aplicar"}), 400

                values.append(assignment_id)
                cur.execute(
                    f"UPDATE asignaciones SET {', '.join(set_clauses)} WHERE id_asignacion = %s",
                    tuple(values)
                )
                if cur.rowcount == 0:
                    return jsonify({"error": "Asignación no encontrada"}), 404
            conn.commit()

        return jsonify({"message": "Asignación actualizada correctamente"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
