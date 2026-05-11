// js/control-nivel.js
window.addEventListener('DOMContentLoaded', function() {
    const nivel = localStorage.getItem('nivel_usuario');
    
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