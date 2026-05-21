import os
from pathlib import Path
import psycopg2
from dotenv import load_dotenv

base_dir = Path(__file__).resolve().parent
load_dotenv(base_dir / '.env')

DATABASE_URL = os.getenv('DATABASE_URL')
print('DATABASE_URL=', DATABASE_URL)

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name")
tables = [row[0] for row in cur.fetchall()]
print('tables=', tables)
for name in ['asignaciones','asignacion','asignations','movimientos','activos','usuarios','ubicaciones','estados']:
    if name in tables:
        print('has', name)
cur.execute("SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('asignaciones','movimientos','activos','usuarios','ubicaciones','estados') ORDER BY table_name, ordinal_position")
for row in cur.fetchall():
    print(row)
cur.close()
conn.close()
