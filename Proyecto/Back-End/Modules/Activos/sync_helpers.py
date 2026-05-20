from datetime import datetime
from Activos.db_helpers import get_connection, get_or_create_fk_id, get_fk_id


def create_movement_record(cur, activo_id, tipo_movimiento, estado, ubicacion, usuario_id=None, observaciones=None):
    """Crea un registro de movimiento para sincronizar cambios en activos."""
    try:
        fk_ubicacion = get_or_create_fk_id(cur, "ubicaciones", "id_ubicacion", "nombre", ubicacion) if ubicacion else None
        fk_estado = get_fk_id(cur, "estados", "id_estado", "nombre", estado)
        if fk_estado is None:
            fk_estado = get_or_create_fk_id(cur, "estados", "id_estado", "nombre", estado)

        fk_tipo = get_fk_id(cur, "tipos_movimiento", "id_tipo_movimiento", "nombre_tipo", tipo_movimiento)
        if fk_tipo is None:
            fk_tipo = get_fk_id(cur, "tipo_movimientos", "id_tipo_movimiento", "nombre", tipo_movimiento)
        if fk_tipo is None:
            fk_tipo = get_or_create_fk_id(cur, "tipos_movimiento", "id_tipo_movimiento", "nombre_tipo", tipo_movimiento)

        columns = ["fk_id_activo", "fk_id_tipo_movimiento", "fk_id_estado", "fecha_movimiento"]
        values = [activo_id, fk_tipo, fk_estado, datetime.utcnow()]
        placeholders = ["%s", "%s", "%s", "%s"]

        if fk_ubicacion:
            columns.append("fk_id_ubicacion")
            values.append(fk_ubicacion)
            placeholders.append("%s")

        if usuario_id:
            columns.append("fk_id_usuario")
            values.append(usuario_id)
            placeholders.append("%s")

        if observaciones:
            columns.append("observaciones")
            values.append(observaciones)
            placeholders.append("%s")

        cur.execute(
            f"INSERT INTO movimientos ({', '.join(columns)}) VALUES ({', '.join(placeholders)})",
            tuple(values)
        )
        return True
    except Exception as e:
        print(f"Error creando movimiento: {e}")
        return False


def update_activo_from_assignment(cur, activo_id, usuario_id, ubicacion, estado):
    """Actualiza activo cuando hay cambios en asignación."""
    try:
        fk_ubicacion = get_or_create_fk_id(cur, "ubicaciones", "id_ubicacion", "nombre", ubicacion) if ubicacion else None
        fk_estado = get_fk_id(cur, "estados", "id_estado", "nombre", estado)
        if fk_estado is None:
            fk_estado = get_or_create_fk_id(cur, "estados", "id_estado", "nombre", estado)

        cur.execute("""
            UPDATE activos
            SET fk_id_usuario = %s,
                fk_id_ubicacion = %s,
                fk_id_estado = %s
            WHERE id_activo = %s
        """, (usuario_id, fk_ubicacion, fk_estado, activo_id))
        return True
    except Exception as e:
        print(f"Error actualizando activo: {e}")
        return False


def sync_on_assignment_creation(conn, activo_id, usuario_id, ubicacion, estado, tipo_asignacion="Asignación Inicial"):
    """Sincroniza todos los cambios cuando se crea una asignación."""
    try:
        with conn.cursor() as cur:
            update_activo_from_assignment(cur, activo_id, usuario_id, ubicacion, estado)
            create_movement_record(cur, activo_id, tipo_asignacion, estado, ubicacion, usuario_id)
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        print(f"Error en sincronización de asignación: {e}")
        return False


def sync_on_assignment_closure(conn, activo_id, new_estado, observaciones="Asignación finalizada"):
    """Sincroniza cuando se cierra una asignación."""
    try:
        with conn.cursor() as cur:
            fk_estado = get_fk_id(cur, "estados", "id_estado", "nombre", new_estado)
            if fk_estado is None:
                fk_estado = get_or_create_fk_id(cur, "estados", "id_estado", "nombre", new_estado)

            cur.execute("UPDATE activos SET fk_id_estado = %s WHERE id_activo = %s", (fk_estado, activo_id))
            create_movement_record(cur, activo_id, "Finalización de Asignación", new_estado, None, None, observaciones)
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        print(f"Error al cerrar asignación: {e}")
        return False


def sync_on_movement_creation(conn, activo_id, estado, ubicacion, usuario_id=None):
    """Sincroniza el activo cuando se crea un movimiento."""
    try:
        with conn.cursor() as cur:
            fk_estado = get_fk_id(cur, "estados", "id_estado", "nombre", estado)
            if fk_estado is None:
                fk_estado = get_or_create_fk_id(cur, "estados", "id_estado", "nombre", estado)

            fk_ubicacion = get_or_create_fk_id(cur, "ubicaciones", "id_ubicacion", "nombre", ubicacion) if ubicacion else None

            update_fields = ["fk_id_estado = %s"]
            update_values = [fk_estado]

            if fk_ubicacion:
                update_fields.append("fk_id_ubicacion = %s")
                update_values.append(fk_ubicacion)

            if usuario_id:
                update_fields.append("fk_id_usuario = %s")
                update_values.append(usuario_id)

            update_values.append(activo_id)
            cur.execute(f"UPDATE activos SET {', '.join(update_fields)} WHERE id_activo = %s", tuple(update_values))
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        print(f"Error sincronizando movimiento: {e}")
        return False
