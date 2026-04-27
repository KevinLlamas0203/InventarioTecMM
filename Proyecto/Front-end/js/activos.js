// ========================================
// ISC Inventory System - Activos JS
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    initializeActivosEvents();
    initializePagination();
});

// ========================================
// MODAL DE DETALLES
// ========================================

function initializeActivosEvents() {
    ensureModalExists();
    const table = document.getElementById('activosTable');
    
    if (table) {
        // 1. Limpieza preventiva: Eliminar onclick inline de los botones para evitar popups nativos
        const buttons = table.querySelectorAll('button, .btn, .action-btn');
        buttons.forEach(btn => {
            // Identificar botones de "Ver" por texto, título o icono
            const text = btn.textContent.toLowerCase();
            const title = (btn.title || '').toLowerCase();
            
            if (text.includes('ver') || title.includes('ver') || title.includes('detalle') || btn.querySelector('.fa-eye')) {
                // Remover evento onclick inline si existe
                if (btn.hasAttribute('onclick')) {
                    btn.removeAttribute('onclick');
                    btn.onclick = null;
                }
                // Añadir clase identificadora
                btn.classList.add('js-view-btn');
            }
        });

        // Delegación de eventos para la tabla
        table.addEventListener('click', function(e) {
            // Detectar clic en botón "Ver detalles"
            // Busca un botón con clase .btn-view o que contenga un icono de ojo/detalles
            const viewBtn = e.target.closest('.js-view-btn') || 
                           e.target.closest('.action-btn.view') || 
                           e.target.closest('button[title="Ver detalles"]') ||
                           e.target.closest('.btn-details') ||
                           // Fallback genérico para botones con icono de ojo
                           (e.target.closest('button') && e.target.closest('button').querySelector('.fa-eye'));
            
            if (viewBtn) {
                e.preventDefault();
                e.stopImmediatePropagation(); // Detener otros scripts
                const row = viewBtn.closest('tr');
                openDetallesModal(row);
            }
        });
    }

    // Eventos para cerrar modal
    // Usar delegación en document para asegurar que funcione incluso si el modal se inyecta tarde
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal-close') || e.target.classList.contains('modal-overlay')) {
            const modal = document.getElementById('detallesActivoModal');
            if (modal) modal.classList.remove('active');
        }
    });

    // Cerrar con tecla ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('detallesActivoModal');
            if (modal && modal.classList.contains('active')) {
                modal.classList.remove('active');
            }
        }
    });
}

function ensureModalExists() {
    // Inyectar HTML del modal si no existe en el documento
    if (!document.getElementById('detallesActivoModal')) {
        const modalHTML = `
        <div class="modal" id="detallesActivoModal">
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Detalles del Activo</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="detail-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                        <div class="detail-item"><label style="display:block;color:#666;font-size:0.875rem;margin-bottom:0.25rem">Código</label><p id="modalCodigo" style="font-weight:600"></p></div>
                        <div class="detail-item"><label style="display:block;color:#666;font-size:0.875rem;margin-bottom:0.25rem">Estado</label><span id="modalEstado" class="badge"></span></div>
                        <div class="detail-item" style="grid-column: span 2"><label style="display:block;color:#666;font-size:0.875rem;margin-bottom:0.25rem">Nombre</label><p id="modalNombre"></p></div>
                        <div class="detail-item" style="grid-column: span 2"><label style="display:block;color:#666;font-size:0.875rem;margin-bottom:0.25rem">Descripción</label><p id="modalDescripcion"></p></div>
                        <div class="detail-item"><label style="display:block;color:#666;font-size:0.875rem;margin-bottom:0.25rem">Categoría</label><p id="modalCategoria"></p></div>
                        <div class="detail-item"><label style="display:block;color:#666;font-size:0.875rem;margin-bottom:0.25rem">Ubicación</label><p id="modalUbicacion"></p></div>
                        <div class="detail-item" style="grid-column: span 2"><label style="display:block;color:#666;font-size:0.875rem;margin-bottom:0.25rem">Asignado a</label><p id="modalAsignado"></p></div>
                    </div>
                </div>
                <div class="modal-footer" style="margin-top:1.5rem;display:flex;justify-content:flex-end;gap:0.5rem">
                    <button class="btn-secondary modal-close">Cerrar</button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
}

function openDetallesModal(row) {
    const modal = document.getElementById('detallesActivoModal');
    if (!modal) {
        console.warn('El modal #detallesActivoModal no existe en el DOM');
        return;
    }

    // Extraer datos de la fila (asumiendo estructura estándar del proyecto)
    // Índices: 1:Código, 2:Activo(Nombre/Desc), 3:Categoría, 4:Ubicación, 5:Estado
    const cells = row.cells;
    
    // Funciones helper para extracción segura
    const getText = (idx) => cells[idx]?.textContent.trim() || 'N/A';
    const getNombre = () => cells[2]?.querySelector('strong')?.textContent || 
                           cells[2]?.textContent.trim().split('\n')[0] || 'Sin nombre';
    const getDesc = () => cells[2]?.querySelector('small')?.textContent || 
                          cells[2]?.textContent.replace(getNombre(), '').trim() || '';

    const data = {
        codigo: getText(1),
        nombre: getNombre(),
        descripcion: getDesc(),
        categoria: getText(3),
        ubicacion: getText(4),
        estado: getText(5).replace(/\s+/g, ' ').trim(),
        asignado: getText(6) || 'Sin asignar' // Asumiendo columna extra o dato oculto
    };

    // Poblar el modal
    document.getElementById('modalCodigo').textContent = data.codigo;
    document.getElementById('modalNombre').textContent = data.nombre;
    document.getElementById('modalDescripcion').textContent = data.descripcion;
    document.getElementById('modalCategoria').textContent = data.categoria;
    document.getElementById('modalUbicacion').textContent = data.ubicacion;
    document.getElementById('modalAsignado').textContent = data.asignado;

    // Configurar badge de estado
    const statusBadge = document.getElementById('modalEstado');
    if (statusBadge) {
        statusBadge.textContent = data.estado;
        // Limpiar clases anteriores y poner la correcta
        statusBadge.className = 'badge'; 
        if (data.estado.toLowerCase().includes('disponible')) statusBadge.classList.add('status-available');
        else if (data.estado.toLowerCase().includes('uso')) statusBadge.classList.add('status-in-use');
        else statusBadge.classList.add('status-maintenance');
    }

    modal.classList.add('active');
}

// ========================================
// PAGINACIÓN
// ========================================

const ITEMS_PER_PAGE = 4; // Configurado a 4 según requerimiento
let currentPage = 1;

function initializePagination() {
    const table = document.getElementById('activosTable');
    if (!table) return;

    updateTableDisplay();
}

function updateTableDisplay() {
    const table = document.getElementById('activosTable');
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const totalRows = rows.length;

    // Calcular índices
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalRows);

    // Mostrar/Ocultar filas
    rows.forEach((row, index) => {
        if (index >= startIndex && index < endIndex) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });

    // Actualizar texto de información "Mostrando 1-4 de X"
    const infoText = document.querySelector('.table-info');
    if (infoText) {
        const displayStart = totalRows === 0 ? 0 : startIndex + 1;
        infoText.innerHTML = `Mostrando <strong>${displayStart}-${endIndex}</strong> de <strong>${totalRows}</strong> activos`;
    }

    renderPaginationControls(totalRows);
}

function renderPaginationControls(totalRows) {
    const totalPages = Math.ceil(totalRows / ITEMS_PER_PAGE);
    const paginationContainer = document.querySelector('.pagination');
    
    if (!paginationContainer) return;
    
    let html = '';
    
    // Botón Anterior
    html += `<button class="page-btn prev-btn" onclick="changePage('prev')" ${currentPage === 1 ? 'disabled' : ''}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
             </button>`;
    
    // Números de página
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }
    
    if (startPage > 1) {
        html += `<button class="page-btn" onclick="window.goToPage(1)">1</button>`;
        if (startPage > 2) html += `<span class="page-dots">...</span>`;
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="window.goToPage(${i})">${i}</button>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<span class="page-dots">...</span>`;
        html += `<button class="page-btn" onclick="window.goToPage(${totalPages})">${totalPages}</button>`;
    }

    // Botón Siguiente
    html += `<button class="page-btn next-btn" onclick="changePage('next')" ${currentPage === totalPages ? 'disabled' : ''}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
             </button>`;
             
    paginationContainer.innerHTML = html;
}

window.goToPage = function(page) {
    currentPage = page;
    updateTableDisplay();
};

// Exponer función para cambiar página (para botones Siguiente/Anterior futuros)
window.changePage = function(direction) {
    const table = document.getElementById('activosTable');
    const totalRows = table.querySelectorAll('tbody tr').length;
    const maxPage = Math.ceil(totalRows / ITEMS_PER_PAGE);

    if (direction === 'next' && currentPage < maxPage) currentPage++;
    if (direction === 'prev' && currentPage > 1) currentPage--;
    
    updateTableDisplay();
};