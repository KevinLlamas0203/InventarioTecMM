from flask import Blueprint, request, jsonify
import psycopg2
from db_helpers import get_connection, get_or_create_fk_id, get_user_id

create_bp = Blueprint("create_bp", __name__)

@create_bp.route("/activos", methods=["POST"])
def create_activo():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Body JSON requerido"}), 400

    nombre      = data.get("nombre")
    descripcion = data.get("descripcion")
    categoria   = data.get("categoria")
    estado      = data.get("estado")
    ubicacion   = data.get("ubicacion")
    asignado_a  = data.get("asignado_a")
    fecha_alta  = data.get("fecha_alta")

    # Validación de campos obligatorios
    required = {"nombre": nombre, "categoria": categoria, "estado": estado}
    missing = [k for k, v in required.items() if v is None or (isinstance(v, str) and v.strip() == "")]
    if missing:
        return jsonify({"error": f"Campos obligatorios faltantes: {', '.join(missing)}"}), 400

    fecha_alta = fecha_alta.strip() if isinstance(fecha_alta, str) and fecha_alta.strip() else None
    ubicacion = ubicacion.strip() if isinstance(ubicacion, str) and ubicacion.strip() else None
    asignado_a = asignado_a.strip() if isinstance(asignado_a, str) and asignado_a.strip() else None

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                fk_categoria = get_or_create_fk_id(cur, "categorias", "id_categoria", "nombre", categoria)
                fk_estado = get_or_create_fk_id(cur, "estados", "id_estado", "nombre", estado)
                fk_ubicacion = get_or_create_fk_id(cur, "ubicaciones", "id_ubicacion", "nombre", ubicacion)
                fk_usuario = get_user_id(cur, asignado_a)

                if asignado_a and fk_usuario is None:
                    return jsonify({"error": f"Usuario asignado no encontrado: {asignado_a}"}), 400

                cur.execute("""
                    INSERT INTO activos
                        (nombre, descripcion, fk_id_categoria, fecha_alta, fk_id_estado, fk_id_ubicacion, fk_id_usuario)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING id_activo
                """, (
                    nombre,
                    descripcion,
                    fk_categoria,
                    fecha_alta,
                    fk_estado,
                    fk_ubicacion,
                    fk_usuario,
                ))
                nuevo_id = cur.fetchone()[0]
            conn.commit()

        return jsonify({
            "mensaje": "Activo creado exitosamente",
            "activo_id": nuevo_id
        }), 201

    except psycopg2.errors.ForeignKeyViolation as e:
        return jsonify({"error": "ID foráneo no existe en la tabla referenciada", "detalle": str(e)}), 409
    except psycopg2.errors.NotNullViolation as e:
        return jsonify({"error": "Campo NOT NULL no puede ser nulo", "detalle": str(e)}), 400
    except Exception as e:
        return jsonify({"error": "Error interno del servidor", "detalle": str(e)}), 500