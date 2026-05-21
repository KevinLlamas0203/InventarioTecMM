// ── Sidebar / logout ──────────────────────────────────────────────────────────
document.querySelector('.sidebar-toggle').addEventListener('click', function () {
    document.querySelector('.sidebar').classList.toggle('collapsed');
});
document.querySelector('.logout-btn').addEventListener('click', function () {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        window.location.href = '../login.html';
    }
});

// ── generarReporte ────────────────────────────────────────────────────────────
async function generarReporte(nombre, formato) {

    // Detectar tipo según el nombre del reporte
    let tipo   = 'general';
    let extras = {};

    if (nombre.toLowerCase().includes('laboratorio')) {
        tipo = 'laboratorio';
        const labSel = document.getElementById('lab-select');
        extras.lab = labSel ? labSel.value : 'all';
    } else if (nombre.toLowerCase().includes('alerta')) {
        tipo = 'alertas';
        const umbral = document.getElementById('umbral-alertas');
        extras.umbral = umbral ? umbral.value : 'critico';
    } else {
        // general
        const rango = document.getElementById('rango-general');
        extras.rango = rango ? rango.value : 'todo';
    }

    // Payload para el backend
    const payload = {
        titulo:       nombre,
        tipo:         tipo,
        formato:      formato,
        generado_por: 'Admin ISC',
        fecha:        new Date().toISOString().slice(0, 10),
        ...extras
    };

    // Toast de inicio
    showToast(`Generando "${nombre}" en ${formato.toUpperCase()}…`, 'info');

    try {
        const res = await fetch('http://localhost:5000/reportes', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload)
        });

        if (!res.ok) {
            // Intentar leer el error del servidor
            const texto = await res.text();
            console.error('Error del servidor:', texto);
            throw new Error(`HTTP ${res.status} — ${texto.slice(0, 120)}`);
        }

        // Recibir como Blob y descargar
        const blob = await res.blob();
        const ext  = formato === 'excel' ? 'xlsx' : formato === 'csv' ? 'csv' : 'pdf';
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `reporte_${tipo}_${new Date().toISOString().slice(0, 10)}.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);

        showToast(`"${nombre}" descargado correctamente.`, 'success');
        agregarHistorial(nombre, formato);

    } catch (err) {
        console.error('[generarReporte]', err);
        showToast(`Error: ${err.message}`, 'error');
    }
}

// ── agregarHistorial ──────────────────────────────────────────────────────────
function agregarHistorial(nombre, formato) {
    const tbody    = document.getElementById('historialBody');
    const fmtClass = formato === 'pdf' ? 'badge-pdf'
                   : (formato === 'excel' || formato === 'xlsx') ? 'badge-xlsx'
                   : 'badge-csv';
    const fmtLabel = formato.toUpperCase().replace('EXCEL', 'XLSX');
    const ahora    = new Date().toLocaleString('es-MX', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><div class="asset-info">
            <span class="asset-name">${nombre}</span>
            <span class="asset-specs">Generado ahora</span>
        </div></td>
        <td>Admin ISC</td>
        <td>${ahora}</td>
        <td><span class="badge ${fmtClass}">${fmtLabel}</span></td>
        <td><span class="status status-available">Completado</span></td>
        <td><div class="action-buttons">
            <button class="btn-action" title="Descargar de nuevo"
                onclick="showToast('Vuelve a usar el botón principal para descargar.','info')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke-width="2"/>
                    <polyline points="7 10 12 15 17 10" stroke-width="2"/>
                    <line x1="12" y1="15" x2="12" y2="3" stroke-width="2"/>
                </svg>
            </button>
        </div></td>`;
    tbody.insertBefore(row, tbody.firstChild);
}

// ── limpiarHistorial ──────────────────────────────────────────────────────────
function limpiarHistorial() {
    if (confirm('¿Deseas limpiar todo el historial de descargas?')) {
        document.getElementById('historialBody').innerHTML =
            '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--color-text-secondary);">No hay reportes en el historial.</td></tr>';
        showToast('Historial limpiado.', 'info');
    }
}

// ── showToast ─────────────────────────────────────────────────────────────────
function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        container.style.cssText = 'position:fixed;bottom:24px;right:24px;display:flex;flex-direction:column;gap:8px;z-index:9999;';
        document.body.appendChild(container);
    }
    const colors = {
        info:    'var(--color-info)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error:   'var(--color-danger)'
    };
    const toast = document.createElement('div');
    toast.style.cssText = `background:var(--color-surface);border:1px solid var(--color-border);border-left:4px solid ${colors[type]||colors.info};padding:12px 18px;border-radius:8px;font-size:.9rem;box-shadow:var(--shadow-md);max-width:320px;opacity:0;transform:translateX(20px);transition:all .25s ease;`;
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = 'translateX(0)'; });
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}