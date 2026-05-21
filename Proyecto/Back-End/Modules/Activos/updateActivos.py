# Blueprint registrado en appActivos.py
from datetime import datetime

from flask import Blueprint, jsonify, request

from Activos.db_helpers import get_connection, get_fk_id, get_or_create_fk_id, get_user_id, has_table
from Activos.sync_helpers import create_movement_record

update_bp = Blueprint("update_bp", __name__)

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
    "tipo_movimiento": 100,
    "observaciones": 500,
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


@update_bp.route("/activos/<int:activo_id>", methods=["PUT"])
def update_activo(activo_id):
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Se requiere un cuerpo JSON válido para actualizar el activo."}), 400

    try:
        nombre = clean_text(data.get("nombre"), "nombre", required=True)
        descripcion = clean_text(data.get("descripcion"), "descripcion")
        categoria = clean_text(data.get("categoria"), "categoria", required=True)
        estado = clean_text(data.get("estado"), "estado", required=True)
        ubicacion = clean_text(data.get("ubicacion"), "ubicacion", required=True)
        asignado_a = clean_text(data.get("asignado_a"), "asignado_a")
        observaciones = clean_text(data.get("observaciones"), "observaciones")
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    tipo_movimiento = data.get("tipo_movimiento")
    if isinstance(tipo_movimiento, str):
        try:
            tipo_movimiento = clean_text(tipo_movimiento, "tipo_movimiento")
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

    estado = STATE_ALIASES.get(estado, estado)
    if estado not in ALLOWED_STATES:
        return jsonify({"error": f"Estado no valido: {estado}"}), 400

    fecha_alta = validate_date_format(data.get("fecha_alta"))
    if data.get("fecha_alta") and not fecha_alta:
        return jsonify({"error": "Formato de fecha invalido. Use YYYY-MM-DD"}), 400

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                fk_categoria = get_or_create_fk_id(cur, "categorias", "id_categoria", "nombre", categoria)
                fk_estado = get_or_create_fk_id(cur, "estados", "id_estado", "nombre", estado)
                fk_ubicacion = get_or_create_fk_id(cur, "ubicaciones", "id_ubicacion", "nombre", ubicacion)
            
            if not fk_ubicacion:
                return jsonify({"error": "No se pudo registrar la ubicación. Intenta de nuevo."}), 400
            
                    return jsonify({"error": f"Usuario asignado no encontrado: {asignado_a}"}), 400

                cur.execute(
                    """
                    SELECT id_activo
                    FROM activos
                    WHERE LOWER(TRIM(nombre)) = LOWER(TRIM(%s))
                      AND id_activo <> %s
                    LIMIT 1
                    """,
                    (nombre, activo_id),
                )
                existing = cur.fetchone()
                if existing:
                    return jsonify({"error": f"Ya existe otro activo con ese nombre: #{existing[0]}"}), 409

                fk_tipo_movimiento = None
                if tipo_movimiento:
                    if isinstance(tipo_movimiento, int):
                        fk_tipo_movimiento = tipo_movimiento
                    else:
                        fk_tipo_movimiento = get_fk_id(
                            cur,
                            "tipos_movimiento",
                            "id_tipo_movimiento",
                            "nombre_tipo",
                            tipo_movimiento,
                        )
                        if fk_tipo_movimiento is None and has_table(cur, "tipo_movimientos"):
                            fk_tipo_movimiento = get_fk_id(
                                cur,
                                "tipo_movimientos",
                                "id_tipo_movimiento",
                                "nombre",
                                tipo_movimiento,
                            )
                    if fk_tipo_movimiento is None:
                        fk_tipo_movimiento = get_or_create_fk_id(
                            cur,
                            "tipos_movimiento",
                            "id_tipo_movimiento",
                            "nombre_tipo",
                            tipo_movimiento,
                        )

                cur.execute(
                    """
                    UPDATE activos
                    SET nombre = %s,
                        descripcion = %s,
                        fk_id_categoria = %s,
                        fecha_alta = %s,
                        fk_id_estado = %s,
                        fk_id_ubicacion = %s,
                        fk_id_usuario = %s
                    WHERE id_activo = %s
                    """,
                    (nombre, descripcion, fk_categoria, fecha_alta, fk_estado, fk_ubicacion, fk_usuario, activo_id),
                )

                if cur.rowcount == 0:
                    return jsonify({"error": f"Activo con ID {activo_id} no encontrado"}), 404

                if fk_tipo_movimiento is not None:
                    create_movement_record(
                        cur,
                        activo_id,
                        tipo_movimiento,
                        estado,
                        ubicacion,
                        fk_usuario,
                        observaciones,
                    )

            conn.commit()
            return jsonify({"mensaje": f"Activo {activo_id} actualizado exitosamente"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
