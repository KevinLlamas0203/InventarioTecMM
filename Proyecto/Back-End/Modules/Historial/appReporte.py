from flask import Flask
from createReporte import create_reporte_bp
from readReporte   import read_reporte_bp
from updateReporte import update_reporte_bp
from deleteReporte import delete_reporte_bp

app = Flask(__name__)
app.register_blueprint(create_reporte_bp)
app.register_blueprint(read_reporte_bp)
app.register_blueprint(update_reporte_bp)
app.register_blueprint(delete_reporte_bp)

if __name__ == "__main__":
    app.run(debug=True)