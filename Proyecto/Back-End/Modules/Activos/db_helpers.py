import os
import psycopg2


def get_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))


def get_or_create_fk_id(cur, table_name, id_column, name_column, name):
    if not name or (isinstance(name, str) and name.strip() == ""):
        return None

    normalized_name = name.strip()
    cur.execute(
        f"SELECT {id_column} FROM {table_name} WHERE {name_column} = %s",
        (normalized_name,)
    )
    row = cur.fetchone()
    if row:
        return row[0]

    cur.execute(
        f"INSERT INTO {table_name} ({name_column}) VALUES (%s) RETURNING {id_column}",
        (normalized_name,)
    )
    row = cur.fetchone()
    return row[0] if row else None


def get_fk_id(cur, table_name, id_column, name_column, name):
    if not name or (isinstance(name, str) and name.strip() == ""):
        return None

    normalized_name = name.strip()
    cur.execute(
        f"SELECT {id_column} FROM {table_name} WHERE {name_column} = %s",
        (normalized_name,)
    )
    row = cur.fetchone()
    return row[0] if row else None


def get_user_id(cur, user_identifier):
    if not user_identifier or (isinstance(user_identifier, str) and user_identifier.strip() == ""):
        return None

    identifier = user_identifier.strip()
    cur.execute(
        """
        SELECT id_usuario
        FROM usuarios
        WHERE correo_electronico = %s
           OR (nombre || ' ' || apellido_paterno || COALESCE(' ' || apellido_materno, '')) = %s
        LIMIT 1
        """,
        (identifier, identifier)
    )
    row = cur.fetchone()
    return row[0] if row else None


def format_user_display_name(row):
    if not row:
        return None

    nombre = row[0] or ""
    paterno = row[1] or ""
    materno = row[2] or ""
    parts = [nombre.strip(), paterno.strip(), materno.strip()]
    return " ".join([part for part in parts if part]) or None
