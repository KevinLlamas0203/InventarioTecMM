from flask import Blueprint, request, jsonify
import psycopg2
from datetime import datetime
from Activos.db_helpers import get_connection, get_or_create_fk_id, get_user_id

create_bp = Blueprint("create_movimientos_bp", __name__)


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


@create_bp.route("/movimientos", methods=["POST"])
def create_movimiento():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Body JSON requerido"}), 400

    activo_id = data.get("activo_id")
    tipo_movimiento = data.get("tipo_movimiento")
    ubicacion = data.get("ubicacion")
    empleado = data.get("empleado")
    observaciones = data.get("observaciones")
    fecha_movimiento = data.get("fecha_movimiento")

    required = {
        "activo_id": activo_id,
        "tipo_movimiento": tipo_movimiento,
    }
    missing = [k for k, v in required.items() if v is None or (isinstance(v, str) and v.strip() == "")]
    if missing:
        return jsonify({"error": f"Campos obligatorios faltantes: {', '.join(missing)}"}), 400

    empleado = empleado.strip() if isinstance(empleado, str) else None
    ubicacion = ubicacion.strip() if isinstance(ubicacion, str) else None
    observaciones = observaciones.strip() if isinstance(observaciones, str) else None
    tipo_movimiento = tipo_movimiento.strip() if isinstance(tipo_movimiento, str) else None
    fecha_movimiento = fecha_movimiento.strip() if isinstance(fecha_movimiento, str) else None
    if not fecha_movimiento:
        fecha_movimiento = datetime.utcnow()

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                fk_usuario = get_user_id(cur, empleado) if empleado else None
                if empleado and fk_usuario is None:
                    return jsonify({"error": f"Usuario no encontrado: {empleado}"}), 400

                use_tipo_movimientos = has_table(cur, "tipo_movimientos") and has_column(cur, "movimientos", "fk_id_tipo_movimiento")
                tipo_table = "tipo_movimientos" if use_tipo_movimientos else "estados"
                tipo_id_column = "id_tipo_movimiento" if tipo_table == "tipo_movimientos" else "id_estado"
                mov_type_fk_col = "fk_id_tipo_movimiento" if use_tipo_movimientos else "fk_id_estado"

                fk_tipo_movimiento = get_or_create_fk_id(cur, tipo_table, tipo_id_column, "nombre", tipo_movimiento)
                fk_ubicacion = get_or_create_fk_id(cur, "ubicaciones", "id_ubicacion", "nombre", ubicacion)

                columns = ["fk_id_activo", "fk_id_ubicacion", "fecha_movimiento"]
                values = [activo_id, fk_ubicacion, fecha_movimiento]
                placeholders = ["%s", "%s", "%s"]

                if fk_usuario is not None:
                    columns.append("fk_id_usuario")
                    values.append(fk_usuario)
                    placeholders.append("%s")

                if fk_tipo_movimiento is not None:
                    columns.append(mov_type_fk_col)
                    values.append(fk_tipo_movimiento)
                    placeholders.append("%s")

                if has_column(cur, "movimientos", "tipo_movimiento"):
                    columns.append("tipo_movimiento")
                    values.append(tipo_movimiento)
                    placeholders.append("%s")

                if observaciones is not None:
                    columns.append("observaciones")
                    values.append(observaciones)
                    placeholders.append("%s")

                cur.execute(
                    f"""
                    INSERT INTO movimientos
                        ({', '.join(columns)})
                    VALUES ({', '.join(placeholders)})
                    RETURNING id_movimiento
                    """,
                    tuple(values)
                )
                nuevo_id = cur.fetchone()[0]
            conn.commit()

        return jsonify({
            "mensaje": "Movimiento creado exitosamente",
            "movimiento_id": nuevo_id
        }), 201

    except psycopg2.errors.ForeignKeyViolation as e:
        return jsonify({"error": "ID foráneo no existe en la tabla referenciada", "detalle": str(e)}), 409
    except psycopg2.errors.NotNullViolation as e:
        return jsonify({"error": "Campo NOT NULL no puede ser nulo", "detalle": str(e)}), 400
    except Exception as e:
        return jsonify({"error": "Error interno del servidor", "detalle": str(e)}), 500
