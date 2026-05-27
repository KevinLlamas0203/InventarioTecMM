from datetime import datetime

import psycopg2
from flask import Blueprint, jsonify, request

from Activos.db_helpers import get_connection, get_fk_id, get_or_create_fk_id, get_user_id
from Activos.sync_helpers import update_activo_from_assignment

create_bp = Blueprint("create_movimientos_bp", __name__)
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


def parse_int(value, field_name):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise ValueError(f"El campo {field_name} debe ser numerico")
    if parsed <= 0:
        raise ValueError(f"El campo {field_name} debe ser mayor a cero")
    return parsed


def resolve_estado(cur, estado):
    if isinstance(estado, int) or (isinstance(estado, str) and estado.isdigit()):
        cur.execute("SELECT id_estado, nombre FROM estados WHERE id_estado = %s", (int(estado),))
        row = cur.fetchone()
        if not row:
            return None, None
        return row[0], row[1]

    estado_nombre = clean_text(estado, "estado", required=True, max_len=60)
    estado_nombre = STATE_ALIASES.get(estado_nombre, estado_nombre)
    fk_estado = get_fk_id(cur, "estados", "id_estado", "nombre", estado_nombre)
    return fk_estado, estado_nombre if fk_estado else None


def resolve_tipo_movimiento(cur, tipo_movimiento):
    tipo_table = None
    tipo_id_column = None
    tipo_name_column = None

    if has_table(cur, "tipos_movimiento"):
        tipo_table = "tipos_movimiento"
        tipo_id_column = "id_tipo_movimiento"
        tipo_name_column = "nombre_tipo"
    elif has_table(cur, "tipo_movimientos"):
        tipo_table = "tipo_movimientos"
        tipo_id_column = "id_tipo_movimiento"
        tipo_name_column = "nombre"

    if tipo_table is None:
        return None, clean_text(tipo_movimiento, "tipo_movimiento", required=True, max_len=100)

    if isinstance(tipo_movimiento, int) or (isinstance(tipo_movimiento, str) and tipo_movimiento.isdigit()):
        cur.execute(
            f"SELECT {tipo_id_column}, {tipo_name_column} FROM {tipo_table} WHERE {tipo_id_column} = %s",
            (int(tipo_movimiento),),
        )
        row = cur.fetchone()
        if not row:
            return None, None
        return row[0], row[1]

    tipo_nombre = clean_text(tipo_movimiento, "tipo_movimiento", required=True, max_len=100)
    fk_tipo = get_or_create_fk_id(cur, tipo_table, tipo_id_column, tipo_name_column, tipo_nombre)
    return fk_tipo, tipo_nombre


def get_active_assignment(cur, activo_id):
    cur.execute(
        """
        SELECT
            a.id_asignacion,
            a.fk_id_usuario,
            a.fk_id_ubicacion,
            ub.nombre AS ubicacion
        FROM asignaciones a
        LEFT JOIN ubicaciones ub ON a.fk_id_ubicacion = ub.id_ubicacion
        LEFT JOIN estados est ON a.fk_id_estado = est.id_estado
        WHERE a.fk_id_activo = %s
          AND COALESCE(est.nombre, '') <> 'Finalizada'
          AND (a.fecha_fin IS NULL OR a.fecha_fin::date >= CURRENT_DATE)
        ORDER BY a.fecha_inicio DESC, a.id_asignacion DESC
        LIMIT 1
        """,
        (activo_id,),
    )
    row = cur.fetchone()
    if not row:
        return None
    return {
        "id_asignacion": row[0],
        "fk_id_usuario": row[1],
        "fk_id_ubicacion": row[2],
        "ubicacion": row[3],
    }


@create_bp.route("/movimientos", methods=["POST"])
def create_movimiento():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "No se recibieron datos para registrar el movimiento."}), 400

    try:
        activo_id = parse_int(data.get("activo_id"), "activo_id")
        empleado = clean_text(data.get("empleado"), "empleado", max_len=180)
        ubicacion = clean_text(data.get("ubicacion"), "ubicacion", required=True, max_len=120)
        observaciones = clean_text(data.get("observaciones"), "observaciones", max_len=500)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    fecha_movimiento = data.get("fecha_movimiento")
    if fecha_movimiento:
        try:
            fecha_movimiento = datetime.fromisoformat(str(fecha_movimiento).replace("Z", "+00:00"))
        except ValueError:
            return jsonify({"error": "Formato de fecha de movimiento invalido"}), 400
    else:
        fecha_movimiento = datetime.utcnow()

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id_activo FROM activos WHERE id_activo = %s", (activo_id,))
                if cur.fetchone() is None:
                    return jsonify({"error": f"Activo con ID {activo_id} no encontrado"}), 404

                fk_usuario = get_user_id(cur, empleado) if empleado else None
                if empleado and fk_usuario is None:
                    return jsonify({"error": f"Usuario no encontrado: {empleado}"}), 400

                fk_estado, estado_nombre = resolve_estado(cur, data.get("estado"))
                if fk_estado is None:
                    return jsonify({"error": "No se puede registrar el movimiento porque el estado proporcionado no es válido."}), 400

                fk_tipo_movimiento, tipo_nombre = resolve_tipo_movimiento(cur, data.get("tipo_movimiento"))
                if tipo_nombre is None:
                    return jsonify({"error": "No se puede registrar el movimiento porque el tipo de movimiento no es válido."}), 400

                active_assignment = get_active_assignment(cur, activo_id)
                if active_assignment:
                    if estado_nombre in {"Disponible", "Dado de baja"}:
                        return jsonify({
                            "error": (
                                f"No se puede cambiar el activo a '{estado_nombre}' porque tiene la asignacion "
                                f"activa #{active_assignment['id_asignacion']}. Finaliza la asignacion primero."
                            )
                        }), 409
                    if fk_usuario is None:
                        fk_usuario = active_assignment["fk_id_usuario"]
                    if not ubicacion:
                        ubicacion = active_assignment["ubicacion"]
                elif estado_nombre == "En uso" and fk_usuario is None:
                    return jsonify({
                        "error": "No se puede marcar un activo como 'En uso' sin empleado o asignacion activa."
                    }), 400

                fk_ubicacion = get_or_create_fk_id(cur, "ubicaciones", "id_ubicacion", "nombre", ubicacion)
                has_tipo_text_col = has_column(cur, "movimientos", "tipo_movimiento")
                has_tipo_fk_col = has_column(cur, "movimientos", "fk_id_tipo_movimiento")

                columns = ["fk_id_activo", "fk_id_ubicacion", "fk_id_estado", "fecha_movimiento"]
                values = [activo_id, fk_ubicacion, fk_estado, fecha_movimiento]
                placeholders = ["%s", "%s", "%s", "%s"]

                if fk_usuario is not None:
                    columns.append("fk_id_usuario")
                    values.append(fk_usuario)
                    placeholders.append("%s")

                if has_tipo_fk_col and fk_tipo_movimiento is not None:
                    columns.append("fk_id_tipo_movimiento")
                    values.append(fk_tipo_movimiento)
                    placeholders.append("%s")

                if has_tipo_text_col:
                    columns.append("tipo_movimiento")
                    values.append(tipo_nombre)
                    placeholders.append("%s")

                if observaciones is not None:
                    columns.append("observaciones")
                    values.append(observaciones)
                    placeholders.append("%s")

                cur.execute(
                    f"""
                    INSERT INTO movimientos ({', '.join(columns)})
                    VALUES ({', '.join(placeholders)})
                    RETURNING id_movimiento
                    """,
                    tuple(values),
                )
                nuevo_id = cur.fetchone()[0]

                update_activo_from_assignment(cur, activo_id, fk_usuario, ubicacion, estado_nombre)
                if active_assignment:
                    cur.execute(
                        """
                        UPDATE asignaciones
                        SET fk_id_ubicacion = %s,
                            fk_id_estado = %s
                        WHERE id_asignacion = %s
                        """,
                        (fk_ubicacion, fk_estado, active_assignment["id_asignacion"]),
                    )

            conn.commit()

        return jsonify({"mensaje": "Movimiento creado exitosamente", "movimiento_id": nuevo_id}), 201

    except psycopg2.errors.ForeignKeyViolation as e:
        return jsonify({"error": "No se puede registrar el movimiento debido a un valor inválido en una relación de clave externa.", "detalle": str(e)}), 409
    except psycopg2.errors.NotNullViolation as e:
        return jsonify({"error": "No se pudo registrar el movimiento porque falta un valor obligatorio.", "detalle": str(e)}), 400
    except Exception as e:
        return jsonify({"error": "Error interno al registrar el movimiento.", "detalle": str(e)}), 500
