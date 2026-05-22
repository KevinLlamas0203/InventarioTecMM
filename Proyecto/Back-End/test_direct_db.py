import psycopg2
import json
from datetime import datetime, timedelta

# Simular crear un préstamo directamente sin HTTP
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def test_create_prestamo():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # Generar folio
        cur.execute("SELECT folio FROM prestamos ORDER BY id DESC LIMIT 1")
        row = cur.fetchone()
        if row:
            try:
                num = int(row[0].replace('P-', '')) + 1
            except:
                num = 1
        else:
            num = 1
        folio = f"P-{str(num).zfill(3)}"
        
        # Datos para insertar
        solicitante = "Test User"
        alumnos = 2
        docente = "Prof Test"
        lab = "Lab Test"
        inicio = datetime.now()
        fin = datetime.now() + timedelta(hours=2)
        items = json.dumps([{"tipo": "Activo", "nombre": "Computadora", "cantidad": 1}])
        notas = "Test"
        estado = "Pendiente"
        
        print(f"Intentando insertar préstamo con folio: {folio}")
        print(f"Datos: {solicitante}, {alumnos}, {docente}, {lab}, {inicio}, {fin}")
        
        cur.execute("""
            INSERT INTO prestamos
                (folio, solicitante, alumnos, docente, lab, inicio, fin, items, notas, estado, creado_en)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            RETURNING id
        """, (
            folio, solicitante, alumnos, docente, lab,
            inicio, fin,
            items,
            notas, estado
        ))
        
        nuevo_id = cur.fetchone()[0]
        conn.commit()
        
        print(f"✅ Préstamo creado exitosamente con ID: {nuevo_id}")
        
        # Verificar que se guardó
        cur.execute("SELECT * FROM prestamos WHERE id = %s", (nuevo_id,))
        result = cur.fetchone()
        print(f"Verificación: {result}")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_create_prestamo()
