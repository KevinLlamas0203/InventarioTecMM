const API = 'https://inventariotsj.onrender.com';

/* ─── Utils ─────────────────────────────────────────────── */
const BC = { Pendiente:'badge-pendiente', Activo:'badge-activo', Devuelto:'badge-devuelto', Cancelado:'badge-cancelado', Vencido:'badge-vencido' };
function esc(s){ return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function fmtDT(dt){ if(!dt)return'—'; return new Date(dt).toLocaleString('es-MX',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
function dur(a,b){ if(!a||!b)return'—'; const ms=new Date(b)-new Date(a); if(ms<=0)return'—'; const h=Math.floor(ms/3600000),m=Math.floor((ms%3600000)/60000); return h>0?`${h}h${m?' '+m+'min':''}`:`${m} min`; }
function toast(msg,type='info'){ const c=document.getElementById('toast-container'),el=document.createElement('div'); el.className=`toast ${type}`; el.textContent=msg; c.appendChild(el); setTimeout(()=>el.remove(),3500); }

/* ─── Estado global ─────────────────────────────────────── */
let prestamos = [];
let filtered  = [];
let page      = 1;
const PER     = 10;

/* ─── Cargar datos desde backend ────────────────────────── */
async function cargarPrestamos() {
    const tbody = document.getElementById('prestamosTable');
    tbody.innerHTML = `<tr><td colspan="9"><div class="table-loading"><div class="spinner"></div>Cargando préstamos...</div></td></tr>`;
    try {
        const res  = await fetch(`${API}/prestamos`);
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        prestamos = data.prestamos;
        filtered  = [...prestamos];
        renderTable();
        updateStats();
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="9"><div class="table-empty" style="color:#f87171">No se pudo conectar con el servidor.<br><small>${e.message}</small></div></td></tr>`;
    }
}

/* ─── Stats desde backend ───────────────────────────────── */
async function updateStats() {
    try {
        const res  = await fetch(`${API}/prestamos/stats`);
        const data = await res.json();
        if (!data.success) return;
        document.getElementById('st-total').textContent  = data.total;
        document.getElementById('st-pend').textContent   = data.pendiente;
        document.getElementById('st-activo').textContent = data.activo;
        document.getElementById('st-dev').textContent    = data.devuelto;
        document.getElementById('st-venc').textContent   = data.vencido;
    } catch {}
}

/* ─── Filtros ────────────────────────────────────────────── */
function applyFilters(){
    const q  = document.getElementById('searchInput').value.toLowerCase();
    const fe = document.getElementById('filterEstado').value;
    const fl = document.getElementById('filterLab').value;
    filtered = prestamos.filter(p => {
        const t = (p.solicitante + p.docente + p.folio).toLowerCase();
        return (!q || t.includes(q)) && (!fe || p.estado === fe) && (!fl || p.lab === fl);
    });
    page = 1;
    renderTable();
}

/* ─── Tabla ─────────────────────────────────────────────── */
function renderTable(){
    const tbody = document.getElementById('prestamosTable');
    const start = (page - 1) * PER;
    const pageData = filtered.slice(start, start + PER);

    if (!pageData.length) {
        tbody.innerHTML = `<tr><td colspan="9"><div class="table-empty">No se encontraron préstamos.</div></td></tr>`;
        updateInfo(); renderPagination(); return;
    }

    tbody.innerHTML = pageData.map(p => {
        const items  = Array.isArray(p.items) ? p.items : [];
        const arts   = items.map(i => `${i.nombre} (${i.cantidad})`).join(', ');
        const artStr = arts.length > 40 ? arts.slice(0, 40) + '…' : arts;
        const canEdit = p.estado === 'Pendiente' || p.estado === 'Activo';
        return `<tr>
            <td><input type="checkbox" class="table-checkbox"></td>
            <td><span class="folio-code">${esc(p.folio)}</span></td>
            <td><div class="cell-main">${esc(p.solicitante)}</div><div class="cell-sub">${p.alumnos} alumno${p.alumnos!==1?'s':''}</div></td>
            <td style="font-size:.82rem">${esc(p.docente)}</td>
            <td style="font-size:.82rem">${esc(p.lab)}</td>
            <td><div class="cell-main" style="font-size:.78rem">${fmtDT(p.inicio)}</div><div class="cell-sub">${dur(p.inicio,p.fin)}</div></td>
            <td style="font-size:.78rem;color:var(--text-muted)">${esc(artStr)}</td>
            <td><span class="badge ${BC[p.estado]||''}">${esc(p.estado)}</span></td>
            <td><div class="action-buttons">
                <button class="btn-action info"    data-action="ver"      data-id="${p.id}" title="Ver detalle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke-width="2"/><circle cx="12" cy="12" r="3" stroke-width="2"/></svg></button>
                ${canEdit ? `<button class="btn-action" data-action="editar" data-id="${p.id}" title="Editar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke-width="2"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="2"/></svg></button>` : ''}
                ${p.estado==='Pendiente' ? `<button class="btn-action success" data-action="estado" data-id="${p.id}" data-nuevo="Activo" title="Marcar activo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12" stroke-width="2"/></svg></button>` : ''}
                ${p.estado==='Activo'    ? `<button class="btn-action success" data-action="estado" data-id="${p.id}" data-nuevo="Devuelto" title="Marcar devuelto"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="1 4 1 10 7 10" stroke-width="2"/><path d="M3.51 15a9 9 0 1 0 .49-3.63" stroke-width="2"/></svg></button>` : ''}
                ${canEdit ? `<button class="btn-action warning" data-action="cancelar" data-id="${p.id}" title="Cancelar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="2"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" stroke-width="2"/></svg></button>` : ''}
                <button class="btn-action danger" data-action="eliminar" data-id="${p.id}" title="Eliminar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="3 6 5 6 21 6" stroke-width="2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke-width="2"/></svg></button>
            </div></td>
        </tr>`;
    }).join('');

    tbody.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const { action, id, nuevo } = btn.dataset;
            if (action === 'ver')      verDetalle(Number(id));
            if (action === 'editar')   abrirEditar(Number(id));
            if (action === 'estado')   cambiarEstado(Number(id), nuevo);
            if (action === 'cancelar') pedirCancelar(Number(id));
            if (action === 'eliminar') pedirEliminar(Number(id));
        });
    });

    updateInfo();
    renderPagination();
}

function updateInfo(){
    const s=(page-1)*PER+1, e=Math.min(page*PER,filtered.length);
    document.getElementById('tableInfo').innerHTML = filtered.length === 0
        ? 'Sin resultados'
        : `Mostrando <strong>${s}–${e}</strong> de <strong>${filtered.length}</strong> préstamos`;
}

function renderPagination(){
    const total = Math.ceil(filtered.length / PER);
    const c = document.getElementById('paginationContainer');
    if (total <= 1) { c.innerHTML = ''; return; }
    let h = `<button class="pagination-btn" data-p="${page-1}" ${page===1?'disabled':''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="15 18 9 12 15 6" stroke-width="2"/></svg></button>`;
    for (let i = 1; i <= total; i++) {
        if (i===1||i===total||(i>=page-1&&i<=page+1)) h += `<button class="pagination-btn ${i===page?'active':''}" data-p="${i}">${i}</button>`;
        else if (i===page-2||i===page+2) h += `<span class="pagination-dots">…</span>`;
    }
    h += `<button class="pagination-btn" data-p="${page+1}" ${page===total?'disabled':''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="9 18 15 12 9 6" stroke-width="2"/></svg></button>`;
    c.innerHTML = h;
    c.querySelectorAll('[data-p]').forEach(btn => btn.addEventListener('click', () => {
        const p = Number(btn.dataset.p);
        if (p >= 1 && p <= total) { page = p; renderTable(); }
    }));
}

/* ─── Items del formulario ───────────────────────────────── */
function addItem(item) {
    const list = document.getElementById('itemsList');
    const div  = document.createElement('div');
    div.className = 'item-row';
    div.innerHTML = `
        <select class="it-tipo">
            <option value="Activo"     ${item?.tipo==='Activo'?'selected':''}>Activo</option>
            <option value="Consumible" ${item?.tipo==='Consumible'?'selected':''}>Consumible</option>
        </select>
        <input type="text"   class="it-nom"  placeholder="Nombre del artículo" value="${esc(item?.nombre||'')}">
        <input type="number" class="it-cant" placeholder="Cant." min="1" value="${item?.cantidad||1}">
        <button class="btn-rm-item" title="Quitar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 6L6 18M6 6l12 12" stroke-width="2" stroke-linecap="round"/></svg></button>`;
    div.querySelector('.btn-rm-item').addEventListener('click', () => div.remove());
    list.appendChild(div);
}

/* ─── Modal Form ────────────────────────────────────────── */
function resetForm(){
    ['f-sol','f-alum','f-doc','f-ini','f-fin','f-notas'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('f-lab').value   = '';
    document.getElementById('edit-id').value = '';
    document.getElementById('itemsList').innerHTML = '';
}

function abrirNuevo(){
    resetForm(); addItem();
    document.getElementById('formTitle').textContent = 'Nuevo préstamo';
    document.getElementById('btn-guardar').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width:15px;height:15px"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke-width="2"/><polyline points="17 21 17 13 7 13 7 21" stroke-width="2"/><polyline points="7 3 7 8 15 8" stroke-width="2"/></svg> Guardar préstamo`;
    document.getElementById('modalForm').classList.add('active');
}

function abrirEditar(id){
    const p = prestamos.find(x => x.id === id); if (!p) return;
    resetForm();
    document.getElementById('edit-id').value = p.id;
    document.getElementById('f-sol').value   = p.solicitante;
    document.getElementById('f-alum').value  = p.alumnos;
    document.getElementById('f-doc').value   = p.docente;
    document.getElementById('f-lab').value   = p.lab;
    document.getElementById('f-ini').value   = p.inicio?.slice(0,16) || '';
    document.getElementById('f-fin').value   = p.fin?.slice(0,16)   || '';
    document.getElementById('f-notas').value = p.notas || '';
    (Array.isArray(p.items) ? p.items : []).forEach(addItem);
    document.getElementById('formTitle').textContent = `Editar préstamo — ${p.folio}`;
    document.getElementById('btn-guardar').textContent = 'Actualizar préstamo';
    document.getElementById('modalForm').classList.add('active');
}

function cerrarForm(){ document.getElementById('modalForm').classList.remove('active'); }

async function guardar(){
    const sol   = document.getElementById('f-sol').value.trim();
    const alum  = document.getElementById('f-alum').value;
    const doc   = document.getElementById('f-doc').value.trim();
    const lab   = document.getElementById('f-lab').value;
    const ini   = document.getElementById('f-ini').value;
    const fin   = document.getElementById('f-fin').value;
    const notas = document.getElementById('f-notas').value.trim();

    if (!sol||!alum||!doc||!lab||!ini||!fin) { toast('Completa todos los campos obligatorios.','error'); return; }
    if (new Date(fin) <= new Date(ini))       { toast('La devolución debe ser posterior al inicio.','error'); return; }

    const rows  = document.querySelectorAll('#itemsList .item-row');
    const items = []; let ok = true;
    rows.forEach(r => {
        const tipo     = r.querySelector('.it-tipo').value;
        const nombre   = r.querySelector('.it-nom').value.trim();
        const cantidad = parseInt(r.querySelector('.it-cant').value) || 0;
        if (!nombre || cantidad < 1) { ok = false; return; }
        items.push({ tipo, nombre, cantidad });
    });
    if (!items.length || !ok) { toast('Agrega al menos un artículo válido.','error'); return; }

    const editId = document.getElementById('edit-id').value;
    const payload = { solicitante: sol, alumnos: parseInt(alum), docente: doc, lab, inicio: ini, fin, items, notas };

    const btn = document.getElementById('btn-guardar');
    btn.disabled    = true;
    btn.textContent = 'Guardando…';

    try {
        let res, data;
        if (editId) {
            res  = await fetch(`${API}/prestamos/${editId}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
            data = await res.json();
            if (data.success) {
                const idx = prestamos.findIndex(p => p.id === Number(editId));
                if (idx >= 0) prestamos[idx] = data.prestamo;
                toast('Préstamo actualizado.', 'success');
            }
        } else {
            res  = await fetch(`${API}/prestamos`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
            data = await res.json();
            if (data.success) {
                prestamos.unshift(data.prestamo);
                toast(`Préstamo ${data.prestamo.folio} registrado.`, 'success');
            }
        }

        if (!data.success) { toast(data.message || 'Error al guardar.', 'error'); return; }

        filtered = [...prestamos];
        renderTable();
        updateStats();
        cerrarForm();

    } catch(e) {
        toast('Error de conexión: ' + e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = editId ? 'Actualizar préstamo' : 'Guardar préstamo';
    }
}

/* ─── Cambiar estado ────────────────────────────────────── */
async function cambiarEstado(id, nuevo){
    try {
        const res  = await fetch(`${API}/prestamos/${id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ estado: nuevo }) });
        const data = await res.json();
        if (!data.success) { toast(data.message, 'error'); return; }
        const idx = prestamos.findIndex(p => p.id === id);
        if (idx >= 0) prestamos[idx] = data.prestamo;
        filtered = [...prestamos];
        renderTable();
        updateStats();
        toast({ Activo:'Préstamo marcado como activo.', Devuelto:'Artículos devueltos correctamente.' }[nuevo] || 'Estado actualizado.', nuevo==='Devuelto'?'success':'info');
    } catch(e) {
        toast('Error al cambiar estado.', 'error');
    }
}

/* ─── Eliminar ──────────────────────────────────────────── */
async function eliminarPrestamo(id){
    try {
        const res  = await fetch(`${API}/prestamos/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (!data.success) { toast(data.message, 'error'); return; }
        prestamos = prestamos.filter(p => p.id !== id);
        filtered  = [...prestamos];
        renderTable();
        updateStats();
        toast(data.message, 'info');
    } catch(e) {
        toast('Error al eliminar.', 'error');
    }
}

/* ─── Cancelar ──────────────────────────────────────────── */
async function cancelarPrestamo(id){
    await cambiarEstado(id, 'Cancelado');
    toast('Préstamo cancelado.', 'warning');
}

/* ─── Detalle ────────────────────────────────────────────── */
function verDetalle(id){
    const p = prestamos.find(x => x.id === id); if (!p) return;
    const sts = ['Pendiente','Activo','Devuelto'], si = sts.indexOf(p.estado);
    const dot = i => { if((p.estado==='Cancelado'||p.estado==='Vencido')&&i>=1) return 'error'; if(i<si) return 'done'; if(i===si) return 'current'; return ''; };
    const chk = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="12" height="12"><polyline points="20 6 9 17 4 12" stroke-width="2.5"/></svg>`;
    const dot_s = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="10" height="10"><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>`;
    const x_s = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="12" height="12"><path d="M18 6L6 18M6 6l12 12" stroke-width="2.5"/></svg>`;
    const icon = d => d==='done' ? chk : d==='error' ? x_s : dot_s;
    const items = Array.isArray(p.items) ? p.items : [];
    document.getElementById('detalleBody').innerHTML = `
        <div class="detail-grid">
            <div class="detail-field"><label>Folio</label><span style="font-family:monospace">${esc(p.folio)}</span></div>
            <div class="detail-field"><label>Estado</label><span class="badge ${BC[p.estado]||''}">${esc(p.estado)}</span></div>
            <div class="detail-field"><label>Solicitante</label><span>${esc(p.solicitante)}</span></div>
            <div class="detail-field"><label>Alumnos</label><span>${p.alumnos}</span></div>
            <div class="detail-field"><label>Docente</label><span>${esc(p.docente)}</span></div>
            <div class="detail-field"><label>Laboratorio</label><span>${esc(p.lab)}</span></div>
            <div class="detail-field"><label>Inicio</label><span>${fmtDT(p.inicio)}</span></div>
            <div class="detail-field"><label>Devolución</label><span>${fmtDT(p.fin)}</span></div>
            <div class="detail-field"><label>Duración</label><span>${dur(p.inicio,p.fin)}</span></div>
            ${p.notas?`<div class="detail-field" style="grid-column:1/-1"><label>Notas</label><span>${esc(p.notas)}</span></div>`:''}
        </div>
        <div class="timeline">
            <div class="tl-step"><div class="tl-dot ${dot(0)}">${icon(dot(0))}</div><span class="tl-label">Pendiente</span></div>
            <div class="tl-line ${si>0&&p.estado!=='Cancelado'&&p.estado!=='Vencido'?'done':''}"></div>
            <div class="tl-step"><div class="tl-dot ${dot(1)}">${icon(dot(1))}</div><span class="tl-label">Activo</span></div>
            <div class="tl-line ${si>1&&p.estado!=='Cancelado'&&p.estado!=='Vencido'?'done':''}"></div>
            <div class="tl-step"><div class="tl-dot ${dot(2)}">${icon(dot(2))}</div><span class="tl-label">${p.estado==='Cancelado'?'Cancelado':p.estado==='Vencido'?'Vencido':'Devuelto'}</span></div>
        </div>
        <p class="section-label" style="margin-top:0">Artículos prestados</p>
        <table class="detail-table">
            <thead><tr><th>Tipo</th><th>Artículo</th><th style="text-align:center">Cantidad</th></tr></thead>
            <tbody>${items.map(it=>`<tr><td><span class="${it.tipo==='Activo'?'badge-tipo-a':'badge-tipo-c'}">${esc(it.tipo)}</span></td><td>${esc(it.nombre)}</td><td style="text-align:center;font-weight:600">${it.cantidad}</td></tr>`).join('')}</tbody>
        </table>
        <div class="modal-actions">
            <button class="btn-secondary" onclick="cerrarDetalle()">Cerrar</button>
            ${p.estado==='Pendiente'||p.estado==='Activo'?`<button class="btn-primary" onclick="cerrarDetalle();abrirEditar(${p.id})">Editar</button>`:''}
        </div>`;
    document.getElementById('modalDetalle').classList.add('active');
}
function cerrarDetalle(){ document.getElementById('modalDetalle').classList.remove('active'); }

/* ─── Confirm ────────────────────────────────────────────── */
let _cb = null;
function openConfirm({title, desc, btnLabel, btnClass, cb}){
    document.getElementById('ci-title').textContent  = title;
    document.getElementById('ci-desc').innerHTML     = desc;
    const btn = document.getElementById('btn-confirmar');
    btn.textContent = btnLabel;
    btn.className   = btnClass || 'btn-danger';
    _cb = cb;
    document.getElementById('modalConfirm').classList.add('active');
}
function cerrarConfirm(){ document.getElementById('modalConfirm').classList.remove('active'); _cb = null; }

function pedirEliminar(id){
    const p = prestamos.find(x => x.id === id); if (!p) return;
    openConfirm({
        title:    'Eliminar préstamo',
        desc:     `Se eliminará permanentemente el préstamo <strong>${esc(p.folio)}</strong>.`,
        btnLabel: 'Eliminar',
        btnClass: 'btn-danger',
        cb: () => eliminarPrestamo(id)
    });
}
function pedirCancelar(id){
    const p = prestamos.find(x => x.id === id); if (!p) return;
    openConfirm({
        title:    'Cancelar préstamo',
        desc:     `Se cancelará el préstamo <strong>${esc(p.folio)}</strong> de ${esc(p.solicitante)}.`,
        btnLabel: 'Sí, cancelar',
        btnClass: 'btn-warning',
        cb: () => cancelarPrestamo(id)
    });
}

/* ─── Eventos ────────────────────────────────────────────── */
document.getElementById('btn-nuevo').addEventListener('click', abrirNuevo);
document.getElementById('btn-add-item').addEventListener('click', () => addItem());
document.getElementById('btn-guardar').addEventListener('click', guardar);
document.getElementById('btn-close-form').addEventListener('click', cerrarForm);
document.getElementById('btn-cancelar-form').addEventListener('click', cerrarForm);
document.getElementById('formOverlay').addEventListener('click', cerrarForm);
document.getElementById('btn-close-detalle').addEventListener('click', cerrarDetalle);
document.getElementById('detalleOverlay').addEventListener('click', cerrarDetalle);
document.getElementById('btn-cancelar-confirm').addEventListener('click', cerrarConfirm);
document.getElementById('confirmOverlay').addEventListener('click', cerrarConfirm);
document.getElementById('btn-confirmar').addEventListener('click', () => { cerrarConfirm(); if (_cb) _cb(); });
document.getElementById('selectAll').addEventListener('change', function(){
    document.querySelectorAll('#prestamosTable .table-checkbox').forEach(cb => cb.checked = this.checked);
});

let debounceSearch;
document.getElementById('searchInput').addEventListener('input', () => { 
    clearTimeout(debounceSearch); 
    debounceSearch = setTimeout(applyFilters, 250); 
});

/*if (sidebarToggle) sidebarToggle.addEventListener('click', () => document.querySelector('.sidebar').classList.toggle('collapsed'));*/

const logoutBtn = document.querySelector('.logout-btn');
if (logoutBtn) logoutBtn.addEventListener('click', () => { if (confirm('¿Cerrar sesión?')) window.location.href = '../login.html'; });

/* ─── Init ───────────────────────────────────────────────── */
cargarPrestamos();