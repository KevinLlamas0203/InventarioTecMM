// js/control-nivel.js
window.addEventListener('DOMContentLoaded', function() {

    // ── Leer nivel desde el objeto completo guardado en el login ──────────────
    let nivel = null;
    try {
        const raw = localStorage.getItem('usuario');
        if (raw) nivel = String(JSON.parse(raw).nivel);
    } catch (e) { /* JSON inválido */ }

    if (!nivel) {
        console.log('Sin usuario logueado');
        return;
    }

    // Busca todos los elementos con data-nivel
    document.querySelectorAll('[data-nivel]').forEach(item => {
        const nivelesPermitidos = item.getAttribute('data-nivel').split(',');

        // Si tu nivel NO está en los permitidos, deshabilita
        if (!nivelesPermitidos.includes(nivel)) {
            item.classList.add('bloqueado');
            item.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                alert('🔒 No tienes acceso a esta sección');
            };
        }
    });
});


        /* ── Cargar datos del usuario desde localStorage ── */
        (function () {
            const NIVEL_MAP = { 1: 'Alumno', 2: 'Docente', 3: 'Administrativo' };

            let usuario = null;

            // Intentar leer el usuario guardado en el login
            try {
                const raw = localStorage.getItem('usuario');
                if (raw) usuario = JSON.parse(raw);
            } catch (e) { /* nada */ }

            if (usuario) {
                const nombre = usuario.nombre || 'Usuario';
                const nivel  = usuario.nivel  || usuario.nivel_acceso;
                const rol    = NIVEL_MAP[Number(nivel)] || 'Sin rol';

                // Iniciales: primera letra del nombre + primera del apellido si existe
                const partes   = nombre.trim().split(/\s+/);
                const iniciales = partes.length >= 2
                    ? (partes[0][0] + partes[1][0]).toUpperCase()
                    : nombre.substring(0, 2).toUpperCase();

                document.getElementById('sidebar-avatar').textContent = iniciales;
                document.getElementById('sidebar-nombre').textContent = nombre;
                document.getElementById('sidebar-rol').textContent    = rol;
            }
        })();

        // Simple chart placeholder (in production, use Chart.js or similar)
        const canvas = document.getElementById('distributionChart');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            canvas.width = canvas.offsetWidth;
            canvas.height = 200;
            
            // Simple bar chart visualization
            ctx.fillStyle = '#FF6B6B';
            ctx.fillRect(50, 50, 60, 100);
            ctx.fillStyle = '#4ECDC4';
            ctx.fillRect(130, 70, 60, 80);
            ctx.fillStyle = '#FFE66D';
            ctx.fillRect(210, 90, 60, 60);
        }
