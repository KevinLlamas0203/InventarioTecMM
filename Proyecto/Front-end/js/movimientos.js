function getApiUrl() {
    return window.API_URL || "http://127.0.0.1:5000";
}

async function fetchJson(path, options = {}) {
    const response = await fetch(`${getApiUrl()}${path}`, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error || data.message || data.mensaje || data.detalle || `Error consultando ${path}`);
    }
    return data;
}

let movimientosCache = [];
let movimientosFiltrados = [];
let movementKeydownBound = false;
let isMovementSubmitting = false;
let movementPage = 1;
let movementPageSize = 25;

async function initMovimientosPage() {
    const pageRoot = document.querySelector('.movimientos-page');
    if (!pageRoot || pageRoot.dataset.movimientosInitialized === 'true') return;
    pageRoot.dataset.movimientosInitialized = 'true';

    bindMovementForm();
    bindMovementFilters();
    bindMovementKeyboardClose();
    await Promise.all([refreshMovementFormOptions(), populateMovementFilters()]);
    await fetchMovimientos();
}

function notify(message, type = 'success') {
    if (typeof showToast === 'function') {
        showToast(message, type);
        return;
    }
    alert(message);
}

async function refreshMovementFormOptions() {
    await Promise.all([
        populateAssetSelect(),
        populateEmployeeSelect(),
        populateLocationSelect(),
        populateTypeSelect(),
        populateStateSelect()
    ]);
}

async function populateEmployeeSelect() {
    const select = document.getElementById('movementEmployee');
    if (!select) return;
    const current = select.value;
    select.innerHTML = '<option value="">Sin empleado</option>';

    try {
        const users = await fetchJson('/movimientos/usuarios');
        users.forEach(user => {
            const value = user.nombre_completo || user.correo_electronico;
            if (!value) return;
            select.appendChild(new Option(value, value));
        });
        select.value = current;
    } catch (error) {
        console.error('Error cargando empleados para movimientos:', error);
    }
}

async function populateLocationSelect() {
    const originSelect = document.getElementById('movementOrigin');
    const destinationSelect = document.getElementById('movementDestination');
    if (!originSelect || !destinationSelect) return;

    const currentOrigin = originSelect.value;
    const currentDestination = destinationSelect.value;
    originSelect.innerHTML = '<option value="">Sin origen</option>';
    destinationSelect.innerHTML = '<option value="">Seleccione destino</option>';

    try {
        const locations = await fetchJson('/movimientos/ubicaciones');
        locations.forEach(location => {
            if (!location.nombre) return;
            originSelect.appendChild(new Option(location.nombre, location.nombre));
            destinationSelect.appendChild(new Option(location.nombre, location.nombre));
        });
        originSelect.value = currentOrigin;
        destinationSelect.value = currentDestination;
    } catch (error) {
        console.error('Error cargando ubicaciones para movimientos:', error);
    }
}

async function populateTypeSelect() {
    const select = document.getElementById('movementType');
    if (!select) return;
    const current = select.value;
    select.innerHTML = '<option value="">Seleccione tipo de movimiento</option>';

    try {
        const tipos = await fetchJson('/movimientos/tipo_movimientos');
        tipos.forEach(tipo => {
            select.appendChild(new Option(tipo.nombre, tipo.id));
        });
        select.value = current;
    } catch (error) {
        console.error('Error cargando tipos de movimiento:', error);
    }
}

async function populateStateSelect() {
    const select = document.getElementById('movementState');
    if (!select) return;
    const current = select.value;
    select.innerHTML = '<option value="">Seleccione estado final</option>';

    try {
        const estados = await fetchJson('/movimientos/estados');
        estados.forEach(estado => {
            select.appendChild(new Option(estado.nombre, estado.id));
        });
        select.value = current;
    } catch (error) {
        console.error('Error cargando estados para movimientos:', error);
    }
}

async function populateAssetSelect() {
    const select = document.getElementById('movementAsset');
    if (!select) return;
    const current = select.value;
    select.innerHTML = '<option value="">Seleccione un activo</option>';

    try {
        const activos = await fetchJson('/activos');
        activos.forEach(activo => {
            select.appendChild(new Option(`${activo.nombre} (#${activo.activo_id})`, activo.activo_id));
        });
        select.value = current;
    } catch (error) {
        console.error('Error cargando activos para movimientos:', error);
    }
}

async function fetchMovimientos() {
    const pageRoot = document.querySelector('.movimientos-page');
    if (!pageRoot) return;

    try {
        const data = await fetchJson(buildMovementQuery());
        movimientosCache = Array.isArray(data) ? data : [];
        movimientosFiltrados = movimientosCache;
        movementPage = 1;
        applyMovementFilters(false);
        updateStats(movimientosCache);
    } catch (error) {
        console.error('Error cargando movimientos:', error);
        movimientosCache = [];
        renderMovimientos([]);
        updateStats([]);
        notify(error.message || 'No se pudieron cargar los movimientos', 'warning');
    }
}

function renderMovimientos(movimientos) {
    const pageRoot = document.querySelector('.movimientos-page');
    const tbody = pageRoot?.querySelector('.table-wrapper tbody');
    if (!tbody) return;

    if (!movimientos.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;opacity:.6;">No se encontraron movimientos registrados</td></tr>`;
        return;
    }

    tbody.innerHTML = movimientos.map(m => {
        const date = m.fecha_movimiento ? new Date(m.fecha_movimiento) : null;
        const fecha = date && !Number.isNaN(date.getTime())
            ? date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : '-';
        const hora = date && !Number.isNaN(date.getTime())
            ? date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
            : '';
        const tipoClass = getMovementBadgeClass(m.tipo_movimiento);
        const empleado = m.empleado || 'Sin empleado';
        const ubicacion = m.ubicacion || 'Sin ubicacion';

        return `
            <tr>
                <td>
                    <div class="date-main">${fecha}</div>
                    <div class="date-time">${hora}</div>
                </td>
                <td>
                    <div class="asset-name">${escapeHtml(m.activo_nombre || 'Activo desconocido')}</div>
                    <div class="asset-code">ACT-${escapeHtml(m.activo_id || '-')}</div>
                </td>
                <td><span class="badge ${tipoClass}">${escapeHtml(m.tipo_movimiento || '-')}</span></td>
                <td>${escapeHtml(m.estado_final || '-')}</td>
                <td>
                    <div class="mov-row">
                        <div class="mov-origin">${escapeHtml(ubicacion)}<small>${escapeHtml(empleado)}</small></div>
                    </div>
                </td>
                <td><div class="notes">${escapeHtml(m.observaciones || '-')}</div></td>
            </tr>`;
    }).join('');
}

function renderMovementPage() {
    const total = movimientosFiltrados.length;
    const totalPages = Math.max(1, Math.ceil(total / movementPageSize));
    movementPage = Math.min(Math.max(1, movementPage), totalPages);
    const start = (movementPage - 1) * movementPageSize;
    const visible = movimientosFiltrados.slice(start, start + movementPageSize);
    renderMovimientos(visible);

    const results = document.querySelector('.movimientos-page .results-count');
    if (results) {
        const from = total === 0 ? 0 : start + 1;
        const to = Math.min(start + movementPageSize, total);
        results.textContent = `Mostrando ${from}-${to} de ${total} movimientos filtrados (${movimientosCache.length} cargados)`;
    }

    const pageInfo = document.getElementById('movementPageInfo');
    const prev = document.getElementById('movementPrevPage');
    const next = document.getElementById('movementNextPage');
    if (pageInfo) pageInfo.textContent = `Pagina ${movementPage} de ${totalPages}`;
    if (prev) prev.disabled = movementPage <= 1;
    if (next) next.disabled = movementPage >= totalPages;
}

function getMovementBadgeClass(tipo) {
    const normalized = normalize(tipo);
    if (normalized.includes('mantenimiento')) return 'badge-mantenimiento';
    if (normalized.includes('asignacion')) return 'badge-asignacion';
    if (normalized.includes('devolucion')) return 'badge-devolucion';
    if (normalized.includes('alta')) return 'badge-alta';
    if (normalized.includes('baja')) return 'badge-baja';
    return 'badge-transferencia';
}

function updateStats(movimientos) {
    const pageRoot = document.querySelector('.movimientos-page');
    const totalCount = movimientos.length;
    const now = new Date();
    const monthCount = movimientos.filter(m => {
        const date = new Date(m.fecha_movimiento);
        return !Number.isNaN(date.getTime()) && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;
    const assignmentCount = movimientos.filter(m => normalize(m.tipo_movimiento).includes('asignacion')).length;
    const maintenanceCount = movimientos.filter(m => normalize(m.tipo_movimiento).includes('mantenimiento')).length;

    const totalEl = pageRoot?.querySelector('.stat-card.blue .stat-value');
    const monthEl = pageRoot?.querySelector('.stat-card.green .stat-value');
    const assignEl = pageRoot?.querySelector('.stat-card.purple .stat-value');
    const maintenanceEl = pageRoot?.querySelector('.stat-card.orange .stat-value');
    if (totalEl) totalEl.textContent = totalCount;
    if (monthEl) monthEl.textContent = monthCount;
    if (assignEl) assignEl.textContent = assignmentCount;
    if (maintenanceEl) maintenanceEl.textContent = maintenanceCount;
}

function bindMovementFilters() {
    const pageRoot = document.querySelector('.movimientos-page');
    if (!pageRoot || pageRoot.dataset.movementFiltersBound === 'true') return;
    pageRoot.dataset.movementFiltersBound = 'true';

    pageRoot.querySelector('#movementAssetFilter')?.addEventListener('change', () => fetchMovimientos());
    pageRoot.querySelector('#movementTypeFilter')?.addEventListener('change', () => fetchMovimientos());
    pageRoot.querySelector('#movementEmployeeFilter')?.addEventListener('change', () => fetchMovimientos());
    pageRoot.querySelector('#movementDateFrom')?.addEventListener('change', () => fetchMovimientos());
    pageRoot.querySelector('#movementDateTo')?.addEventListener('change', () => fetchMovimientos());
    pageRoot.querySelector('#movementPageSize')?.addEventListener('change', event => {
        movementPageSize = parseInt(event.target.value, 10) || 25;
        movementPage = 1;
        renderMovementPage();
    });
    pageRoot.querySelector('#movementPrevPage')?.addEventListener('click', () => {
        movementPage -= 1;
        renderMovementPage();
    });
    pageRoot.querySelector('#movementNextPage')?.addEventListener('click', () => {
        movementPage += 1;
        renderMovementPage();
    });
    pageRoot.querySelector('#exportMovements')?.addEventListener('click', exportFilteredMovements);
    pageRoot.querySelector('#importMovements')?.addEventListener('click', () => document.getElementById('movementImportFile')?.click());
    pageRoot.querySelector('#movementImportFile')?.addEventListener('change', importMovementsFromFile);
    pageRoot.querySelector('#clearMovementFilters')?.addEventListener('click', () => {
        ['movementAssetFilter', 'movementTypeFilter', 'movementEmployeeFilter', 'movementDateFrom', 'movementDateTo'].forEach(id => {
            const input = document.getElementById(id);
            if (input) input.value = '';
        });
        fetchMovimientos();
    });
}

async function populateMovementFilters() {
    await Promise.all([populateMovementAssetFilter(), populateMovementTypeFilter(), populateMovementEmployeeFilter()]);
}

async function populateMovementAssetFilter() {
    const select = document.getElementById('movementAssetFilter');
    if (!select) return;
    const current = select.value;
    select.innerHTML = '<option value="">Todos los activos</option>';
    try {
        const activos = await fetchJson('/activos');
        activos.forEach(activo => select.appendChild(new Option(`${activo.nombre} (#${activo.activo_id})`, activo.activo_id)));
        select.value = current;
    } catch (error) {
        console.error('Error cargando filtro de activos:', error);
    }
}

async function populateMovementTypeFilter() {
    const select = document.getElementById('movementTypeFilter');
    if (!select) return;
    const current = select.value;
    select.innerHTML = '<option value="">Todos los tipos</option>';
    try {
        const tipos = await fetchJson('/movimientos/tipo_movimientos');
        tipos.forEach(tipo => select.appendChild(new Option(tipo.nombre, tipo.id)));
        select.value = current;
    } catch (error) {
        console.error('Error cargando filtro de tipos:', error);
    }
}

async function populateMovementEmployeeFilter() {
    const select = document.getElementById('movementEmployeeFilter');
    if (!select) return;
    const current = select.value;
    select.innerHTML = '<option value="">Todos los empleados</option>';
    try {
        const users = await fetchJson('/movimientos/usuarios');
        users.forEach(user => {
            const value = user.nombre_completo || user.correo_electronico;
            if (value) select.appendChild(new Option(value, value));
        });
        select.value = current;
    } catch (error) {
        console.error('Error cargando filtro de empleados:', error);
    }
}

function setFilterOptions(id, values, placeholder) {
    const select = document.getElementById(id);
    if (!select) return;
    const current = select.value;
    const unique = Array.from(new Set(values)).sort();
    select.innerHTML = `<option value="">${placeholder}</option>`;
    unique.forEach(value => select.appendChild(new Option(value, value)));
    if (unique.includes(current)) select.value = current;
}

function buildMovementQuery() {
    const params = new URLSearchParams();
    const asset = document.getElementById('movementAssetFilter')?.value || '';
    const type = document.getElementById('movementTypeFilter')?.value || '';
    const employee = document.getElementById('movementEmployeeFilter')?.value || '';
    const dateFrom = document.getElementById('movementDateFrom')?.value || '';
    const dateTo = document.getElementById('movementDateTo')?.value || '';
    if (asset) params.set('activo_id', asset);
    if (type) params.set('tipo_movimiento', type);
    if (employee) params.set('empleado', employee);
    if (dateFrom) params.set('fecha_desde', dateFrom);
    if (dateTo) params.set('fecha_hasta', dateTo);
    const query = params.toString();
    return query ? `/movimientos?${query}` : '/movimientos';
}

function applyMovementFilters(resetPage = true) {
    const assetFilter = document.getElementById('movementAssetFilter');
    const assetText = assetFilter?.selectedOptions?.[0]?.textContent?.replace(/\s+\(#\d+\)$/, '') || '';
    const typeFilter = document.getElementById('movementTypeFilter');
    const typeText = typeFilter?.selectedOptions?.[0]?.textContent || '';
    const employee = document.getElementById('movementEmployeeFilter')?.value || '';
    const dateFrom = document.getElementById('movementDateFrom')?.value || '';
    const dateTo = document.getElementById('movementDateTo')?.value || '';
    const filtered = movimientosCache.filter(m => {
        const date = m.fecha_movimiento ? new Date(m.fecha_movimiento) : null;
        const dateOk = !date || Number.isNaN(date.getTime()) ? (!dateFrom && !dateTo) : (
            (!dateFrom || date >= new Date(`${dateFrom}T00:00:00`))
            && (!dateTo || date <= new Date(`${dateTo}T23:59:59`))
        );
        return (!assetText || assetText === 'Todos los activos' || m.activo_nombre === assetText)
            && (!typeText || typeText === 'Todos los tipos' || m.tipo_movimiento === typeText)
            && (!employee || m.empleado === employee)
            && dateOk;
    });
    movimientosFiltrados = filtered;
    if (resetPage) movementPage = 1;
    renderMovementPage();
}

function exportFilteredMovements() {
    const rows = [
        ['id_movimiento', 'fecha_movimiento', 'activo_id', 'activo_nombre', 'tipo_movimiento', 'estado_final', 'empleado', 'ubicacion', 'observaciones'],
        ...movimientosFiltrados.map(m => [
            m.id_movimiento || '',
            m.fecha_movimiento || '',
            m.activo_id || '',
            m.activo_nombre || '',
            m.tipo_movimiento || '',
            m.estado_final || '',
            m.empleado || '',
            m.ubicacion || '',
            m.observaciones || ''
        ])
    ];
    const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `movimientos-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notify('Movimientos exportados correctamente', 'success');
}

async function importMovementsFromFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
        const text = await file.text();
        const rows = parseCsv(text);
        if (rows.length < 2) {
            notify('El archivo no contiene movimientos para importar.', 'warning');
            return;
        }
        const headers = rows[0].map(h => normalizeHeader(h));
        const required = ['activo_id', 'tipo_movimiento', 'estado', 'ubicacion'];
        const missing = required.filter(name => !headers.includes(name));
        if (missing.length) {
            notify(`Faltan columnas obligatorias: ${missing.join(', ')}`, 'warning');
            return;
        }

        let imported = 0;
        for (const row of rows.slice(1)) {
            if (!row.some(Boolean)) continue;
            const record = Object.fromEntries(headers.map((header, index) => [header, row[index] || '']));
            await fetchJson('/movimientos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    activo_id: parseInt(record.activo_id, 10),
                    tipo_movimiento: record.tipo_movimiento,
                    estado: record.estado || record.estado_final,
                    empleado: record.empleado || null,
                    ubicacion: record.ubicacion,
                    observaciones: record.observaciones || null,
                    fecha_movimiento: record.fecha_movimiento || null
                })
            });
            imported += 1;
        }
        event.target.value = '';
        await fetchMovimientos();
        notify(`${imported} movimiento(s) importado(s) correctamente`, 'success');
    } catch (error) {
        console.error('Error importando movimientos:', error);
        notify(error.message || 'No se pudieron importar los movimientos', 'warning');
    }
}

function parseCsv(text) {
    const rows = [];
    let row = [];
    let current = '';
    let quoted = false;
    for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        const next = text[i + 1];
        if (char === '"' && quoted && next === '"') {
            current += '"';
            i += 1;
        } else if (char === '"') {
            quoted = !quoted;
        } else if (char === ',' && !quoted) {
            row.push(current.trim());
            current = '';
        } else if ((char === '\n' || char === '\r') && !quoted) {
            if (char === '\r' && next === '\n') i += 1;
            row.push(current.trim());
            rows.push(row);
            row = [];
            current = '';
        } else {
            current += char;
        }
    }
    row.push(current.trim());
    if (row.some(Boolean)) rows.push(row);
    return rows;
}

function normalizeHeader(header) {
    const normalized = normalize(header).replace(/\s+/g, '_');
    if (normalized === 'estado_final') return 'estado';
    return normalized;
}

function bindMovementForm() {
    const form = document.getElementById('movementForm');
    if (!form || form.dataset.movFormBound === 'true') return;
    form.dataset.movFormBound = 'true';

    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (isMovementSubmitting) return;

        const activoId = document.getElementById('movementAsset')?.value;
        const tipoMov = document.getElementById('movementType')?.value;
        const empleado = document.getElementById('movementEmployee')?.value;
        const estadoFinal = document.getElementById('movementState')?.value;
        const ubicacion = document.getElementById('movementDestination')?.value || document.getElementById('movementOrigin')?.value;
        const observaciones = document.getElementById('movementNotes')?.value.trim();
        const submitButton = form.querySelector('[type="submit"]');

        if (!activoId || !tipoMov || !estadoFinal || !ubicacion) {
            notify('Selecciona activo, tipo, estado final y destino.', 'warning');
            return;
        }

        isMovementSubmitting = true;
        if (submitButton) submitButton.disabled = true;

        try {
            await fetchJson('/movimientos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    activo_id: parseInt(activoId, 10),
                    tipo_movimiento: tipoMov,
                    estado: estadoFinal,
                    empleado: empleado || null,
                    ubicacion,
                    observaciones: observaciones || null
                })
            });

            await Promise.all([fetchMovimientos(), populateAssetSelect()]);
            if (typeof window.refreshActivosTable === 'function') await window.refreshActivosTable();
            if (typeof window.refreshAsignacionesTable === 'function') await window.refreshAsignacionesTable();
            form.reset();
            closeMovementModal();
            notify('Movimiento registrado correctamente', 'success');
        } catch (error) {
            console.error('Error guardando movimiento:', error);
            notify(error.message || 'Error al registrar movimiento', 'warning');
        } finally {
            isMovementSubmitting = false;
            if (submitButton) submitButton.disabled = false;
        }
    });
}

async function openMovementModal() {
    await refreshMovementFormOptions();
    const modal = document.getElementById('movementModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeMovementModal() {
    const modal = document.getElementById('movementModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function bindMovementKeyboardClose() {
    if (movementKeydownBound) return;
    movementKeydownBound = true;
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeMovementModal();
    });
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function normalize(text) {
    return (text || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

window.initMovimientosPage = initMovimientosPage;
window.openMovementModal = openMovementModal;
window.closeMovementModal = closeMovementModal;
window.fetchMovimientos = fetchMovimientos;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMovimientosPage);
} else {
    initMovimientosPage();
}
