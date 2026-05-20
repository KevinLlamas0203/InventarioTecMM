from datetime import datetime

import psycopg2
from flask import Blueprint, jsonify, request

from Activos.db_helpers import get_connection, get_or_create_fk_id, get_user_id, get_fk_id
from Activos.sync_helpers import create_movement_record

create_bp = Blueprint("create_bp", __name__)


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


def ensure_assignment_columns(cur):
    if not has_column(cur, "asignaciones", "tipo_asignacion"):
        cur.execute("ALTER TABLE asignaciones ADD COLUMN tipo_asignacion VARCHAR")
    if not has_column(cur, "asignaciones", "notas"):
        cur.execute("ALTER TABLE asignaciones ADD COLUMN notas TEXT")

ALLOWED_STATES = {"Disponible", "En uso", "Mantenimiento", "Dado de baja"}
STATE_ALIASES = {
    "En mantenimiento": "Mantenimiento",
    "Baja": "Dado de baja",
}
MAX_TEXT = {
    "nombre": 120,
    "descripcion": 500,
    "categoria": 80,
    "estado": 60,
    "ubicacion": 120,
    "asignado_a": 180,
}


def clean_text(value, field_name, required=False):
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

    max_len = MAX_TEXT.get(field_name)
    if max_len and len(cleaned) > max_len:
        raise ValueError(f"El campo {field_name} no puede exceder {max_len} caracteres")
    return cleaned


def validate_date_format(date_str):
    if not date_str:
        return None
    try:
        datetime.strptime(date_str, "%Y-%m-%d")
        return date_str
    except ValueError:
        return None


@create_bp.route("/activos", methods=["POST"])
def create_activo():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "No se recibieron datos para registrar el activo."}), 400

    try:
        nombre = clean_text(data.get("nombre"), "nombre", required=True)
        descripcion = clean_text(data.get("descripcion"), "descripcion")
        categoria = clean_text(data.get("categoria"), "categoria", required=True)
        estado = clean_text(data.get("estado"), "estado", required=True)
        ubicacion = clean_text(data.get("ubicacion"), "ubicacion")
        asignado_a = clean_text(data.get("asignado_a"), "asignado_a")
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    estado = STATE_ALIASES.get(estado, estado)
    if estado not in ALLOWED_STATES:
        return jsonify({"error": f"Estado no valido: {estado}"}), 400

    fecha_alta = validate_date_format(data.get("fecha_alta"))
    if data.get("fecha_alta") and not fecha_alta:
        return jsonify({"error": "Formato de fecha inválido. Use YYYY-MM-DD."}), 400

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                fk_categoria = get_or_create_fk_id(cur, "categorias", "id_categoria", "nombre", categoria)
                fk_ubicacion = get_or_create_fk_id(cur, "ubicaciones", "id_ubicacion", "nombre", ubicacion)
                fk_usuario = get_user_id(cur, asignado_a)

                if asignado_a and fk_usuario is None:
                    return jsonify({"error": f"No se puede registrar el activo: el usuario asignado no existe ({asignado_a})."}), 400

                if asignado_a and estado != "En uso":
                    estado = "En uso"

                fk_estado = get_or_create_fk_id(cur, "estados", "id_estado", "nombre", estado)

                cur.execute(
                    """
                    SELECT id_activo
                    FROM activos
                    WHERE LOWER(TRIM(nombre)) = LOWER(TRIM(%s))
                    LIMIT 1
                    """,
                    (nombre,),
                )
                existing = cur.fetchone()
                if existing:
                    return jsonify({"error": f"No se puede registrar el activo porque ya existe otro con el mismo nombre: #{existing[0]}"}), 409

                cur.execute(
                    """
                    INSERT INTO activos
                        (nombre, descripcion, fk_id_categoria, fecha_alta, fk_id_estado, fk_id_ubicacion, fk_id_usuario)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING id_activo
                    """,
                    (nombre, descripcion, fk_categoria, fecha_alta, fk_estado, fk_ubicacion, fk_usuario),
                )
                nuevo_id = cur.fetchone()[0]

                create_movement_record(
                    cur,
                    nuevo_id,
                    "Creacion de Activo",
                    estado,
                    ubicacion,
                    fk_usuario,
                    "Alta del activo en el sistema.",
                )

                if fk_usuario is not None:
                    ensure_assignment_columns(cur)
                    cur.execute(
                        """
                        INSERT INTO asignaciones
                            (fk_id_activo, fk_id_usuario, fk_id_ubicacion, fk_id_estado, fecha_inicio, tipo_asignacion, notas)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            nuevo_id,
                            fk_usuario,
                            fk_ubicacion,
                            fk_estado,
                            fecha_alta or datetime.utcnow(),
                            "permanente",
                            "Asignación creada automáticamente al registrar el activo.",
                        ),
                    )
                    create_movement_record(
                        cur,
                        nuevo_id,
                        "Asignacion",
                        "En uso",
                        ubicacion,
                        fk_usuario,
                        "Activo asignado al usuario durante la alta.",
                    )

            conn.commit()

        return jsonify({"mensaje": "Activo creado exitosamente", "activo_id": nuevo_id}), 201

    except psycopg2.errors.ForeignKeyViolation as e:
        return jsonify({"error": "No se puede guardar el activo debido a un valor inválido en una relación de clave externa.", "detalle": str(e)}), 409
    except psycopg2.errors.NotNullViolation as e:
        return jsonify({"error": "No se pudo guardar el activo porque falta un valor obligatorio.", "detalle": str(e)}), 400
    except Exception as e:
        return jsonify({"error": "Error interno al registrar el activo.", "detalle": str(e)}), 500
