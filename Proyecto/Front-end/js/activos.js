const API_URL = "http://127.0.0.1:5000";
const PER_PAGE = 4;
let paginaActual = 1;
let activosCache = [];

function initActivosPage() {
    bindAssetForm();
    cargarActivos();
    bindModalCloseShortcuts();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initActivosPage);
} else {
    initActivosPage();
}

function bindAssetForm() {
    const form = document.getElementById('assetForm');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const id = document.getElementById('activoId').value;
        if (id) {
            await actualizarActivo(id);
        } else {
            await crearActivo();
        }
    });
}

function bindModalCloseShortcuts() {
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            const detailModal = document.getElementById('detailModal');
            const assetModal = document.getElementById('assetModal');
            if (detailModal?.classList.contains('active')) closeDetailModal();
            if (assetModal?.classList.contains('active')) closeModal();
        }
    });
}

function openModal(modo = 'crear') {
    const modal = document.getElementById('assetModal');
    if (!modal) return;

    const titulo = modal.querySelector('.modal-header h2');
    const btn = document.getElementById('btnGuardar');

    if (modo === 'crear') {
        titulo.textContent = 'Registrar Nuevo Activo';
        btn.textContent = 'Guardar Activo';
        limpiarFormulario();
    } else {
        titulo.textContent = 'Editar Activo';
        btn.textContent = 'Actualizar Activo';
    }

    modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('assetModal');
    if (!modal) return;
    modal.classList.remove('active');
    limpiarFormulario();
}

function limpiarFormulario() {
    document.getElementById('activoId').value = '';
    document.getElementById('inputNombre').value = '';
    document.getElementById('inputCategoria').value = '';
    document.getElementById('inputEstado').value = '';
    document.getElementById('inputDescripcion').value = '';
    document.getElementById('inputUbicacion').value = '';
    document.getElementById('inputAsignadoA').value = '';
    document.getElementById('inputFechaAlta').value = '';
}

async function cargarActivos(resetPagina = true) {
    try {
        const res = await fetch(`${API_URL}/activos`);
        const activos = await res.json();
        if (!res.ok) {
            throw new Error(activos.error || 'No se pudo cargar la lista de activos');
        }

        if (resetPagina) paginaActual = 1;
        renderTabla(activos);
    } catch (err) {
        console.error('Error al cargar activos:', err);
        alert(err.message || 'No se pudo cargar la lista de activos. Revisa la conexión al servidor.');
    }
}

function renderTabla(activos) {
    activosCache = activos;
    paginaActual = 1;
    renderPagina();
}

function renderPagina() {
    const activos = activosCache;
    const totalRows = activos.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / PER_PAGE));
    paginaActual = Math.min(paginaActual, totalPages);

    const start = (paginaActual - 1) * PER_PAGE;
    const end = Math.min(start + PER_PAGE, totalRows);
    const slice = activos.slice(start, end);
    const tbody = document.querySelector('.data-table tbody');

    if (!tbody) return;
    tbody.innerHTML = '';

    if (!activos.length) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:2rem;opacity:.5;">No hay activos registrados</td></tr>`;
    } else {
        slice.forEach(a => {
            const badgeCategoria = {
                Hardware: 'badge-hardware',
                Software: 'badge-software',
                Infraestructura: 'badge-infrastructure'
            }[a.categoria] || 'badge-hardware';

            const badgeEstado = {
                Disponible: 'status-available',
                'En uso': 'status-inuse',
                Mantenimiento: 'status-maintenance',
                'Dado de baja': 'status-retired'
            }[a.estado] || 'status-available';

            let fechaMostrar = '—';
            if (a.fecha_alta) {
                const [y, m, d] = a.fecha_alta.split('-');
                fechaMostrar = `${d}/${m}/${y}`;
            }

            tbody.innerHTML += `
                <tr>
                    <td><input type="checkbox" class="table-checkbox"></td>
                    <td><span class="asset-id">#${a.activo_id}</span></td>
                    <td>
                        <div class="asset-info">
                            <span class="asset-name">${escapeHtml(a.nombre)}</span>
                            <span class="asset-specs">${escapeHtml(a.descripcion) || '—'}</span>
                        </div>
                    </td>
                    <td><span class="badge ${badgeCategoria}">${escapeHtml(a.categoria)}</span></td>
                    <td>
                        <select class="status-select ${badgeEstado}" onchange="cambiarEstadoRapido(${a.activo_id}, this.value, this)">
                            <option value="Disponible" ${a.estado === 'Disponible' ? 'selected' : ''}>Disponible</option>
                            <option value="En uso" ${a.estado === 'En uso' ? 'selected' : ''}>En uso</option>
                            <option value="Mantenimiento" ${a.estado === 'Mantenimiento' ? 'selected' : ''}>Mantenimiento</option>
                            <option value="Dado de baja" ${a.estado === 'Dado de baja' ? 'selected' : ''}>Dado de baja</option>
                        </select>
                    </td>
                    <td>${escapeHtml(a.ubicacion) || '—'}</td>
                    <td>${escapeHtml(a.asignado_a) || '—'}</td>
                    <td>${fechaMostrar}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-action" title="Ver detalles" onclick="verActivo(${a.activo_id})">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke-width="2"/>
                                    <circle cx="12" cy="12" r="3" stroke-width="2"/>
                                </svg>
                            </button>
                            <button class="btn-action" title="Editar" onclick="abrirEditar(${a.activo_id})">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke-width="2"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="2"/>
                                </svg>
                            </button>
                            <button class="btn-action" title="Eliminar" onclick="eliminarActivo(${a.activo_id})">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <polyline points="3 6 5 6 21 6" stroke-width="2"/>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke-width="2"/>
                                </svg>
                            </button>
                        </div>
                    </td>
                </tr>`;
        });
    }

    const infoEl = document.querySelector('.table-info');
    if (infoEl) {
        const dispStart = totalRows === 0 ? 0 : start + 1;
        infoEl.innerHTML = `Mostrando <strong>${dispStart}–${end}</strong> de <strong>${totalRows}</strong> activos`;
    }

    renderPaginacionControles(totalPages);
}

function renderPaginacionControles(totalPages) {
    const container = document.querySelector('.pagination');
    if (!container) return;

    let html = '';
    html += `<button class="pagination-btn" onclick="irPagina(${paginaActual - 1})" ${paginaActual === 1 ? 'disabled' : ''}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="15 18 9 12 15 6" stroke-width="2"/></svg>
             </button>`;

    let inicio = Math.max(1, paginaActual - 2);
    let fin = Math.min(totalPages, inicio + 4);
    if (fin - inicio < 4) inicio = Math.max(1, fin - 4);

    if (inicio > 1) {
        html += `<button class="pagination-btn" onclick="irPagina(1)">1</button>`;
        if (inicio > 2) html += `<span class="pagination-dots">…</span>`;
    }

    for (let i = inicio; i <= fin; i++) {
        html += `<button class="pagination-btn ${i === paginaActual ? 'active' : ''}" onclick="irPagina(${i})">${i}</button>`;
    }

    if (fin < totalPages) {
        if (fin < totalPages - 1) html += `<span class="pagination-dots">…</span>`;
        html += `<button class="pagination-btn" onclick="irPagina(${totalPages})">${totalPages}</button>`;
    }

    html += `<button class="pagination-btn" onclick="irPagina(${paginaActual + 1})" ${paginaActual === totalPages ? 'disabled' : ''}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="9 18 15 12 9 6" stroke-width="2"/></svg>
             </button>`;

    container.innerHTML = html;
}

function irPagina(p) {
    const totalPages = Math.ceil(activosCache.length / PER_PAGE);
    if (p < 1 || p > totalPages) return;
    paginaActual = p;
    renderPagina();
}

async function crearActivo() {
    try {
        const res = await fetch(`${API_URL}/activos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(obtenerDatosFormulario())
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al crear activo');

        closeModal();
        cargarActivos();
        alert(`✅ Activo creado con ID: ${data.activo_id}`);
    } catch (err) {
        console.error(err);
        alert(err.message || 'Error de conexión con el servidor');
    }
}

async function cambiarEstadoRapido(id, nuevoEstado, selectElement) {
    try {
        const resGet = await fetch(`${API_URL}/activos/${id}`);
        if (!resGet.ok) {
            const data = await resGet.json();
            throw new Error(data.error || 'No se pudo obtener el activo');
        }

        const currentAsset = await resGet.json();
        currentAsset.estado = nuevoEstado;

        const resPut = await fetch(`${API_URL}/activos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentAsset)
        });

        if (!resPut.ok) {
            const data = await resPut.json();
            throw new Error(data.error || 'No se pudo actualizar el estado');
        }

        const badgeEstado = {
            Disponible: 'status-available',
            'En uso': 'status-inuse',
            Mantenimiento: 'status-maintenance',
            'Dado de baja': 'status-retired'
        }[nuevoEstado] || 'status-available';

        selectElement.className = `status-select ${badgeEstado}`;
    } catch (err) {
        console.error(err);
        alert(err.message || 'Error de conexión al cambiar estado.');
    }
}

async function abrirEditar(activoId) {
    try {
        const res = await fetch(`${API_URL}/activos/${activoId}`);
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Activo no encontrado');
        }

        const a = await res.json();
        document.getElementById('activoId').value = a.activo_id;
        document.getElementById('inputNombre').value = a.nombre || '';
        document.getElementById('inputCategoria').value = a.categoria || '';
        document.getElementById('inputEstado').value = a.estado || '';
        document.getElementById('inputDescripcion').value = a.descripcion || '';
        document.getElementById('inputUbicacion').value = a.ubicacion || '';
        document.getElementById('inputAsignadoA').value = a.asignado_a || '';
        document.getElementById('inputFechaAlta').value = a.fecha_alta || '';

        openModal('editar');
    } catch (err) {
        console.error(err);
        alert(err.message || 'Error al cargar el activo');
    }
}

async function actualizarActivo(activoId) {
    try {
        const res = await fetch(`${API_URL}/activos/${activoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(obtenerDatosFormulario())
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo actualizar el activo');

        closeModal();
        cargarActivos();
        alert(`✅ ${data.mensaje}`);
    } catch (err) {
        console.error(err);
        alert(err.message || 'Error de conexión con el servidor');
    }
}

async function eliminarActivo(activoId) {
    if (!confirm(`¿Estás seguro de eliminar el activo #${activoId}? Esta acción no se puede deshacer.`)) return;

    try {
        const res = await fetch(`${API_URL}/activos/${activoId}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo eliminar el activo');

        cargarActivos();
        alert(`✅ ${data.mensaje}`);
    } catch (err) {
        console.error(err);
        alert(err.message || 'Error de conexión con el servidor');
    }
}

async function verActivo(activoId) {
    try {
        const res = await fetch(`${API_URL}/activos/${activoId}`);
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Activo no encontrado');
        }

        const a = await res.json();
        const badgeCategoria = {
            Hardware: 'badge-hardware',
            Software: 'badge-software',
            Infraestructura: 'badge-infrastructure'
        }[a.categoria] || 'badge-hardware';

        const badgeEstado = {
            Disponible: 'status-available',
            'En uso': 'status-inuse',
            Mantenimiento: 'status-maintenance',
            'Dado de baja': 'status-retired'
        }[a.estado] || 'status-available';

        let fechaMostrar = '—';
        if (a.fecha_alta) {
            const [y, m, d] = a.fecha_alta.split('-');
            fechaMostrar = `${d}/${m}/${y}`;
        }

        document.getElementById('detailId').textContent = `#${a.activo_id}`;
        document.getElementById('detailNombre').textContent = a.nombre || '—';
        document.getElementById('detailDescripcion').textContent = a.descripcion || '—';
        document.getElementById('detailUbicacion').textContent = a.ubicacion || '—';
        document.getElementById('detailAsignado').textContent = a.asignado_a || 'Sin asignar';
        document.getElementById('detailFecha').textContent = fechaMostrar;

        const catBadge = document.getElementById('detailCategoria');
        catBadge.textContent = a.categoria || '—';
        catBadge.className = `badge ${badgeCategoria}`;

        const estBadge = document.getElementById('detailEstado');
        estBadge.textContent = a.estado || '—';
        estBadge.className = `badge ${badgeEstado}`;

        document.getElementById('detailBtnEditar').onclick = () => {
            closeDetailModal();
            abrirEditar(a.activo_id);
        };

        document.getElementById('detailModal').classList.add('active');
    } catch (err) {
        console.error(err);
        alert(err.message || 'Error al obtener detalle del activo');
    }
}

function closeDetailModal() {
    document.getElementById('detailModal').classList.remove('active');
}

function obtenerDatosFormulario() {
    return {
        nombre: document.getElementById('inputNombre').value.trim(),
        descripcion: document.getElementById('inputDescripcion').value.trim() || null,
        categoria: document.getElementById('inputCategoria').value,
        estado: document.getElementById('inputEstado').value,
        ubicacion: document.getElementById('inputUbicacion').value.trim() || null,
        asignado_a: document.getElementById('inputAsignadoA').value || null,
        fecha_alta: document.getElementById('inputFechaAlta').value || null
    };
}

function escapeHtml(text) {
    if (!text) return text;
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
