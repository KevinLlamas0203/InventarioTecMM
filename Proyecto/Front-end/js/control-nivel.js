// js/control-nivel.js

window.addEventListener('DOMContentLoaded', function () {

    // ── 1. Leer usuario del localStorage ─────────────────────────────────────
    let usuario = null;
    let nivel   = null;

    try {
        const raw = localStorage.getItem('usuario');
        if (raw) {
            usuario = JSON.parse(raw);
            nivel   = String(usuario.nivel);
        }
    } catch (e) { /* JSON inválido */ }

    // ── 2. Cargar info del usuario en el sidebar (funciona en TODOS los HTML) ─
    //       Busca por clase, no por ID, así no hay que tocar cada archivo HTML
    if (usuario) {
        const NIVEL_MAP = { 1: 'Alumno', 2: 'Docente', 3: 'Administrativo' };

        const nombre   = usuario.nombre || 'Usuario';
        const rol      = NIVEL_MAP[Number(nivel)] || 'Sin rol';

        // Iniciales: primera letra nombre + primera letra apellido
        const partes   = nombre.trim().split(/\s+/);
        const iniciales = partes.length >= 2
            ? (partes[0][0] + partes[1][0]).toUpperCase()
            : nombre.substring(0, 2).toUpperCase();

        // Actualiza por clase → funciona en dashboard, activos, usuarios, etc.
        const elAvatar = document.querySelector('.user-avatar');
        const elNombre = document.querySelector('.user-name');
        const elRol    = document.querySelector('.user-role');

        if (elAvatar) elAvatar.textContent = iniciales;
        if (elNombre) elNombre.textContent = nombre;
        if (elRol)    elRol.textContent    = rol;
    }

    // ── 3. Control de acceso por nivel (data-nivel) ───────────────────────────
    if (!nivel) {
        console.log('Sin usuario logueado');
        return;
    }

    document.querySelectorAll('[data-nivel]').forEach(item => {
        const nivelesPermitidos = item.getAttribute('data-nivel').split(',');

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