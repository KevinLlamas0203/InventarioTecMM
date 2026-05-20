from datetime import datetime

from flask import Blueprint, jsonify, request

from Activos.db_helpers import get_connection, get_fk_id, get_or_create_fk_id
from Activos.sync_helpers import create_movement_record

asignaciones_bp = Blueprint("asignaciones_bp", __name__)
STATE_ALIASES = {
    "En mantenimiento": "Mantenimiento",
    "Baja": "Dado de baja",
}


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


def clean_text(value, field_name, required=False, max_len=250):
    if value is None:
        if required:
            raise ValueError(f"El campo {field_name} es obligatorio")
        return None
    if not isinstance(value, str):
        value = str(value)
    cleaned = " ".join(value.strip().split())
    if required and not cleaned:
        raise ValueError(f"El campo {field_name} es obligatorio")
    if not cleaned:
        return None
    if len(cleaned) > max_len:
        raise ValueError(f"El campo {field_name} no puede exceder {max_len} caracteres")
    return cleaned


def parse_positive_int(value, field_name):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise ValueError(f"El campo {field_name} debe ser numerico")
    if parsed <= 0:
        raise ValueError(f"El campo {field_name} debe ser mayor a cero")
    return parsed


def parse_iso_date(value, field_name, required=False):
    if not value:
        if required:
            raise ValueError(f"El campo {field_name} es obligatorio")
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        raise ValueError(f"Formato de {field_name} invalido")


def format_full_name(row):
    return " ".join([part for part in [row[1], row[2], row[3]] if part and part.strip()])


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
        "estado_nombre": STATE_ALIASES.get(row[9], row[9]),
        "fecha_inicio": row[10].isoformat() if row[10] else None,
        "fecha_fin": row[11].isoformat() if row[11] else None,
        "tipo_asignacion": row[12] if len(row) > 12 else None,
        "notas": row[13] if len(row) > 13 else None,
    }

    estado_db = assignment.get("estado_nombre")
    if estado_db == "Finalizada":
        assignment["estado"] = "Finalizada"
    elif assignment["fecha_fin"]:
        try:
            fecha_fin = datetime.fromisoformat(assignment["fecha_fin"])
            assignment["estado"] = "Vencida" if fecha_fin.date() < datetime.utcnow().date() else "Activa"
        except ValueError:
            assignment["estado"] = "Activa"
    else:
        assignment["estado"] = "Activa"

    if include_extended:
        assignment["status"] = assignment["estado"]
    return assignment


def get_assignment_row(cur, assignment_id):
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
        "a.fecha_fin",
    ]
    if has_column(cur, "asignaciones", "tipo_asignacion"):
        columns.append("a.tipo_asignacion")
    if has_column(cur, "asignaciones", "notas"):
        columns.append("a.notas")

    cur.execute(
        f"""
        SELECT {', '.join(columns)}
        FROM asignaciones a
        LEFT JOIN activos act ON a.fk_id_activo = act.id_activo
        LEFT JOIN usuarios u ON a.fk_id_usuario = u.id_usuario
        LEFT JOIN ubicaciones ub ON a.fk_id_ubicacion = ub.id_ubicacion
        LEFT JOIN estados est ON a.fk_id_estado = est.id_estado
        WHERE a.id_asignacion = %s
        """,
        (assignment_id,),
    )
    return cur.fetchone()


@asignaciones_bp.route("/asignaciones/usuarios", methods=["GET"])
def get_asignaciones_usuarios():
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
        return jsonify([
            {
                "id_usuario": row[0],
                "nombre_completo": format_full_name(row),
                "correo_electronico": row[4],
            }
            for row in rows
        ]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@asignaciones_bp.route("/asignaciones/activos", methods=["GET"])
def get_asignaciones_activos():
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT a.id_activo, a.nombre, e.nombre AS estado
                    FROM activos a
                    LEFT JOIN estados e ON a.fk_id_estado = e.id_estado
                    ORDER BY a.nombre
                    """
                )
                rows = cur.fetchall()
        return jsonify([
            {"id_activo": row[0], "nombre": row[1], "estado": STATE_ALIASES.get(row[2], row[2])}
            for row in rows
        ]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@asignaciones_bp.route("/asignaciones/ubicaciones", methods=["GET"])
def get_asignaciones_ubicaciones():
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT nombre FROM ubicaciones ORDER BY nombre")
                rows = cur.fetchall()
        return jsonify([{"nombre": row[0]} for row in rows]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@asignaciones_bp.route("/asignaciones/estados", methods=["GET"])
def get_asignaciones_estados():
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                rows = []
                for nombre in ["Disponible", "En uso", "Mantenimiento", "Dado de baja"]:
                    cur.execute("SELECT id_estado, nombre FROM estados WHERE nombre = %s LIMIT 1", (nombre,))
                    row = cur.fetchone()
                    rows.append({"id_estado": row[0] if row else nombre, "nombre": nombre})
        return jsonify(rows), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@asignaciones_bp.route("/asignaciones", methods=["GET"])
def get_asignaciones():
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
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
                    "a.fecha_fin",
                ]
                if has_column(cur, "asignaciones", "tipo_asignacion"):
                    columns.append("a.tipo_asignacion")
                if has_column(cur, "asignaciones", "notas"):
                    columns.append("a.notas")

                cur.execute(
                    f"""
                    SELECT {', '.join(columns)}
                    FROM asignaciones a
                    LEFT JOIN activos act ON a.fk_id_activo = act.id_activo
                    LEFT JOIN usuarios u ON a.fk_id_usuario = u.id_usuario
                    LEFT JOIN ubicaciones ub ON a.fk_id_ubicacion = ub.id_ubicacion
                    LEFT JOIN estados est ON a.fk_id_estado = est.id_estado
                    ORDER BY a.fecha_inicio DESC
                    """
                )
                rows = cur.fetchall()
        return jsonify([assignment_to_dict(row) for row in rows]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@asignaciones_bp.route("/asignaciones/<int:assignment_id>", methods=["GET"])
def get_asignacion(assignment_id):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                row = get_assignment_row(cur, assignment_id)
        if not row:
            return jsonify({"error": "Asignación no encontrada."}), 404
        return jsonify(assignment_to_dict(row, include_extended=True)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@asignaciones_bp.route("/asignaciones", methods=["POST"])
def create_asignacion():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "No se recibieron datos para crear la asignación."}), 400

    try:
        activo_id = parse_positive_int(data.get("activo_id"), "activo_id")
        usuario_id = parse_positive_int(data.get("usuario_id"), "usuario_id")
        tipo_asignacion = clean_text(data.get("tipo_asignacion"), "tipo_asignacion", required=True, max_len=40).lower()
        ubicacion = clean_text(data.get("ubicacion"), "ubicacion", required=True, max_len=120)
        fecha_inicio_val = parse_iso_date(data.get("fecha_inicio"), "fecha_inicio", required=True)
        fecha_fin_val = parse_iso_date(data.get("fecha_fin"), "fecha_fin")
        notas = clean_text(data.get("notas"), "notas", max_len=500)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    if tipo_asignacion not in ("temporal", "permanente"):
        return jsonify({"error": "Tipo de asignación no válido. Use 'temporal' o 'permanente'."}), 400
    if tipo_asignacion == "temporal" and not fecha_fin_val:
        return jsonify({"error": "La fecha de fin es obligatoria para asignaciones temporales."}), 400
    if fecha_fin_val and fecha_fin_val.date() < fecha_inicio_val.date():
        return jsonify({"error": "La fecha de fin no puede ser anterior a la fecha de inicio."}), 400

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                ensure_assignment_columns(cur)

                cur.execute("SELECT id_activo FROM activos WHERE id_activo = %s", (activo_id,))
                if cur.fetchone() is None:
                    return jsonify({"error": f"No se puede crear la asignación porque el activo con ID {activo_id} no existe."}), 404

                cur.execute("SELECT id_usuario FROM usuarios WHERE id_usuario = %s", (usuario_id,))
                if cur.fetchone() is None:
                    return jsonify({"error": f"No se puede crear la asignación porque el usuario con ID {usuario_id} no existe."}), 404

                cur.execute(
                    """
                    SELECT a.id_asignacion
                    FROM asignaciones a
                    LEFT JOIN estados e ON a.fk_id_estado = e.id_estado
                    WHERE a.fk_id_activo = %s
                      AND COALESCE(e.nombre, '') <> 'Finalizada'
                      AND (a.fecha_fin IS NULL OR a.fecha_fin::date >= CURRENT_DATE)
                    LIMIT 1
                    """,
                    (activo_id,),
                )
                active_assignment = cur.fetchone()
                if active_assignment:
                    return jsonify({"error": f"No se puede crear la asignación porque el activo ya tiene una asignación activa: #{active_assignment[0]}."}), 409

                fk_ubicacion = get_or_create_fk_id(cur, "ubicaciones", "id_ubicacion", "nombre", ubicacion)
                fk_estado = get_or_create_fk_id(cur, "estados", "id_estado", "nombre", "En uso")

                insert_columns = [
                    "fk_id_activo",
                    "fk_id_usuario",
                    "fk_id_ubicacion",
                    "fk_id_estado",
                    "fecha_inicio",
                    "tipo_asignacion",
                ]
                insert_values = [activo_id, usuario_id, fk_ubicacion, fk_estado, fecha_inicio_val, tipo_asignacion]
                placeholders = ["%s"] * len(insert_columns)

                if fecha_fin_val is not None:
                    insert_columns.append("fecha_fin")
                    insert_values.append(fecha_fin_val)
                    placeholders.append("%s")

                if notas is not None:
                    insert_columns.append("notas")
                    insert_values.append(notas)
                    placeholders.append("%s")

                cur.execute(
                    f"""
                    INSERT INTO asignaciones ({', '.join(insert_columns)})
                    VALUES ({', '.join(placeholders)})
                    RETURNING id_asignacion
                    """,
                    tuple(insert_values),
                )
                new_id = cur.fetchone()[0]

                cur.execute(
                    """
                    UPDATE activos
                    SET fk_id_usuario = %s,
                        fk_id_ubicacion = %s,
                        fk_id_estado = %s
                    WHERE id_activo = %s
                    """,
                    (usuario_id, fk_ubicacion, fk_estado, activo_id),
                )

                create_movement_record(
                    cur,
                    activo_id,
                    "Asignacion",
                    "En uso",
                    ubicacion,
                    usuario_id,
                    notas or f"Asignacion {tipo_asignacion} creada",
                )

            conn.commit()

        return jsonify({"message": "Asignacion creada exitosamente", "id_asignacion": new_id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@asignaciones_bp.route("/asignaciones/<int:assignment_id>", methods=["PUT"])
def update_asignacion(assignment_id):
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "No se recibieron datos para actualizar la asignación."}), 400

    try:
        fecha_fin_val = parse_iso_date(data.get("fecha_fin"), "fecha_fin")
        estado = clean_text(data.get("estado"), "estado", max_len=60)
        observaciones = clean_text(data.get("observaciones"), "observaciones", max_len=500)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    if not fecha_fin_val and not estado:
        return jsonify({"error": "Debe proporcionar fecha_fin o estado para actualizar"}), 400

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                row = get_assignment_row(cur, assignment_id)
                if not row:
                    return jsonify({"error": "Asignacion no encontrada"}), 404

                assignment = assignment_to_dict(row)
                set_clauses = []
                values = []

                if fecha_fin_val:
                    set_clauses.append("fecha_fin = %s")
                    values.append(fecha_fin_val)

                fk_estado = None
                if estado:
                    fk_estado = get_or_create_fk_id(cur, "estados", "id_estado", "nombre", estado)
                    set_clauses.append("fk_id_estado = %s")
                    values.append(fk_estado)

                values.append(assignment_id)
                cur.execute(
                    f"UPDATE asignaciones SET {', '.join(set_clauses)} WHERE id_asignacion = %s",
                    tuple(values),
                )

                activo_id = assignment["fk_id_activo"]
                ubicacion = assignment["ubicacion"]
                usuario_id = assignment["fk_id_usuario"]

                if assignment["estado"] == "Finalizada" and estado == "Finalizada":
                    return jsonify({"error": "No se puede finalizar esta asignación porque ya está finalizada."}), 409

                if estado == "Finalizada":
                    fk_estado_finalizada = get_or_create_fk_id(cur, "estados", "id_estado", "nombre", "Finalizada")
                    available_estado = get_or_create_fk_id(cur, "estados", "id_estado", "nombre", "Disponible")
                    cur.execute(
                        "UPDATE asignaciones SET fk_id_estado = %s WHERE id_asignacion = %s",
                        (fk_estado_finalizada, assignment_id),
                    )
                    cur.execute(
                        """
                        UPDATE activos
                        SET fk_id_usuario = NULL,
                            fk_id_estado = %s
                        WHERE id_activo = %s
                        """,
                        (available_estado, activo_id),
                    )
                    create_movement_record(
                        cur,
                        activo_id,
                        "Finalizacion de Asignacion",
                        "Disponible",
                        ubicacion,
                        usuario_id,
                        observaciones or "Asignacion finalizada",
                    )
                elif estado:
                    cur.execute(
                        "UPDATE activos SET fk_id_estado = %s WHERE id_activo = %s",
                        (fk_estado, activo_id),
                    )
                    create_movement_record(
                        cur,
                        activo_id,
                        "Cambio de Estado de Asignacion",
                        estado,
                        ubicacion,
                        usuario_id,
                        observaciones or f"Asignacion actualizada a {estado}",
                    )

            conn.commit()

        return jsonify({"message": "Asignacion actualizada correctamente"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
