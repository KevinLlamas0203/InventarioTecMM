// ISC Inventory System - Main JavaScript

<<<<<<< HEAD
window.API_URL = window.API_URL || "http://127.0.0.1:5000";
let dashboardSnapshot = null;
=======
window.API_URL = window.API_URL || "https://inventariotsj.onrender.com";
>>>>>>> 9d0a63f8451116f54e65d19981dd92572a545eb5

function initGlobalApp() {
    if (window.__iscAppInitialized) return;
    window.__iscAppInitialized = true;

    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }
    
    // Logout functionality
    // Auto-detects depth: pages in /pagesAdmin/ go to ../login.html, root pages go to login.html
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Inyectar modal dinámicamente si no existe (solución global para Dashboard y otras páginas)
            let logoutModal = document.getElementById('logoutModal');
            
            if (!logoutModal) {
                const modalHTML = `
                    <div class="modal" id="logoutModal">
                        <div class="modal-overlay"></div>
                        <div class="modal-content" style="max-width: 400px;">
                            <div class="modal-header">
                                <h2>Cerrar Sesión</h2>
                                <button class="modal-close" aria-label="Cerrar modal">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path d="M18 6L6 18M6 6l12 12" stroke-width="2" stroke-linecap="round"/>
                                    </svg>
                                </button>
                            </div>
                            <div class="modal-body">
                                <p style="color: var(--color-text-secondary); margin-bottom: 2rem;">
                                    ¿Estás seguro de que deseas salir del sistema?
                                </p>
                                <div class="modal-actions">
                                    <button class="btn-secondary modal-cancel">Cancelar</button>
                                    <button class="btn-primary modal-confirm">Cerrar Sesión</button>
                                </div>
                            </div>
                        </div>
                    </div>`;
                
                document.body.insertAdjacentHTML('beforeend', modalHTML);
                logoutModal = document.getElementById('logoutModal');

                // Asignar eventos al nuevo modal
                const closeModal = () => logoutModal.classList.remove('active');
                
                logoutModal.querySelectorAll('.modal-close, .modal-overlay, .modal-cancel').forEach(el => el.addEventListener('click', closeModal));
                
                logoutModal.querySelector('.modal-confirm').addEventListener('click', () => {
                    const depth = window.location.pathname.split('/').filter(Boolean).length;
                    window.location.href = depth > 1 ? '../login.html' : 'login.html';
                });
            }
            
            logoutModal.classList.add('active');
        });
    }
    
    // Auto-hide alerts
    const alerts = document.querySelectorAll('.alert-item');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.style.opacity = '0';
            setTimeout(() => alert.remove(), 300);
        }, 5000);
    });
}


// Actualiza el badge de consumibles en el sidebar desde cualquier página
async function updateConsumiblesBadge() {
    try {
<<<<<<< HEAD
        const res = await fetch(`${window.API_URL}/consumibles`);
=======
        const res = await fetch('https://inventariotsj.onrender.com/consumibles');
>>>>>>> 9d0a63f8451116f54e65d19981dd92572a545eb5
        const data = await res.json();
        const bajo = data.filter(c => c.stock_actual <= c.stock_minimo * 1.5).length;
        
        const badge = document.getElementById('badge-bajo');
        if (badge) {
            badge.textContent = bajo;
            badge.style.display = bajo > 0 ? '' : 'none';
        }
    } catch (err) {
        console.warn('No se pudo actualizar badge consumibles:', err);
    }
}

// Actualiza el badge de activos en el sidebar desde cualquier página
async function updateActivosBadge() {
    try {
        const res = await fetch(`${window.API_URL}/activos`);
        const data = await res.json();
        const count = Array.isArray(data) ? data.length : (data.total || 0);
        const badge = document.getElementById('badge-activos');
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? '' : 'none';
        }
    } catch (err) {
        console.warn('No se pudo actualizar badge activos:', err);
    }
}

async function fetchJson(path) {
    const response = await fetch(`${window.API_URL}${path}`);
    if (!response.ok) {
        throw new Error(`Error ${response.status} cargando ${path}`);
    }
    return response.json();
}

function formatNumber(value) {
    return typeof value === 'number' ? value.toLocaleString('es-ES') : value;
}

function buildLegendItem(color, label, value) {
    return `
        <div class="legend-item">
            <span class="legend-dot" style="background: ${color};"></span>
            <span class="legend-label">${label}</span>
            <span class="legend-value">${value}</span>
        </div>`;
}

function drawDistributionChart(categories) {
    const canvas = document.getElementById('distributionChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.offsetWidth;
    const height = 200;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const total = categories.reduce((sum, item) => sum + item.count, 0);
    const padded = 24;
    const barWidth = Math.max(36, (width - padded * 2) / Math.max(categories.length, 1) - 14);
    const maxCount = Math.max(...categories.map(item => item.count), 1);

    categories.forEach((item, index) => {
        const x = padded + index * (barWidth + 14);
        const barHeight = (item.count / maxCount) * (height - 40);
        const y = height - barHeight - 24;
        const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#6C5CE7', '#00B894'];
        const color = colors[index % colors.length];

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 8);
        ctx.fill();

        ctx.fillStyle = 'var(--color-text-secondary)';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(item.label, x + barWidth / 2, height - 6);

        ctx.fillStyle = 'var(--color-text)';
        ctx.fillText(item.count, x + barWidth / 2, y - 10);
    });
}

function renderActivities(historial) {
    const container = document.getElementById('activityList');
    if (!container) return;

    container.innerHTML = '';
    if (!Array.isArray(historial) || historial.length === 0) {
        container.innerHTML = `
            <div class="activity-item">
                <div class="activity-content">
                    <span>No hay actividad reciente disponible.</span>
                </div>
            </div>`;
        return;
    }

    historial.slice(0, 4).forEach(item => {
        const title = item.accion || item.entidad || 'Actividad reciente';
        const description = item.detalle || item.descripcion || item.info || '';
        const dateText = item.fecha_accion ? new Date(item.fecha_accion).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : '';
        const iconClass = item.accion && item.accion.toLowerCase().includes('asign') ? 'assign' :
                          item.accion && item.accion.toLowerCase().includes('baja') ? 'warning' :
                          item.accion && item.accion.toLowerCase().includes('actualiz') ? 'update' : 'add';

        container.insertAdjacentHTML('beforeend', `
            <div class="activity-item">
                <div class="activity-icon ${iconClass}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        ${iconClass === 'assign' ? '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke-width="2"/><circle cx="9" cy="7" r="4" stroke-width="2"/>' :
                          iconClass === 'warning' ? '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke-width="2"/>' :
                          '<path d="M12 5v14M5 12h14" stroke-width="2" stroke-linecap="round"/>'}
                    </svg>
                </div>
                <div class="activity-content">
                    <p class="activity-title">${title}</p>
                    <p class="activity-description">${description || 'Sin descripción adicional.'}</p>
                    <span class="activity-time">${dateText}</span>
                </div>
            </div>`);
    });
}

function renderAlerts(reportes, prestamosStats, consumiblesCount) {
    const list = document.getElementById('alertsList');
    if (!list) return;

    const alerts = [
        {
            type: 'warning',
            icon: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke-width="2"/>',
            text: `${reportes.alertas_stock || 0} consumibles con stock bajo`
        },
        {
            type: 'info',
            icon: '<circle cx="12" cy="12" r="10" stroke-width="2"/><path d="M12 16v-4M12 8h.01" stroke-width="2" stroke-linecap="round"/>',
            text: `${prestamosStats.pendiente || 0} préstamos pendientes`
        },
        {
            type: 'success',
            icon: '<polyline points="20 6 9 17 4 12" stroke-width="2"/>',
            text: `${reportes.reportes_mes || 0} reportes generados este mes`
        }
    ];

    list.innerHTML = alerts.map(alert => `
        <div class="alert-item ${alert.type}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">${alert.icon}</svg>
            <span>${alert.text}</span>
        </div>`).join('');
}

async function loadDashboardData() {
    try {
        const [reportes, prestamosStats, asignaciones, activos, consumibles, historial] = await Promise.all([
            fetchJson('/reportes/stats'),
            fetchJson('/prestamos/stats'),
            fetchJson('/asignaciones'),
            fetchJson('/activos'),
            fetchJson('/consumibles'),
            fetchJson('/historial'),
        ]);

        const asignacionesTotal = Array.isArray(asignaciones) ? asignaciones.length : 0;
        const asignacionesActivas = Array.isArray(asignaciones)
            ? asignaciones.filter(a => a.estado && a.estado.toLowerCase() !== 'finalizada').length
            : 0;
        const activosList = Array.isArray(activos) ? activos : [];
        const consumiblesList = Array.isArray(consumibles) ? consumibles : [];
        const historialList = Array.isArray(historial) ? historial : [];

        document.getElementById('stat-activos').textContent = formatNumber(reportes.total_activos ?? activosList.length);
        const diferenciaActivos = reportes.diferencia_mes || 0;
        document.getElementById('stat-activos-change').textContent = diferenciaActivos >= 0
            ? `+${formatNumber(diferenciaActivos)} este mes`
            : `${formatNumber(diferenciaActivos)} este mes`;

        document.getElementById('stat-consumibles').textContent = formatNumber(consumiblesList.length);
        document.getElementById('stat-consumibles-change').textContent = `Último inventario actualizado`;

        document.getElementById('stat-stock-bajo').textContent = formatNumber(reportes.alertas_stock ?? 0);
        document.getElementById('stat-stock-bajo-text').textContent = (reportes.alertas_stock ?? 0) > 0
            ? 'Requieren reposición urgente'
            : 'Todo el stock está en rango seguro';

        document.getElementById('stat-asignaciones').textContent = formatNumber(asignacionesTotal);
        document.getElementById('stat-asignaciones-change').textContent = `${formatNumber(asignacionesActivas)} activas`;

        const categories = activosList.reduce((acc, activo) => {
            const label = activo.categoria || 'Sin categoría';
            const existing = acc.find(item => item.label === label);
            if (existing) existing.count += 1;
            else acc.push({ label, count: 1 });
            return acc;
        }, []).sort((a, b) => b.count - a.count).slice(0, 5);

        const legend = document.getElementById('distributionLegend');
        if (legend) {
            legend.innerHTML = categories.map((item, index) => buildLegendItem(
                ['#FF6B6B', '#4ECDC4', '#FFE66D', '#6C5CE7', '#00B894'][index % 5],
                item.label,
                `${Math.round((item.count / activos.length) * 100)}%`
            )).join('');
        }

        drawDistributionChart(categories);
        renderActivities(historialList);
        renderAlerts(reportes, prestamosStats, consumiblesList.length);
    } catch (error) {
        console.error('Error cargando datos del dashboard:', error);
    }
}

function setDashboardText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function getSettledValue(results, index, fallback) {
    const result = results[index];
    return result && result.status === 'fulfilled' ? result.value : fallback;
}

function buildDistribution(activosList, mode = 'categoria') {
    const keyMap = { categoria: 'categoria', estado: 'estado', ubicacion: 'ubicacion' };
    const key = keyMap[mode] || 'categoria';
    return activosList.reduce((acc, activo) => {
        const label = activo[key] || `Sin ${key}`;
        const found = acc.find(item => item.label === label);
        if (found) found.count += 1;
        else acc.push({ label, count: 1 });
        return acc;
    }, []).sort((a, b) => b.count - a.count).slice(0, 6);
}

function drawDistributionChart(categories) {
    const canvas = document.getElementById('distributionChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.offsetWidth || 420;
    const height = 200;
    const dpr = window.devicePixelRatio || 1;
    const styles = getComputedStyle(document.documentElement);
    const textColor = styles.getPropertyValue('--color-text').trim() || '#fff';
    const mutedColor = styles.getPropertyValue('--color-text-secondary').trim() || '#aaa';
    const colors = ['#1E3A5F', '#1F6B4A', '#B7791F', '#2563EB', '#475268', '#64748B'];
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const total = categories.reduce((sum, item) => sum + item.count, 0);
    if (!total) {
        ctx.fillStyle = mutedColor;
        ctx.font = '14px DM Sans, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Sin datos disponibles', width / 2, height / 2);
        return;
    }
    const padded = 26;
    const gap = 14;
    const barWidth = Math.max(34, Math.min(72, (width - padded * 2) / Math.max(categories.length, 1) - gap));
    const maxCount = Math.max(...categories.map(item => item.count), 1);
    categories.forEach((item, index) => {
        const x = padded + index * (barWidth + gap);
        const barHeight = Math.max(10, (item.count / maxCount) * (height - 58));
        const y = height - barHeight - 32;
        ctx.fillStyle = colors[index % colors.length];
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(x, y, barWidth, barHeight, 8);
        } else {
            ctx.rect(x, y, barWidth, barHeight);
        }
        ctx.fill();
        ctx.fillStyle = mutedColor;
        ctx.font = '12px DM Sans, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(item.label).slice(0, 12), x + barWidth / 2, height - 8);
        ctx.fillStyle = textColor;
        ctx.font = '700 12px DM Sans, sans-serif';
        ctx.fillText(item.count, x + barWidth / 2, y - 10);
    });
}

function updateDashboardDistribution() {
    if (!dashboardSnapshot) return;
    const mode = document.getElementById('distributionMode')?.value || 'categoria';
    const categories = buildDistribution(dashboardSnapshot.activos, mode);
    const total = categories.reduce((sum, item) => sum + item.count, 0);
    const colors = ['#1E3A5F', '#1F6B4A', '#B7791F', '#2563EB', '#475268', '#64748B'];
    const legend = document.getElementById('distributionLegend');
    if (legend) {
        legend.innerHTML = categories.length
            ? categories.map((item, index) => buildLegendItem(colors[index % colors.length], item.label, `${item.count} (${Math.round((item.count / Math.max(total, 1)) * 100)}%)`)).join('')
            : '<div class="legend-empty">Sin activos registrados</div>';
    }
    drawDistributionChart(categories);
}

function renderAlerts(reportes, prestamosStats, consumiblesList, activosList, asignacionesList) {
    const list = document.getElementById('alertsList');
    if (!list) return;
    const stockBajo = reportes.alertas_stock ?? consumiblesList.filter(c => Number(c.stock_actual || 0) <= Number(c.stock_minimo || 0) * 1.5).length;
    const pendientes = prestamosStats.pendiente || prestamosStats.Pendiente || 0;
    const mantenimiento = activosList.filter(a => (a.estado || '').toLowerCase().includes('mantenimiento')).length;
    const vencidas = asignacionesList.filter(a => (a.estado || '').toLowerCase() === 'vencida').length;
    const alerts = [
        { type: stockBajo > 0 ? 'warning' : 'success', icon: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke-width="2"/>', text: `${stockBajo} consumibles con stock bajo` },
        { type: pendientes > 0 ? 'info' : 'success', icon: '<circle cx="12" cy="12" r="10" stroke-width="2"/><path d="M12 16v-4M12 8h.01" stroke-width="2" stroke-linecap="round"/>', text: `${pendientes} prestamos pendientes` },
        { type: 'success', icon: '<polyline points="20 6 9 17 4 12" stroke-width="2"/>', text: `${reportes.reportes_mes || 0} reportes generados este mes` },
        { type: mantenimiento > 0 ? 'warning' : 'success', icon: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.4 2.4-3-3 2.4-2.4z" stroke-width="2"/>', text: `${mantenimiento} activos en mantenimiento` },
        { type: vencidas > 0 ? 'warning' : 'info', icon: '<circle cx="12" cy="12" r="10" stroke-width="2"/><polyline points="12 6 12 12 16 14" stroke-width="2"/>', text: `${vencidas} asignaciones vencidas` }
    ];
    list.innerHTML = alerts.map(alert => `<div class="alert-item ${alert.type}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor">${alert.icon}</svg><span>${alert.text}</span></div>`).join('');
}

async function loadDashboardData() {
    setDashboardText('dashboard-date', new Date().toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }));
    setDashboardText('dashboard-health', 'Sincronizando informacion...');
    try {
        const settled = await Promise.allSettled([fetchJson('/reportes/stats'), fetchJson('/prestamos/stats'), fetchJson('/asignaciones'), fetchJson('/activos'), fetchJson('/consumibles'), fetchJson('/historial')]);
        const reportes = getSettledValue(settled, 0, {});
        const prestamosStats = getSettledValue(settled, 1, {});
        const asignacionesList = Array.isArray(getSettledValue(settled, 2, [])) ? getSettledValue(settled, 2, []) : [];
        const activosList = Array.isArray(getSettledValue(settled, 3, [])) ? getSettledValue(settled, 3, []) : [];
        const consumiblesList = Array.isArray(getSettledValue(settled, 4, [])) ? getSettledValue(settled, 4, []) : [];
        const historialList = Array.isArray(getSettledValue(settled, 5, [])) ? getSettledValue(settled, 5, []) : [];
        const asignacionesActivas = asignacionesList.filter(a => (a.estado || '').toLowerCase() !== 'finalizada').length;
        const disponibles = activosList.filter(a => (a.estado || '').toLowerCase() === 'disponible').length;
        const enUso = activosList.filter(a => (a.estado || '').toLowerCase() === 'en uso').length;
        const mantenimiento = activosList.filter(a => (a.estado || '').toLowerCase().includes('mantenimiento')).length;
        const stockBajo = reportes.alertas_stock ?? consumiblesList.filter(c => Number(c.stock_actual || 0) <= Number(c.stock_minimo || 0) * 1.5).length;
        const prestamosPendientes = prestamosStats.pendiente || prestamosStats.Pendiente || 0;
        dashboardSnapshot = { reportes, prestamosStats, activos: activosList, consumibles: consumiblesList, asignaciones: asignacionesList, historial: historialList, disponibles, enUso, mantenimiento, stockBajo, asignacionesActivas, prestamosPendientes };
        const diferenciaActivos = reportes.diferencia_mes || 0;
        setDashboardText('stat-activos', formatNumber(reportes.total_activos ?? activosList.length));
        setDashboardText('stat-activos-change', diferenciaActivos >= 0 ? `+${formatNumber(diferenciaActivos)} este mes` : `${formatNumber(diferenciaActivos)} este mes`);
        setDashboardText('stat-consumibles', formatNumber(consumiblesList.length));
        setDashboardText('stat-consumibles-change', `${formatNumber(consumiblesList.length)} insumos registrados`);
        setDashboardText('stat-stock-bajo', formatNumber(stockBajo));
        setDashboardText('stat-stock-bajo-text', stockBajo > 0 ? 'Requieren reposicion urgente' : 'Stock dentro de rango');
        setDashboardText('stat-asignaciones', formatNumber(asignacionesList.length));
        setDashboardText('stat-asignaciones-change', `${formatNumber(asignacionesActivas)} activas`);
        setDashboardText('stat-disponibles', formatNumber(disponibles));
        setDashboardText('stat-en-uso', formatNumber(enUso));
        setDashboardText('stat-mantenimiento', formatNumber(mantenimiento));
        setDashboardText('stat-prestamos-pendientes', formatNumber(prestamosPendientes));
        updateDashboardDistribution();
        renderActivities(historialList);
        renderAlerts(reportes, prestamosStats, consumiblesList, activosList, asignacionesList);
        const failures = settled.filter(item => item.status === 'rejected').length;
        setDashboardText('dashboard-health', failures ? `Datos parciales: ${failures} fuente(s) sin conexion` : 'Informacion actualizada correctamente');
    } catch (error) {
        console.error('Error cargando datos del dashboard:', error);
        setDashboardText('dashboard-health', 'No se pudo actualizar el panel');
        showToast('No se pudo actualizar el dashboard.', 'error');
    }
}

function exportDashboardSnapshot() {
    if (!dashboardSnapshot) return showToast('Aun no hay datos del dashboard para exportar.', 'warning');
    const rows = [['Indicador', 'Valor'], ['Total activos', dashboardSnapshot.activos.length], ['Activos disponibles', dashboardSnapshot.disponibles], ['Activos en uso', dashboardSnapshot.enUso], ['Activos en mantenimiento', dashboardSnapshot.mantenimiento], ['Consumibles', dashboardSnapshot.consumibles.length], ['Stock bajo', dashboardSnapshot.stockBajo], ['Asignaciones', dashboardSnapshot.asignaciones.length], ['Asignaciones activas', dashboardSnapshot.asignacionesActivas], ['Prestamos pendientes', dashboardSnapshot.prestamosPendientes]];
    const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dashboard-inventario-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Resumen del dashboard exportado.', 'success');
}

function bindDashboardActions() {
    const root = document.querySelector('.dashboard-redesign');
    if (!root || root.dataset.bound === 'true') return;
    root.dataset.bound = 'true';
    document.getElementById('btnRefreshDashboard')?.addEventListener('click', loadDashboardData);
    document.getElementById('btnExportDashboard')?.addEventListener('click', exportDashboardSnapshot);
    document.getElementById('btnDashboardNewAsset')?.addEventListener('click', () => { window.location.href = 'ModuloActivo.html'; });
    document.getElementById('distributionMode')?.addEventListener('change', updateDashboardDistribution);
    document.getElementById('btnViewAllActivity')?.addEventListener('click', () => { window.location.href = 'auditoria.html'; });
    document.getElementById('btnViewAlerts')?.addEventListener('click', () => document.getElementById('alertsList')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    root.querySelectorAll('.action-btn[data-href]').forEach(button => button.addEventListener('click', () => { window.location.href = button.dataset.href; }));
}

// Ejecutar al cargar la página
updateConsumiblesBadge();
updateActivosBadge();

function initPageFeatures() {
    const pageRoot = document.querySelector('#tab-content') || document.querySelector('.main-content');
    if (!pageRoot) return;

    // Select all checkbox functionality
    const selectAllCheckbox = pageRoot.querySelector('thead .table-checkbox');
    const rowCheckboxes = pageRoot.querySelectorAll('tbody .table-checkbox');
    
    if (selectAllCheckbox && !selectAllCheckbox.dataset.iscInit) {
        selectAllCheckbox.dataset.iscInit = 'true';
        selectAllCheckbox.addEventListener('change', function() {
            rowCheckboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
            });
        });
    }
    
    rowCheckboxes.forEach(checkbox => {
        if (checkbox.dataset.iscInit) return;
        checkbox.dataset.iscInit = 'true';
        checkbox.addEventListener('change', function() {
            const allChecked = Array.from(rowCheckboxes).every(cb => cb.checked);
            const someChecked = Array.from(rowCheckboxes).some(cb => cb.checked);
            
            if (selectAllCheckbox) {
                selectAllCheckbox.checked = allChecked;
                selectAllCheckbox.indeterminate = someChecked && !allChecked;
            }
        });
    });
    
    // Search input functionality
    const searchInput = pageRoot.querySelector('.search-input');
    if (searchInput && !searchInput.dataset.iscInit) {
        searchInput.dataset.iscInit = 'true';
        searchInput.addEventListener('input', debounce(function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const tableRows = pageRoot.querySelectorAll('tbody tr');
            
            tableRows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        }, 300));
    }
    
    // Filter functionality
    const filterSelects = pageRoot.querySelectorAll('.filter-select');
    filterSelects.forEach(select => {
        if (select.dataset.iscInit) return;
        select.dataset.iscInit = 'true';
        select.addEventListener('change', function() {
            applyFilters();
        });
    });
}

function initApp() {
    initGlobalApp();
    initPageFeatures();
    if (document.querySelector('.dashboard-page') && document.getElementById('stat-activos')) {
        bindDashboardActions();
        loadDashboardData();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Debounce function for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Apply filters function
function applyFilters() {
    const pageRoot = document.querySelector('#tab-content') || document.querySelector('.main-content');
    if (!pageRoot) return;

    const categoryFilter = pageRoot.querySelector('.filter-select:nth-of-type(1)');
    const statusFilter = pageRoot.querySelector('.filter-select:nth-of-type(2)');
    const tableRows = pageRoot.querySelectorAll('tbody tr');
    
    if (!categoryFilter || !statusFilter) return;
    
    const category = categoryFilter.value;
    const status = statusFilter.value;
    
    tableRows.forEach(row => {
        const rowCategory = row.querySelector('.badge')?.textContent?.trim() || '';
        const statusSelect = row.querySelector('.status-select');
        const rowStatus = statusSelect ? statusSelect.value.trim() : row.querySelector('.status')?.textContent?.trim() || '';
        
        const categoryMatch = !category || rowCategory === category;
        const statusMatch = !status || rowStatus === status;
        
        row.style.display = (categoryMatch && statusMatch) ? '' : 'none';
    });
}

// Toast notification function
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Add icon based on type
    const icons = {
        'info': 'ℹ️',
        'success': '✓',
        'warning': '⚠️',
        'error': '✕'
    };
    
    const icon = icons[type] || icons.info;
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    
    document.body.appendChild(toast);
    
    // Determine duration based on type (longer for errors)
    const duration = (type === 'error' || type === 'warning') ? 5000 : 3000;
    
    setTimeout(() => toast.classList.add('show'), 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Export data function
function exportData(format = 'excel') {
    showToast(`Exportando datos en formato ${format.toUpperCase()}...`, 'info');
    
    // Simulate export delay
    setTimeout(() => {
        showToast(`Datos exportados correctamente`, 'success');
    }, 1500);
}

// Confirm delete function
function confirmDelete(itemName) {
    return confirm(`¿Estás seguro de que deseas eliminar "${itemName}"? Esta acción no se puede deshacer.`);
}

// Movimiento modal functions
function openMovementModal() {
    const modal = document.getElementById('movementModal');
    const form = document.getElementById('movementForm');
    if (!modal || !form) return;
    form.reset();
    modal.classList.add('active');
}

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        const modal = document.getElementById('movementModal');
        if (modal && modal.classList.contains('active')) {
            closeMovementModal();
        }
    }
});

function closeMovementModal() {
    const modal = document.getElementById('movementModal');
    if (!modal) return;
    modal.classList.remove('active');
}

function handleMovementForm(event) {
    event.preventDefault();
    const asset = document.getElementById('movementAsset')?.value.trim();
    const type = document.getElementById('movementType')?.value.trim();
    const employee = document.getElementById('movementEmployee')?.value.trim();
    const origin = document.getElementById('movementOrigin')?.value.trim();
    const destination = document.getElementById('movementDestination')?.value.trim();
    const notes = document.getElementById('movementNotes')?.value.trim();
    if (!asset || !type || !employee || !origin || !destination) {
        showToast('Completa los campos requeridos antes de guardar.', 'warning');
        return;
    }

    const now = new Date();
    const formattedDate = now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const formattedTime = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const badgeClass = {
        'Mantenimiento': 'badge-mantenimiento',
        'Asignación': 'badge-asignacion',
        'Devolución': 'badge-devolucion',
        'Transferencia': 'badge-transferencia',
        'Alta': 'badge-alta',
        'Baja': 'badge-baja'
    }[type] || 'badge-transferencia';

    const codePrefix = asset.match(/\b([A-Z])/)?.[1] || 'ACT';
    const assetCode = `${codePrefix}${now.getFullYear().toString().slice(-2)}-${Math.floor(Math.random() * 900 + 100)}`;
    const tableBody = document.querySelector('.table-wrapper tbody');
    if (tableBody) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
              <div class="date-main">${formattedDate}</div>
              <div class="date-time">${formattedTime}</div>
            </td>
            <td>
              <div class="asset-name">${asset}</div>
              <div class="asset-code">${assetCode}</div>
            </td>
            <td>
              <span class="badge ${badgeClass}">${type}</span>
            </td>
            <td>
              <div class="mov-row">
                <div class="mov-origin">${origin}<small>${employee}</small></div>
                <span class="mov-arrow">→</span>
                <div class="mov-dest">${destination}</div>
              </div>
            </td>
            <td><div class="notes">${notes}</div></td>
        `;
        tableBody.prepend(row);
    }

    const results = document.querySelector('.results-count');
    if (results) {
        const match = results.textContent.match(/Mostrando\s+(\d+)\s+de\s+(\d+)\s+movimientos/);
        if (match) {
            const total = parseInt(match[2], 10) + 1;
            results.textContent = `Mostrando ${total} de ${total} movimientos`;
        }
    }

    const totalCard = document.querySelector('.stats-grid .stat-card .stat-value');
    if (totalCard) {
        const currentTotal = parseInt(totalCard.textContent.replace(/\D/g, ''), 10);
        if (!isNaN(currentTotal)) {
            totalCard.textContent = currentTotal + 1;
        }
    }

    closeMovementModal();
    showToast('Movimiento registrado correctamente', 'success');
}

// Format date function
function formatDate(date) {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    return new Date(date).toLocaleDateString('es-MX', options);
}

// Generate ID function (for demonstration)
function generateAssetId(category) {
    const prefix = {
        'Hardware': 'HW',
        'Software': 'SW',
        'Infraestructura': 'INF'
    };
    
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return `${prefix[category] || 'AST'}-${year}-${random}`;
}

// Animation on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe cards and stats on page load
document.addEventListener('DOMContentLoaded', function() {
    const animatedElements = document.querySelectorAll('.card, .stat-card');
    
    animatedElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = `all 0.5s ease ${index * 0.1}s`;
        observer.observe(el);
    });
});

function cambiarTab(tab) {
    const frame = document.getElementById("frameContenido");
    const tabs = document.querySelectorAll(".tab");

    tabs.forEach(t => t.classList.remove("active"));

    if (tab === "catalogo") {
        frame.src = "activos.html";
        tabs[0].classList.add("active");
    }

    if (tab === "movimientos") {
        frame.src = "movimientos.html"; // crear después
        tabs[1].classList.add("active");
    }

    if (tab === "resguardos") {
        frame.src = "asignaciones.html";
        tabs[2].classList.add("active");
    }
}

// Cross-module synchronization functions
async function refreshActivosTable() {
    if (typeof cargarActivos === 'function') {
        await cargarActivos();
    }
}

async function refreshMovimientosTable() {
    if (typeof fetchMovimientos === 'function') {
        await fetchMovimientos();
    }
}

async function refreshAsignacionesTable() {
    if (typeof fetchAssignments === 'function') {
        await fetchAssignments();
    }
}

// Expose functions globally for cross-module access
window.refreshActivosTable = refreshActivosTable;
window.refreshMovimientosTable = refreshMovimientosTable;
window.refreshAsignacionesTable = refreshAsignacionesTable;
