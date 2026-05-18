# Blueprint registrado en appActivos.py
from flask import Blueprint, request, jsonify
from Activos.db_helpers import get_connection, get_or_create_fk_id, get_user_id

update_bp = Blueprint("update_bp", __name__)

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

        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"mensaje": f"Activo {activo_id} actualizado exitosamente"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500