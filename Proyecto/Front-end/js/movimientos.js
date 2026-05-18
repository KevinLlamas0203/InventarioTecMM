function getApiUrl() {
    return window.API_URL || "http://127.0.0.1:5000";
}
console.log('movimientos.js cargado');
let movimientosCache = [];
let movementKeydownBound = false;
let isMovementSubmitting = false;

async function initMovimientosPage() {
    await refreshMovementFormOptions();
    await fetchMovimientos();
    bindMovementForm();
    bindMovementKeyboardClose();
}

function notify(message, type = 'success') {
    if (typeof showToast === 'function') {
        showToast(message, type);
        return;
    }
    alert(message);
}

async function populateEmployeeSelect() {
    const select = document.getElementById('movementEmployee');
    if (!select) return;
    select.innerHTML = '<option value="">-- Seleccione un empleado --</option>';

    try {
        const response = await fetch(`${getApiUrl()}/movimientos/usuarios`);
        const users = await response.json();
        if (!response.ok) {
            throw new Error(users.error || 'No se pudo cargar empleados');
        }
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.nombre_completo;
            option.textContent = `${user.nombre_completo}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error cargando empleados para movimientos:', error);
    }
}

async function populateLocationSelect() {
    const originSelect = document.getElementById('movementOrigin');
    const destinationSelect = document.getElementById('movementDestination');
    if (!originSelect || !destinationSelect) return;

    originSelect.innerHTML = '<option value="">-- Seleccione ubicación --</option>';
    destinationSelect.innerHTML = '<option value="">-- Seleccione ubicación --</option>';

    try {
        const response = await fetch(`${getApiUrl()}/movimientos/ubicaciones`);
        const locations = await response.json();
        if (!response.ok) {
            throw new Error(locations.error || 'No se pudieron cargar ubicaciones');
        }
        const options = ['<option value="">-- Seleccione ubicación --</option>'];
        locations.forEach(location => {
            const escaped = escapeHtml(location.nombre);
            options.push(`<option value="${escaped}">${escaped}</option>`);
        });
        originSelect.innerHTML = options.join('');
        destinationSelect.innerHTML = options.join('');
    } catch (error) {
        console.error('Error cargando ubicaciones para movimientos:', error);
    }
}

async function populateTypeSelect() {
    const select = document.getElementById('movementType');
    if (!select) return;
    select.innerHTML = '<option value="">-- Seleccione tipo de movimiento --</option>';

    try {
        const response = await fetch(`${getApiUrl()}/movimientos/tipo_movimientos`);
        const tipos = await response.json();
        if (!response.ok) {
            throw new Error(tipos.error || 'No se pudieron cargar tipos de movimiento');
        }
        tipos.forEach(tipo => {
            const option = document.createElement('option');
            option.value = tipo.nombre;
            option.textContent = tipo.nombre;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error cargando tipos de movimiento:', error);
    }
}

async function refreshMovementFormOptions() {
    await Promise.all([
        populateAssetSelect(),
        populateEmployeeSelect(),
        populateLocationSelect(),
        populateTypeSelect()
    ]);
}

async function fetchMovimientos() {
    try {
        const response = await fetch(`${getApiUrl()}/movimientos`);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'No se pudo cargar los movimientos');
        }
        movimientosCache = data;
        renderMovimientos(data);
        updateStats(data);
    } catch (error) {
        console.error('Error cargando movimientos:', error);
        renderMovimientos([]);
    }
}

function renderMovimientos(movimientos) {
    const tbody = document.querySelector('.table-wrapper tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!movimientos.length) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2rem;opacity:.6;">No se encontraron movimientos registrados</td></tr>`;
        return;
    }

    movimientos.forEach(m => {
        const fecha = new Date(m.fecha_movimiento).toLocaleDateString('es-ES', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
        const hora = new Date(m.fecha_movimiento).toLocaleTimeString('es-ES', {
            hour: '2-digit', minute: '2-digit'
        });
        const tipoClass = {
            'Mantenimiento': 'badge-mantenimiento',
            'Asignación': 'badge-asignacion',
            'Devolución': 'badge-devolucion',
            'Transferencia': 'badge-transferencia',
            'Alta': 'badge-alta',
            'Baja': 'badge-baja'
        }[m.tipo_movimiento] || 'badge-transferencia';
        const empleado = m.empleado || 'Sin empleado';
        const ubicacion = m.ubicacion || 'Sin ubicación';
        const movimientoHTML = `
            <div class="mov-row">
                <div class="mov-origin">${escapeHtml(ubicacion)}<small>${escapeHtml(empleado)}</small></div>
            </div>`;

        tbody.innerHTML += `
            <tr>
                <td>
                    <div class="date-main">${fecha}</div>
                    <div class="date-time">${hora}</div>
                </td>
                <td>
                    <div class="asset-name">${escapeHtml(m.activo_nombre || 'Activo desconocido')}</div>
                    <div class="asset-code">ACT-${m.activo_id || '---'}</div>
                </td>
                <td>
                    <span class="badge ${tipoClass}">${escapeHtml(m.tipo_movimiento)}</span>
                </td>
                <td>${movimientoHTML}</td>
                <td><div class="notes">${escapeHtml(m.observaciones || '—')}</div></td>
            </tr>`;
    });
}

function updateStats(movimientos) {
    const totalCount = movimientos.length;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthCount = movimientos.filter(m => {
        const date = new Date(m.fecha_movimiento);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).length;
    const assignmentCount = movimientos.filter(m => m.tipo_movimiento === 'Asignación').length;
    const maintenanceCount = movimientos.filter(m => m.tipo_movimiento === 'Mantenimiento').length;

    const totalEl = document.querySelector('.stat-card.blue .stat-value');
    const monthEl = document.querySelector('.stat-card.green .stat-value');
    const assignEl = document.querySelector('.stat-card.purple .stat-value');
    const maintenanceEl = document.querySelector('.stat-card.orange .stat-value');
    const results = document.querySelector('.results-count');

    if (totalEl) totalEl.textContent = totalCount;
    if (monthEl) monthEl.textContent = monthCount;
    if (assignEl) assignEl.textContent = assignmentCount;
    if (maintenanceEl) maintenanceEl.textContent = maintenanceCount;
    if (results) results.textContent = `Mostrando ${totalCount} de ${totalCount} movimientos`;
}

async function populateAssetSelect() {
    const select = document.getElementById('movementAsset');
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = '<option value="">-- Seleccione un activo --</option>';

    try {
        const response = await fetch(`${getApiUrl()}/activos`);
        const activos = await response.json();
        if (!response.ok) {
            throw new Error(activos.error || 'No se pudo cargar activos');
        }
        activos.forEach(activo => {
            const option = document.createElement('option');
            option.value = activo.activo_id;
            option.textContent = `${activo.nombre} (#${activo.activo_id})`;
            select.appendChild(option);
        });
        if (currentValue) {
            select.value = currentValue;
        }
    } catch (error) {
        console.error('Error cargando activos para movimientos:', error);
    }
}

function bindMovementForm() {
    const form = document.getElementById('movementForm');
    if (!form || form.dataset.movFormBound === 'true') return;
    form.dataset.movFormBound = 'true';

    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        if (isMovementSubmitting) return;

        const activoId = document.getElementById('movementAsset')?.value;
        const tipoMov = document.getElementById('movementType')?.value;
        const empleado = document.getElementById('movementEmployee')?.value;
        const ubicacion = document.getElementById('movementDestination')?.value || document.getElementById('movementOrigin')?.value;
        const observaciones = document.getElementById('movementNotes')?.value;
        const submitButton = form.querySelector('[type="submit"]');

        if (!activoId || !tipoMov) {
            notify('Selecciona activo y tipo de movimiento.', 'warning');
            return;
        }

        isMovementSubmitting = true;
        if (submitButton) submitButton.disabled = true;

        try {
            const response = await fetch(`${getApiUrl()}/movimientos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    activo_id: parseInt(activoId, 10),
                    tipo_movimiento: tipoMov,
                    empleado: empleado,
                    ubicacion: ubicacion,
                    observaciones: observaciones
                })
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'No se pudo guardar el movimiento');
            }

            await Promise.all([fetchMovimientos(), populateAssetSelect()]);
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

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeMovementModal();
        }
    });
}

window.initMovimientosPage = initMovimientosPage;
window.openMovementModal = openMovementModal;
window.closeMovementModal = closeMovementModal;

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

setTimeout(initMovimientosPage, 0);
