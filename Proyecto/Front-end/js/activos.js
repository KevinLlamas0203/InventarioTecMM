function getApiUrl() {
    return window.API_URL || "http://127.0.0.1:5000";
}

const PER_PAGE = 8;
const ALLOWED_STATES = ['Disponible', 'En uso', 'Mantenimiento', 'Dado de baja'];
const STATUS_CLASSES = {
    Disponible: 'status-available',
    'En uso': 'status-inuse',
    Mantenimiento: 'status-maintenance',
    'Dado de baja': 'status-retired'
};
const CATEGORY_CLASSES = {
    Hardware: 'badge-hardware',
    Software: 'badge-software',
    Infraestructura: 'badge-infrastructure'
};

let paginaActual = 1;
let activosCache = [];
let filteredActivos = [];
let assetKeydownBound = false;
let pendingAssetPayload = null;
let assetCatalogs = {
    categorias: [],
    estados: ALLOWED_STATES,
    ubicaciones: [],
    usuarios: []
};

function initActivosPage() {
    const pageRoot = getPageRoot();
    if (!pageRoot || pageRoot.dataset.activosInitialized === 'true') return;
    pageRoot.dataset.activosInitialized = 'true';

    bindAssetForm();
    bindNuevoActivoButton();
    bindActionDelegation();
    bindFilterEvents();
    bindModalCloseShortcuts();
    setTodayIfEmpty();
    cargarActivos();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initActivosPage);
} else {
    initActivosPage();
}

function getPageRoot() {
    return document.querySelector('.activos-page');
}

function notify(message, type = 'info') {
    if (typeof showToast === 'function') {
        showToast(message, type);
        return;
    }
    alert(message);
}

async function fetchJson(path, options = {}) {
    const res = await fetch(`${getApiUrl()}${path}`, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.message || data.mensaje || data.detalle || 'Solicitud no completada');
    return data;
}

function bindAssetForm() {
    const form = document.getElementById('assetForm');
    if (!form || form.dataset.assetFormBound === 'true') return;
    form.dataset.assetFormBound = 'true';

    form.addEventListener('input', () => clearFormError());
    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const payload = obtenerDatosFormulario();
        const validation = validateAssetPayload(payload);
        if (!validation.ok) {
            showFormError(validation.message, validation.field);
            return;
        }

        const id = document.getElementById('activoId').value;
        if (!id) {
            openAssetConfirmModal(payload);
            return;
        }
        await submitAsset(id, payload);
    });
}

function bindNuevoActivoButton() {
    const nuevoBtn = document.getElementById('btnNuevoActivo');
    if (!nuevoBtn || nuevoBtn.dataset.assetButtonBound === 'true') return;
    nuevoBtn.dataset.assetButtonBound = 'true';
    nuevoBtn.addEventListener('click', () => openModal('crear'));
}

function bindModalCloseShortcuts() {
    if (assetKeydownBound) return;
    assetKeydownBound = true;
    document.addEventListener('keydown', event => {
        if (event.key !== 'Escape') return;
        const detailModal = document.getElementById('detailModal');
        const assetModal = document.getElementById('assetModal');
        const confirmModal = document.getElementById('confirmAssetModal');
        if (confirmModal?.classList.contains('active')) {
            closeAssetConfirmModal();
            return;
        }
        if (detailModal?.classList.contains('active')) closeDetailModal();
        if (assetModal?.classList.contains('active')) closeModal();
    });
}

function bindFilterEvents() {
    const pageRoot = getPageRoot();
    if (!pageRoot || pageRoot.dataset.assetFiltersBound === 'true') return;
    pageRoot.dataset.assetFiltersBound = 'true';

    const search = pageRoot.querySelector('.search-input');
    const category = pageRoot.querySelector('#filtroCategoria');
    const status = pageRoot.querySelector('#filtroEstado');
    const clearButton = pageRoot.querySelector('#btnLimpiarFiltros');
    const printButton = pageRoot.querySelector('#btnImprimirActivos');

    search?.addEventListener('input', debounce(() => applyAssetFilters(), 220));
    category?.addEventListener('change', () => applyAssetFilters());
    status?.addEventListener('change', () => applyAssetFilters());
    clearButton?.addEventListener('click', () => clearAssetFilters());
    printButton?.addEventListener('click', () => window.print());
}

function bindActionDelegation() {
    const tbody = getPageRoot()?.querySelector('.data-table tbody');
    if (!tbody || tbody.dataset.assetDelegationBound === 'true') return;
    tbody.dataset.assetDelegationBound = 'true';

    tbody.addEventListener('click', event => {
        const button = event.target.closest('[data-action]');
        if (!button) return;
        event.preventDefault();

        const { action, id } = button.dataset;
        if (action === 'view') verActivo(id);
        if (action === 'edit') abrirEditar(id);
        if (action === 'delete') eliminarActivo(id);
    });

    tbody.addEventListener('change', event => {
        const select = event.target.closest('.status-select');
        if (!select) return;
        cambiarEstadoRapido(select.dataset.id, select.value, select);
    });
}

async function cargarActivos(resetPagina = true) {
    setTableLoading(true);
    try {
        const [activos] = await Promise.all([fetchJson('/activos'), loadAssetCatalogs()]);
        activosCache = Array.isArray(activos) ? activos : [];
        populateSelects();
        applyAssetFilters(resetPagina);
    } catch (err) {
        console.error('Error al cargar activos:', err);
        renderEmptyState(err.message || 'No se pudo cargar la lista de activos.');
        notify(err.message || 'No se pudo cargar la lista de activos.', 'error');
    } finally {
        setTableLoading(false);
    }
}

async function loadAssetCatalogs() {
    try {
        const data = await fetchJson('/activos/catalogos');
        assetCatalogs = {
            categorias: mergeUnique([], data.categorias || []),
            estados: mergeUnique(ALLOWED_STATES, data.estados || []),
            ubicaciones: mergeUnique([], data.ubicaciones || []),
            usuarios: Array.isArray(data.usuarios) ? data.usuarios : []
        };
    } catch (error) {
        console.warn('No se pudieron cargar catalogos de activos:', error);
    }
}

function populateSelects() {
    const pageRoot = getPageRoot();
    setOptions(pageRoot?.querySelector('#filtroCategoria'), assetCatalogs.categorias, 'Todas las categorias');
    setOptions(pageRoot?.querySelector('#filtroEstado'), assetCatalogs.estados, 'Todos los estados');
    setOptions(document.getElementById('inputCategoria'), assetCatalogs.categorias, 'Seleccionar categoria');
    setOptions(document.getElementById('inputEstado'), ALLOWED_STATES, 'Seleccionar estado');
    setOptions(document.getElementById('inputUbicacion'), assetCatalogs.ubicaciones, 'Seleccionar ubicacion');

    const inputAsignadoA = document.getElementById('inputAsignadoA');
    if (inputAsignadoA) {
        const current = inputAsignadoA.value;
        inputAsignadoA.innerHTML = '';
        inputAsignadoA.appendChild(new Option('No asignado', ''));
        assetCatalogs.usuarios.forEach(user => {
            const nombreCompleto = user.nombre_completo ?? user.correo_electronico ?? '';
            const correo = user.correo_electronico ?? '';
            const label = correo ? `${nombreCompleto} (${correo})` : nombreCompleto;
            const value = nombreCompleto || correo;
            if (value) inputAsignadoA.appendChild(new Option(label, value));
        });
        inputAsignadoA.value = current;
    }
}

function setOptions(select, values, placeholder) {
    if (!select) return;
    const current = select.value;
    select.innerHTML = '';
    select.appendChild(new Option(placeholder, ''));
    values.filter(Boolean).forEach(value => select.appendChild(new Option(value, value)));
    if (values.includes(current)) select.value = current;
}

function setDatalistOptions(listId, values) {
    const dataList = document.getElementById(listId);
    if (!dataList) return;
    const normalizedOptions = (values || [])
        .map(item => typeof item === 'string' ? { value: item, label: item } : item)
        .filter(opt => opt && (opt.value || opt.label));

    const uniqueKeys = new Map();
    normalizedOptions.forEach(opt => {
        const key = String(opt.value || opt.label).trim();
        if (!uniqueKeys.has(key)) {
            uniqueKeys.set(key, opt);
        }
    });

    dataList.innerHTML = '';
    Array.from(uniqueKeys.values())
        .sort((a, b) => String(a.label || a.value).localeCompare(String(b.label || b.value), 'es', { sensitivity: 'base' }))
        .forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            if (opt.label && opt.label !== opt.value) {
                option.label = opt.label;
            }
            dataList.appendChild(option);
        });
}

function applyAssetFilters(resetPagina = true) {
    const pageRoot = getPageRoot();
    const searchTerm = normalize(pageRoot?.querySelector('.search-input')?.value);
    const category = pageRoot?.querySelector('#filtroCategoria')?.value || '';
    const status = pageRoot?.querySelector('#filtroEstado')?.value || '';

    filteredActivos = activosCache.filter(asset => {
        const haystack = normalize([
            asset.activo_id,
            asset.nombre,
            asset.descripcion,
            asset.categoria,
            asset.estado,
            asset.ubicacion,
            asset.asignado_a,
            asset.fecha_alta
        ].join(' '));
        return (!searchTerm || haystack.includes(searchTerm))
            && (!category || asset.categoria === category)
            && (!status || asset.estado === status);
    });

    if (resetPagina) paginaActual = 1;
    renderPagina();
    updateSummary();
}

function clearAssetFilters() {
    const pageRoot = getPageRoot();
    const search = pageRoot?.querySelector('.search-input');
    const category = pageRoot?.querySelector('#filtroCategoria');
    const status = pageRoot?.querySelector('#filtroEstado');
    if (search) search.value = '';
    if (category) category.value = '';
    if (status) status.value = '';
    applyAssetFilters(true);
}

function renderPagina() {
    const totalRows = filteredActivos.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / PER_PAGE));
    paginaActual = Math.min(paginaActual, totalPages);

    const start = (paginaActual - 1) * PER_PAGE;
    const end = Math.min(start + PER_PAGE, totalRows);
    const slice = filteredActivos.slice(start, end);
    const tbody = getPageRoot()?.querySelector('.data-table tbody');
    if (!tbody) return;

    if (!slice.length) {
        tbody.innerHTML = `<tr><td colspan="9" class="empty-cell">No hay activos con los filtros actuales</td></tr>`;
    } else {
        tbody.innerHTML = slice.map(renderAssetRow).join('');
    }

    const infoEl = getPageRoot()?.querySelector('.table-info');
    if (infoEl) {
        const dispStart = totalRows === 0 ? 0 : start + 1;
        infoEl.innerHTML = `Mostrando <strong>${dispStart}-${end}</strong> de <strong>${totalRows}</strong> activos`;
    }

    renderPaginacionControles(totalPages);
}

function renderAssetRow(asset) {
    const categoryClass = CATEGORY_CLASSES[asset.categoria] || 'badge-hardware';
    const statusClass = STATUS_CLASSES[asset.estado] || 'status-available';
    const fechaMostrar = formatDate(asset.fecha_alta);

    return `
        <tr>
            <td><input type="checkbox" class="table-checkbox" aria-label="Seleccionar activo ${escapeHtml(asset.nombre)}"></td>
            <td><span class="asset-id">#${asset.activo_id}</span></td>
            <td>
                <div class="asset-info">
                    <span class="asset-name">${escapeHtml(asset.nombre)}</span>
                    <span class="asset-specs">${escapeHtml(asset.descripcion) || '-'}</span>
                </div>
            </td>
            <td><span class="badge ${categoryClass}">${escapeHtml(asset.categoria) || '-'}</span></td>
            <td>
                <select class="status-select ${statusClass}" data-id="${asset.activo_id}" aria-label="Estado de ${escapeHtml(asset.nombre)}">
                    ${ALLOWED_STATES.map(state => `<option value="${state}" ${asset.estado === state ? 'selected' : ''}>${state}</option>`).join('')}
                </select>
            </td>
            <td>${escapeHtml(asset.ubicacion) || '-'}</td>
            <td>${escapeHtml(asset.asignado_a) || 'Sin asignar'}</td>
            <td>${fechaMostrar}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action" title="Ver detalles" data-action="view" data-id="${asset.activo_id}">${iconEye()}</button>
                    <button class="btn-action" title="Editar" data-action="edit" data-id="${asset.activo_id}">${iconEdit()}</button>
                    <button class="btn-action danger" title="Eliminar" data-action="delete" data-id="${asset.activo_id}">${iconTrash()}</button>
                </div>
            </td>
        </tr>`;
}

function renderPaginacionControles(totalPages) {
    const container = getPageRoot()?.querySelector('.pagination');
    if (!container) return;

    let html = `
        <button class="pagination-btn" type="button" onclick="irPagina(${paginaActual - 1})" ${paginaActual === 1 ? 'disabled' : ''}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="15 18 9 12 15 6" stroke-width="2"/></svg>
        </button>`;

    const start = Math.max(1, Math.min(paginaActual - 2, Math.max(1, totalPages - 4)));
    const end = Math.min(totalPages, start + 4);
    for (let i = start; i <= end; i++) {
        html += `<button class="pagination-btn ${i === paginaActual ? 'active' : ''}" type="button" onclick="irPagina(${i})">${i}</button>`;
    }

    html += `
        <button class="pagination-btn" type="button" onclick="irPagina(${paginaActual + 1})" ${paginaActual === totalPages ? 'disabled' : ''}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="9 18 15 12 9 6" stroke-width="2"/></svg>
        </button>`;
    container.innerHTML = html;
}

function irPagina(page) {
    const totalPages = Math.max(1, Math.ceil(filteredActivos.length / PER_PAGE));
    if (page < 1 || page > totalPages) return;
    paginaActual = page;
    renderPagina();
}

async function submitAsset(id, payload) {
    const button = document.getElementById('btnGuardar');
    const confirmButton = document.getElementById('btnConfirmAsset');
    setButtonLoading(button, true);
    setButtonLoading(confirmButton, true);
    try {
        const data = await fetchJson(id ? `/activos/${id}` : '/activos', {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        closeAssetConfirmModal();
        closeModal();
        await Promise.all([
            cargarActivos(),
            refreshRelatedMovimientos(),
            refreshRelatedAsignaciones()
        ]);
        notify(id ? data.mensaje : `Activo creado con ID: ${data.activo_id}`, 'success');
    } catch (err) {
        console.error(err);
        closeAssetConfirmModal();
        showFormError(err.message || 'Error de conexion con el servidor');
    } finally {
        setButtonLoading(button, false);
        setButtonLoading(confirmButton, false);
    }
}

async function refreshRelatedAsignaciones() {
    if (typeof window.refreshAsignacionesTable === 'function') {
        return window.refreshAsignacionesTable();
    }
    if (typeof window.fetchAssignments === 'function') {
        return window.fetchAssignments();
    }
    return Promise.resolve();
}

async function cambiarEstadoRapido(id, nuevoEstado, selectElement) {
    const previousValue = activosCache.find(asset => String(asset.activo_id) === String(id))?.estado;
    try {
        const currentAsset = await fetchJson(`/activos/${id}`);
        currentAsset.estado = nuevoEstado;
        if (['Disponible', 'Dado de baja'].includes(nuevoEstado)) {
            currentAsset.asignado_a = null;
        }
        currentAsset.tipo_movimiento = 'Cambio de Estado';
        currentAsset.observaciones = `Cambio rapido de estado a ${nuevoEstado}`;

        await fetchJson(`/activos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentAsset)
        });

        selectElement.className = `status-select ${STATUS_CLASSES[nuevoEstado] || 'status-available'}`;
        await Promise.all([cargarActivos(false), refreshRelatedMovimientos(), refreshRelatedAsignaciones()]);
        notify(`Estado actualizado: ${previousValue} → ${nuevoEstado}`, 'success');
    } catch (err) {
        console.error(err);
        if (previousValue) selectElement.value = previousValue;
        selectElement.className = `status-select ${STATUS_CLASSES[previousValue] || 'status-available'}`;
        notify(err.message || 'Error al cambiar estado.', 'error');
    }
}

async function abrirEditar(activoId) {
    try {
        const asset = await fetchJson(`/activos/${activoId}`);
        await loadAssetCatalogs();
        populateSelects();
        setFormValue('activoId', asset.activo_id);
        setFormValue('activoIdDisplay', `#${asset.activo_id}`);
        setFormValue('inputNombre', asset.nombre);
        setFormValue('inputCategoria', asset.categoria);
        setFormValue('inputEstado', asset.estado);
        setFormValue('inputDescripcion', asset.descripcion);
        setFormValue('inputUbicacion', asset.ubicacion);
        setFormValue('inputAsignadoA', asset.asignado_a);
        setFormValue('inputFechaAlta', asset.fecha_alta);
        openModal('editar');
    } catch (err) {
        console.error(err);
        notify(err.message || 'Error al cargar el activo', 'error');
    }
}

async function eliminarActivo(activoId) {
    if (!confirm(`Eliminar el activo #${activoId}? Esta accion no se puede deshacer.`)) return;
    try {
        const data = await fetchJson(`/activos/${activoId}`, { method: 'DELETE' });
        await Promise.all([cargarActivos(), refreshRelatedMovimientos()]);
        notify(data.mensaje || 'Activo eliminado correctamente', 'success');
    } catch (err) {
        console.error(err);
        notify(err.message || 'No se pudo eliminar el activo', 'error');
    }
}

async function verActivo(activoId) {
    try {
        const asset = await fetchJson(`/activos/${activoId}`);
        const categoryClass = CATEGORY_CLASSES[asset.categoria] || 'badge-hardware';
        const statusClass = STATUS_CLASSES[asset.estado] || 'status-available';

        setText('detailActivoId', `#${asset.activo_id}`);
        setText('detailNombre', asset.nombre || '-');
        setText('detailDescripcion', asset.descripcion || '-');
        setText('detailUbicacion', asset.ubicacion || '-');
        setText('detailAsignado', asset.asignado_a || 'Sin asignar');
        setText('detailFecha', formatDate(asset.fecha_alta));

        const detailCategoria = document.getElementById('detailCategoria');
        const detailEstado = document.getElementById('detailEstado');
        if (detailCategoria) {
            detailCategoria.textContent = asset.categoria || '-';
            detailCategoria.className = `badge ${categoryClass}`;
        }
        if (detailEstado) {
            detailEstado.textContent = asset.estado || '-';
            detailEstado.className = `badge ${statusClass}`;
        }

        const editButton = document.getElementById('detailBtnEditar');
        if (editButton) {
            editButton.onclick = () => {
                closeDetailModal();
                abrirEditar(asset.activo_id);
            };
        }

        const detailModal = document.getElementById('detailModal');
        detailModal?.classList.add('active');
    } catch (err) {
        console.error(err);
        notify(err.message || 'Error al obtener detalle del activo', 'error');
    }
}

function openModal(mode = 'crear') {
    const modal = document.getElementById('assetModal');
    if (!modal) return;
    clearFormError();

    const title = modal.querySelector('.modal-header h2');
    const button = modal.querySelector('#btnGuardar');
    if (mode === 'crear') {
        title.textContent = 'Registrar Nuevo Activo';
        button.textContent = 'Guardar Activo';
        limpiarFormulario();
        setTodayIfEmpty();
    } else {
        title.textContent = 'Editar Activo';
        button.textContent = 'Actualizar Activo';
    }

    modal.classList.add('active');
    setTimeout(() => document.getElementById('inputNombre')?.focus(), 80);
}

function openAssetConfirmModal(payload) {
    pendingAssetPayload = payload;
    setText('confirmAssetName', payload.nombre || '-');
    setText('confirmAssetCategory', payload.categoria || '-');
    setText('confirmAssetStatus', payload.estado || '-');
    setText('confirmAssetLocation', payload.ubicacion || '-');
    setText('confirmAssetAssigned', payload.asignado_a || 'Sin asignar');
    setText('confirmAssetDate', formatDate(payload.fecha_alta));
    document.getElementById('confirmAssetModal')?.classList.add('active');
}

function closeAssetConfirmModal() {
    document.getElementById('confirmAssetModal')?.classList.remove('active');
    pendingAssetPayload = null;
}

async function confirmAssetCreation() {
    if (!pendingAssetPayload) return;
    await submitAsset('', pendingAssetPayload);
}

function closeModal() {
    const modal = document.getElementById('assetModal');
    if (!modal) return;
    closeAssetConfirmModal();
    modal.classList.remove('active');
    limpiarFormulario();
}

function closeDetailModal() {
    document.getElementById('detailModal')?.classList.remove('active');
}

function limpiarFormulario() {
    document.getElementById('assetForm')?.reset();
    setFormValue('activoId', '');
    clearFormError();
}

function obtenerDatosFormulario() {
    return {
        nombre: getValue('inputNombre'),
        descripcion: getValue('inputDescripcion') || null,
        categoria: getValue('inputCategoria'),
        estado: getValue('inputEstado'),
        ubicacion: getValue('inputUbicacion'),
        asignado_a: getValue('inputAsignadoA') || null,
        fecha_alta: getValue('inputFechaAlta') || null
    };
}

function validateAssetPayload(payload) {
    if (!payload.nombre || payload.nombre.length < 3) {
        return { ok: false, field: 'inputNombre', message: 'El nombre debe tener al menos 3 caracteres.' };
    }
    if (payload.nombre.length > 120) {
        return { ok: false, field: 'inputNombre', message: 'El nombre no puede superar 120 caracteres.' };
    }
    if (!payload.categoria) {
        return { ok: false, field: 'inputCategoria', message: 'Selecciona una categoria.' };
    }
    if (!ALLOWED_STATES.includes(payload.estado)) {
        return { ok: false, field: 'inputEstado', message: 'Selecciona un estado valido.' };
    }
    if (!payload.ubicacion) {
        return { ok: false, field: 'inputUbicacion', message: 'Selecciona una ubicacion.' };
    }
    if (!payload.fecha_alta) {
        return { ok: false, field: 'inputFechaAlta', message: 'Selecciona la fecha de alta.' };
    }
    const selectedDate = new Date(payload.fecha_alta);
    const today = new Date();
    selectedDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    if (selectedDate > today) {
        return { ok: false, field: 'inputFechaAlta', message: 'La fecha de alta no puede ser futura.' };
    }
    if (payload.descripcion && payload.descripcion.length > 500) {
        return { ok: false, field: 'inputDescripcion', message: 'Las especificaciones no pueden superar 500 caracteres.' };
    }
    return { ok: true };
}

function showFormError(message, fieldId) {
    const form = document.getElementById('assetForm');
    if (!form) return notify(message, 'warning');

    let error = form.querySelector('.form-error-message');
    if (!error) {
        error = document.createElement('div');
        error.className = 'form-error-message';
        form.prepend(error);
    }
    error.textContent = message;

    if (fieldId) {
        const field = document.getElementById(fieldId);
        field?.classList.add('field-invalid');
        field?.focus();
    }
}

function clearFormError() {
    document.querySelector('#assetForm .form-error-message')?.remove();
    document.querySelectorAll('#assetForm .field-invalid').forEach(field => field.classList.remove('field-invalid'));
}

function updateSummary() {
    const total = activosCache.length;
    const available = activosCache.filter(a => a.estado === 'Disponible').length;
    const inUse = activosCache.filter(a => a.estado === 'En uso').length;
    const maintenance = activosCache.filter(a => a.estado === 'Mantenimiento').length;
    setText('assetSummaryTotal', total);
    setText('assetSummaryAvailable', available);
    setText('assetSummaryInUse', inUse);
    setText('assetSummaryMaintenance', maintenance);
}

function setTableLoading(isLoading) {
    const table = getPageRoot()?.querySelector('.table-card');
    const tbody = getPageRoot()?.querySelector('.data-table tbody');
    
    table?.classList.toggle('is-loading', isLoading);
    
    if (isLoading && tbody) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-cell">Cargando activos...</td></tr>';
    }
}

function renderEmptyState(message) {
    const tbody = getPageRoot()?.querySelector('.data-table tbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="9" class="empty-cell">${escapeHtml(message)}</td></tr>`;
}

function setButtonLoading(button, isLoading) {
    if (!button) return;
    button.disabled = isLoading;
    button.classList.toggle('loading', isLoading);
}

function setTodayIfEmpty() {
    const date = document.getElementById('inputFechaAlta');
    if (date && !date.value) date.valueAsDate = new Date();
}

function refreshRelatedMovimientos() {
    if (typeof window.refreshMovimientosTable === 'function') {
        return window.refreshMovimientosTable();
    }
    if (typeof fetchMovimientos === 'function') return fetchMovimientos();
    return Promise.resolve();
}

function getValue(id) {
    return document.getElementById(id)?.value.trim() ?? '';
}

function setFormValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value ?? '';
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value ?? '-';
}

function normalize(value) {
    return (value || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function mergeUnique(defaults, values) {
    return Array.from(new Set([...(defaults || []), ...(values || [])].filter(Boolean))).sort();
}

function formatDate(value) {
    if (!value) return '-';
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function iconEye() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke-width="2"/><circle cx="12" cy="12" r="3" stroke-width="2"/></svg>`;
}

function iconEdit() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke-width="2"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="2"/></svg>`;
}

function iconTrash() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="3 6 5 6 21 6" stroke-width="2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke-width="2"/></svg>`;
}

window.openModal = openModal;
window.closeModal = closeModal;
window.closeAssetConfirmModal = closeAssetConfirmModal;
window.confirmAssetCreation = confirmAssetCreation;
window.closeDetailModal = closeDetailModal;
window.verActivo = verActivo;
window.abrirEditar = abrirEditar;
window.eliminarActivo = eliminarActivo;
window.irPagina = irPagina;
window.cambiarEstadoRapido = cambiarEstadoRapido;
window.initActivosPage = initActivosPage;
window.cargarActivos = cargarActivos;
