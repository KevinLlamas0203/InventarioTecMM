function getApiUrl() {
    return window.API_URL || "http://127.0.0.1:5000";
}

let assignmentsCache = [];
let currentExtendAssignmentId = null;
let assignmentKeydownBound = false;

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

async function initAsignacionesPage() {
    const pageRoot = document.querySelector('.asignaciones-page');
    if (!pageRoot) {
        return;
    }
    if (pageRoot.dataset.asignacionesInitialized === 'true') {
        return;
    }
    pageRoot.dataset.asignacionesInitialized = 'true';

    await Promise.all([
        populateUserSelect(),
        populateAssetSelect(),
        populateLocationSelect(),
        populateStateSelect(),
        fetchAssignments()
    ]);
    bindAssignmentForm();
    bindExtendForm();
    bindAssignmentFilters();
    bindModalCloseShortcuts();
}

function notify(message, type = 'success') {
    if (typeof showToast === 'function') {
        showToast(message, type);
        return;
    }
    alert(message);
}

async function populateUserSelect() {
    const select = document.getElementById('assignUser');
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = '<option value="">Seleccionar usuario</option>';

    try {
        const response = await fetch(`${getApiUrl()}/asignaciones/usuarios`);
        const users = await response.json();
        if (!response.ok) throw new Error(users.error || 'No se pudo cargar usuarios');

        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id_usuario;
            option.textContent = `${user.nombre_completo} ${user.correo_electronico ? `(${user.correo_electronico})` : ''}`;
            select.appendChild(option);
        });
        if (currentValue) select.value = currentValue;
    } catch (error) {
        console.error('Error cargando usuarios para asignaciones:', error);
    }
}

async function populateAssetSelect() {
    const select = document.getElementById('assignAsset');
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = '<option value="">Seleccionar activo</option>';

    try {
        const response = await fetch(`${getApiUrl()}/asignaciones/activos`);
        const activos = await response.json();
        if (!response.ok) throw new Error(activos.error || 'No se pudo cargar activos');

        activos.forEach(activo => {
            const option = document.createElement('option');
            option.value = activo.id_activo;
            option.textContent = `${activo.nombre} (#${activo.id_activo})`;
            select.appendChild(option);
        });
        if (currentValue) select.value = currentValue;
    } catch (error) {
        console.error('Error cargando activos para asignaciones:', error);
    }
}

async function populateLocationSelect() {
    const select = document.getElementById('assignLocation');
    if (!select) return;

    try {
        const response = await fetch(`${getApiUrl()}/asignaciones/ubicaciones`);
        const locations = await response.json();
        if (!response.ok) throw new Error(locations.error || 'No se pudo cargar ubicaciones');

        const datalistId = 'assignLocationOptions';
        let dataList = document.getElementById(datalistId);
        if (!dataList) {
            dataList = document.createElement('datalist');
            dataList.id = datalistId;
            select.insertAdjacentElement('afterend', dataList);
            select.setAttribute('list', datalistId);
        }
        dataList.innerHTML = '';
        locations.forEach(location => {
            const option = document.createElement('option');
            option.value = location.nombre;
            dataList.appendChild(option);
        });
    } catch (error) {
        console.error('Error cargando ubicaciones para asignaciones:', error);
    }
}

async function populateStateSelect() {
    const select = document.getElementById('assignType');
    if (!select) return;
    // The assignment type list is static and remains Temporal/Permanente.
}

async function fetchAssignments() {
    const pageRoot = document.querySelector('.asignaciones-page');
    if (!pageRoot) {
        return;
    }

    try {
        const response = await fetch(`${getApiUrl()}/asignaciones`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'No se pudieron cargar las asignaciones');
        assignmentsCache = data;
        applyAssignmentFilters();
        updateStats(data);
    } catch (error) {
        console.error('Error cargando asignaciones:', error);
        renderAssignments([]);
        updateStats([]);
    }
}

function renderAssignments(assignments) {
    const pageRoot = document.querySelector('.asignaciones-page');
    const tbody = pageRoot?.querySelector('#assignmentsTable');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!assignments.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align:center; padding: 2rem; opacity: .65;">No se encontraron asignaciones registradas</td>
            </tr>
        `;
        updateResultsSummary(0);
        return;
    }

    assignments.forEach(asig => {
        const tipo = asig.tipo_asignacion || (asig.fecha_fin ? 'Temporal' : 'Permanente');
        const estado = asig.estado || 'Activa';
        const fechaInicio = asig.fecha_inicio ? formatDate(asig.fecha_inicio) : '—';
        const fechaFin = asig.fecha_fin ? formatDate(asig.fecha_fin) : '—';
        const badgeType = tipo.toLowerCase() === 'permanente' ? 'badge-permanente' : 'badge-temporal';
        const statusClass = estado.toLowerCase() === 'vencida' ? 'status-expired' : estado.toLowerCase() === 'finalizada' ? 'status-finished' : 'status-active';
        const usuarioNombre = asig.usuario_nombre || 'Usuario desconocido';
        const usuarioEmail = asig.usuario_email || '';
        const activoNombre = asig.activo_nombre || 'Activo desconocido';
        const idAsignacion = asig.id_asignacion;

        tbody.innerHTML += `
            <tr data-status="${escapeHtml(estado)}" data-type="${escapeHtml(tipo.toLowerCase())}">
                <td><input type="checkbox" class="table-checkbox"></td>
                <td><span class="assignment-id">${escapeHtml(String(idAsignacion))}</span></td>
                <td>
                    <div class="user-info-cell">
                        <div class="user-avatar-small">${escapeHtml(usuarioNombre.split(' ').map(p => p[0] || '').slice(0, 2).join('').toUpperCase())}</div>
                        <div>
                            <span class="user-name-cell">${escapeHtml(usuarioNombre)}</span>
                            <span class="user-email-cell">${escapeHtml(usuarioEmail)}</span>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="asset-info">
                        <span class="asset-name">${escapeHtml(activoNombre)}</span>
                        <span class="asset-specs">ID ${escapeHtml(String(asig.fk_id_activo || '—'))}</span>
                    </div>
                </td>
                <td><span class="badge ${badgeType}">${escapeHtml(tipo)}</span></td>
                <td>${escapeHtml(fechaInicio)}</td>
                <td>${escapeHtml(fechaFin)}</td>
                <td><span class="status ${statusClass}">${escapeHtml(estado)}</span></td>
                <td>${escapeHtml(asig.ubicacion || '—')}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action" title="Ver detalles" onclick="viewAssignment(${idAsignacion})">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke-width="2"/>
                                <circle cx="12" cy="12" r="3" stroke-width="2"/>
                            </svg>
                        </button>
                        <button class="btn-action" title="Extender plazo" onclick="extendAssignment(${idAsignacion})">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <circle cx="12" cy="12" r="10" stroke-width="2"/>
                                <polyline points="12 6 12 12 16 14" stroke-width="2"/>
                            </svg>
                        </button>
                        <button class="btn-action" title="Finalizar" onclick="finishAssignment(${idAsignacion})">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <polyline points="20 6 9 17 4 12" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    if (typeof initPageFeatures === 'function') {
        initPageFeatures();
    }

    updateResultsSummary(assignments.length);
}

function updateStats(assignments) {
    const total = assignments.length;
    const active = assignments.filter(a => a.estado === 'Activa').length;
    const vencida = assignments.filter(a => a.estado === 'Vencida').length;
    const finalizada = assignments.filter(a => a.estado === 'Finalizada').length;
    const pageRoot = document.querySelector('.asignaciones-page');
    const totalCount = pageRoot?.querySelector('#assignmentTotalCount');
    const activeCount = pageRoot?.querySelector('#assignmentActiveCount');
    const dueCount = pageRoot?.querySelector('#assignmentDueCount');
    const finishedCount = pageRoot?.querySelector('#assignmentFinishedCount');

    if (totalCount) totalCount.textContent = total;
    if (activeCount) activeCount.textContent = active;
    if (dueCount) dueCount.textContent = vencida;
    if (finishedCount) finishedCount.textContent = finalizada;
}

function formatDate(dateValue) {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateInput(dateValue) {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function bindAssignmentForm() {
    const form = document.getElementById('assignmentForm');
    if (!form || form.dataset.bound === 'true') return;
    form.dataset.bound = 'true';
    form.addEventListener('submit', handleAssignmentForm);
}

function bindAssignmentFilters() {
    const pageRoot = document.querySelector('.asignaciones-page');
    if (!pageRoot || pageRoot.dataset.assignmentFiltersBound === 'true') return;
    pageRoot.dataset.assignmentFiltersBound = 'true';

    pageRoot.querySelector('#searchInput')?.addEventListener('input', applyAssignmentFilters);
    pageRoot.querySelector('#statusFilter')?.addEventListener('change', applyAssignmentFilters);
    pageRoot.querySelector('#typeFilter')?.addEventListener('change', applyAssignmentFilters);
}

function applyAssignmentFilters() {
    const pageRoot = document.querySelector('.asignaciones-page');
    const query = pageRoot?.querySelector('#searchInput')?.value.trim().toLowerCase() || '';
    const status = pageRoot?.querySelector('#statusFilter')?.value || '';
    const type = pageRoot?.querySelector('#typeFilter')?.value || '';

    const filtered = assignmentsCache.filter(asig => {
        const tipo = (asig.tipo_asignacion || (asig.fecha_fin ? 'Temporal' : 'Permanente')).toLowerCase();
        const estado = asig.estado || 'Activa';
        const text = [
            asig.id_asignacion,
            asig.usuario_nombre,
            asig.usuario_email,
            asig.activo_nombre,
            asig.ubicacion,
            tipo,
            estado
        ].join(' ').toLowerCase();

        return (!query || text.includes(query)) &&
            (!status || estado === status) &&
            (!type || tipo === type.toLowerCase());
    });

    renderAssignments(filtered);
}

function updateResultsSummary(count) {
    const pageRoot = document.querySelector('.asignaciones-page');
    const results = pageRoot?.querySelector('#resultsCount');
    const info = pageRoot?.querySelector('.table-info');
    if (results) results.textContent = count;
    if (info) {
        info.innerHTML = `Mostrando <strong>${count}</strong> de <strong>${count}</strong> asignaciones`;
    }
}

async function handleAssignmentForm(event) {
    event.preventDefault();
    const userId = document.getElementById('assignUser')?.value;
    const assetId = document.getElementById('assignAsset')?.value;
    const tipo = document.getElementById('assignType')?.value;
    const ubicacion = document.getElementById('assignLocation')?.value.trim();
    const fechaInicio = document.getElementById('assignStartDate')?.value;
    const fechaFin = document.getElementById('assignEndDate')?.value;
    const notas = document.getElementById('assignNotes')?.value.trim();

    if (!userId || !assetId || !tipo || !ubicacion || !fechaInicio) {
        notify('Completa los campos obligatorios antes de guardar.', 'warning');
        return;
    }

    const submitButton = event.target.querySelector('[type="submit"]');
    if (submitButton) submitButton.disabled = true;

    try {
        const response = await fetch(`${getApiUrl()}/asignaciones`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuario_id: parseInt(userId, 10),
                activo_id: parseInt(assetId, 10),
                tipo_asignacion: tipo,
                ubicacion,
                fecha_inicio: `${fechaInicio}T00:00:00`,
                fecha_fin: fechaFin ? `${fechaFin}T00:00:00` : null,
                notas: notas || null
            })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'No se pudo crear la asignación');

        await Promise.all([fetchAssignments(), populateAssetSelect(), populateUserSelect()]);
        document.getElementById('assignmentForm').reset();
        closeAssignmentModal();
        notify('Asignación creada correctamente', 'success');
    } catch (error) {
        console.error('Error guardando asignación:', error);
        notify(error.message || 'Error al crear la asignación', 'warning');
    } finally {
        if (submitButton) submitButton.disabled = false;
    }
}

function openAssignmentModal() {
    const modal = document.getElementById('assignmentModal');
    const form = document.getElementById('assignmentForm');
    if (!modal || !form) return;
    form.reset();
    document.getElementById('endDateGroup').style.display = 'flex';
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeAssignmentModal() {
    const modal = document.getElementById('assignmentModal');
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

function toggleEndDate() {
    const type = document.getElementById('assignType')?.value;
    const endDateGroup = document.getElementById('endDateGroup');
    if (!endDateGroup) return;
    if (type === 'permanente') {
        endDateGroup.style.display = 'none';
        document.getElementById('assignEndDate').value = '';
    } else {
        endDateGroup.style.display = 'flex';
    }
}

function bindModalCloseShortcuts() {
    if (assignmentKeydownBound) return;
    assignmentKeydownBound = true;

    document.addEventListener('keydown', event => {
        if (event.key !== 'Escape') return;
        ['assignmentModal', 'viewModal', 'extendModal'].forEach(id => {
            const modal = document.getElementById(id);
            if (modal && modal.classList.contains('active')) {
                modal.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });
}

function openViewModal() {
    const modal = document.getElementById('viewModal');
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeViewModal() {
    const modal = document.getElementById('viewModal');
    const detailNotes = document.getElementById('detailNotes');
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
    if (detailNotes) detailNotes.textContent = '';
}

async function viewAssignment(id) {
    try {
        const assignment = assignmentsCache.find(item => item.id_asignacion === id);
        let data = assignment;
        if (!data) {
            const response = await fetch(`${getApiUrl()}/asignaciones/${id}`);
            data = await response.json();
            if (!response.ok) throw new Error(data.error || 'No se encontró la asignación');
        }

        document.getElementById('detailAssignmentId').textContent = `ASG-${String(data.id_asignacion).padStart(6, '0')}`;
        document.getElementById('detailStatus').textContent = data.estado || 'Activa';
        document.getElementById('detailType').textContent = data.tipo_asignacion || (data.fecha_fin ? 'Temporal' : 'Permanente');
        document.getElementById('detailUserName').textContent = data.usuario_nombre || 'Usuario desconocido';
        document.getElementById('detailUserEmail').textContent = data.usuario_email || '—';
        document.getElementById('detailAssetName').textContent = data.activo_nombre || 'Activo desconocido';
        document.getElementById('detailAssetId').textContent = String(data.fk_id_activo || '—');
        document.getElementById('detailStartDate').textContent = formatDate(data.fecha_inicio);
        document.getElementById('detailEndDate').textContent = data.fecha_fin ? formatDate(data.fecha_fin) : '—';
        document.getElementById('detailLocation').textContent = data.ubicacion || '—';
        document.getElementById('detailNotes').textContent = data.notas || 'Sin observaciones adicionales.';
        openViewModal();
    } catch (error) {
        console.error('Error cargando detalles de asignación:', error);
        notify(error.message || 'Error al mostrar detalles', 'warning');
    }
}

function printAssignment() {
    window.print();
}

function openExtendModal() {
    const modal = document.getElementById('extendModal');
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeExtendModal() {
    const modal = document.getElementById('extendModal');
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

async function extendAssignment(id) {
    const assignment = assignmentsCache.find(item => item.id_asignacion === id);
    if (!assignment) {
        notify('No se encontró la asignación.', 'warning');
        return;
    }

    currentExtendAssignmentId = id;
    document.getElementById('extendAssignmentId').value = `ASG-${String(id).padStart(6, '0')}`;
    document.getElementById('extendCurrentDate').value = formatDateInput(assignment.fecha_fin || assignment.fecha_inicio);
    document.getElementById('extendNewDate').value = '';
    document.getElementById('extendReason').value = '';
    document.getElementById('extendModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function bindExtendForm() {
    const form = document.getElementById('extendForm');
    if (!form || form.dataset.bound === 'true') return;
    form.dataset.bound = 'true';
    form.addEventListener('submit', handleExtendForm);
}

async function handleExtendForm(event) {
    event.preventDefault();
    if (!currentExtendAssignmentId) return;
    const newDate = document.getElementById('extendNewDate')?.value;
    const reason = document.getElementById('extendReason')?.value.trim();

    if (!newDate || !reason) {
        notify('Indica una nueva fecha y motivo para extender la asignación.', 'warning');
        return;
    }

    const form = event.target;
    const submitButton = form.querySelector('[type="submit"]');
    if (submitButton) submitButton.disabled = true;

    try {
        const response = await fetch(`${getApiUrl()}/asignaciones/${currentExtendAssignmentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fecha_fin: `${newDate}T00:00:00`,
                estado: 'En uso'
            })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'No se pudo extender la asignación');

        await fetchAssignments();
        closeExtendModal();
        notify('Plazo extendido correctamente', 'success');
    } catch (error) {
        console.error('Error extendiendo asignación:', error);
        notify(error.message || 'Error al extender asignación', 'warning');
    } finally {
        if (submitButton) submitButton.disabled = false;
    }
}

async function finishAssignment(id) {
    if (!confirm(`¿Finalizar la asignación #${id}?`)) return;

    try {
        const today = new Date();
        const isoToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}T00:00:00`;
        const response = await fetch(`${getApiUrl()}/asignaciones/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fecha_fin: isoToday,
                estado: 'Finalizada'
            })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'No se pudo finalizar la asignación');

        await fetchAssignments();
        notify('Asignación finalizada correctamente', 'success');
    } catch (error) {
        console.error('Error finalizando asignación:', error);
        notify(error.message || 'Error al finalizar asignación', 'warning');
    }
}

window.openAssignmentModal = openAssignmentModal;
window.closeAssignmentModal = closeAssignmentModal;
window.toggleEndDate = toggleEndDate;
window.viewAssignment = viewAssignment;
window.closeViewModal = closeViewModal;
window.printAssignment = printAssignment;
window.extendAssignment = extendAssignment;
window.closeExtendModal = closeExtendModal;
window.finishAssignment = finishAssignment;
window.initAsignacionesPage = initAsignacionesPage;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAsignacionesPage);
} else {
    initAsignacionesPage();
}
