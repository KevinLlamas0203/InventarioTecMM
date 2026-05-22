import os
from pathlib import Path
import psycopg2
from dotenv import load_dotenv

base_dir = Path('.').resolve()
load_dotenv(base_dir / '.env')

conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

print("\n=== ESTRUCTURA DE TABLA PRESTAMOS ===")
cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='prestamos' ORDER BY ordinal_position")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]}")

print("\n=== CONTENIDO DE TABLA PRESTAMOS ===")
cur.execute("SELECT * FROM prestamos LIMIT 3")
print(f"Total filas: {cur.rowcount if cur.rowcount > 0 else 'Unknown'}")
for row in cur.fetchall():
    print(row)

cur.close()
conn.close()
