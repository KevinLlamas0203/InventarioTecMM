import json
import requests

API = 'http://localhost:5000'

# Payload similar a lo que envía el frontend
payload = {
    "solicitante": "Test Usuario",
    "alumnos": 2,
    "docente": "Profesor Prueba",
    "lab": "Lab Test",
    "inicio": "2026-05-22T09:00",
    "fin": "2026-05-22T11:00",
    "items": [
        {"tipo": "Activo", "nombre": "Computadora", "cantidad": 2}
    ],
    "notas": "Test de prueba"
}

print("Enviando POST a /prestamos")
print("Payload:", json.dumps(payload, indent=2))

try:
    res = requests.post(
        f"{API}/prestamos",
        json=payload,
        headers={'Content-Type': 'application/json'}
    )
    print(f"\nStatus: {res.status_code}")
    print(f"Response: {res.json()}")
except Exception as e:
    print(f"Error: {e}")
