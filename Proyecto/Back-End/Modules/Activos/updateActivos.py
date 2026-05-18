# Blueprint registrado en appActivos.py
from flask import Blueprint, request, jsonify
from datetime import datetime
from Activos.db_helpers import get_connection, get_or_create_fk_id, get_fk_id, get_user_id

update_bp = Blueprint("update_bp", __name__)

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

@update_bp.route("/activos/<int:activo_id>", methods=["PUT"])
def update_activo(activo_id):
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Body JSON requerido"}), 400

    nombre      = data.get("nombre")
    descripcion = data.get("descripcion")
    categoria   = data.get("categoria")
    estado      = data.get("estado")
    ubicacion   = data.get("ubicacion")
    asignado_a  = data.get("asignado_a")
    tipo_movimiento = data.get("tipo_movimiento")
    observaciones = data.get("observaciones")
    fecha_alta  = data.get("fecha_alta")   # Formato: YYYY-MM-DD

    if not all([nombre, categoria, estado]):
        return jsonify({"error": "Los campos nombre, categoria y estado son obligatorios"}), 400

    fecha_alta = fecha_alta.strip() if isinstance(fecha_alta, str) and fecha_alta.strip() else None
    ubicacion = ubicacion.strip() if isinstance(ubicacion, str) and ubicacion.strip() else None
    asignado_a = asignado_a.strip() if isinstance(asignado_a, str) and asignado_a.strip() else None

    try:
        conn = get_connection()
        cur = conn.cursor()

        fk_categoria = get_or_create_fk_id(cur, "categorias", "id_categoria", "nombre", categoria)
        fk_estado = get_or_create_fk_id(cur, "estados", "id_estado", "nombre", estado)
        fk_ubicacion = get_or_create_fk_id(cur, "ubicaciones", "id_ubicacion", "nombre", ubicacion)
        fk_usuario = get_user_id(cur, asignado_a)

        if asignado_a and fk_usuario is None:
            conn.close()
            return jsonify({"error": f"Usuario asignado no encontrado: {asignado_a}"}), 400

        fk_tipo_movimiento = None
        if tipo_movimiento:
            if isinstance(tipo_movimiento, int):
                fk_tipo_movimiento = tipo_movimiento
            else:
                fk_tipo_movimiento = get_fk_id(cur, "tipos_movimiento", "id_tipo_movimiento", "nombre_tipo", tipo_movimiento)
                if fk_tipo_movimiento is None and has_table(cur, "tipo_movimientos"):
                    fk_tipo_movimiento = get_fk_id(cur, "tipo_movimientos", "id_tipo_movimiento", "nombre", tipo_movimiento)
            if fk_tipo_movimiento is None:
                conn.close()
                return jsonify({"error": f"Tipo de movimiento no válido: {tipo_movimiento}"}), 400

        cur.execute("""
            UPDATE activos
            SET nombre        = %s,
                descripcion   = %s,
                fk_id_categoria = %s,
                fecha_alta    = %s,
                fk_id_estado  = %s,
                fk_id_ubicacion = %s,
                fk_id_usuario = %s
            WHERE id_activo = %s
        """, (nombre, descripcion, fk_categoria, fecha_alta, fk_estado, fk_ubicacion, fk_usuario, activo_id))

        if cur.rowcount == 0:
            conn.rollback()
            cur.close()
            conn.close()
            return jsonify({"error": f"Activo con ID {activo_id} no encontrado"}), 404

        if fk_tipo_movimiento is not None:
            movement_columns = ["fk_id_activo", "fk_id_usuario", "fk_id_ubicacion", "fk_id_estado", "fk_id_tipo_movimiento", "fecha_movimiento"]
            movement_values = [activo_id, fk_usuario, fk_ubicacion, fk_estado, fk_tipo_movimiento, datetime.utcnow()]
            placeholders = ["%s"] * len(movement_values)

            if observaciones:
                movement_columns.append("observaciones")
                movement_values.append(observaciones.strip())
                placeholders.append("%s")

            cur.execute(
                f"INSERT INTO movimientos ({', '.join(movement_columns)}) VALUES ({', '.join(placeholders)})",
                tuple(movement_values)
            )

        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"mensaje": f"Activo {activo_id} actualizado exitosamente"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500