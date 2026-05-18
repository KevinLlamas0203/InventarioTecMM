// ISC Inventory System - Main JavaScript

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

function initPageFeatures() {
    // Select all checkbox functionality
    const selectAllCheckbox = document.querySelector('thead .table-checkbox');
    const rowCheckboxes = document.querySelectorAll('tbody .table-checkbox');
    
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
    const searchInput = document.querySelector('.search-input');
    if (searchInput && !searchInput.dataset.iscInit) {
        searchInput.dataset.iscInit = 'true';
        searchInput.addEventListener('input', debounce(function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const tableRows = document.querySelectorAll('tbody tr');
            
            tableRows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        }, 300));
    }
    
    // Filter functionality
    const filterSelects = document.querySelectorAll('.filter-select');
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
    const categoryFilter = document.querySelector('.filter-select:nth-of-type(1)');
    const statusFilter = document.querySelector('.filter-select:nth-of-type(2)');
    const tableRows = document.querySelectorAll('tbody tr');
    
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
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
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