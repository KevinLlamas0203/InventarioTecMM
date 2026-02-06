// ISC Inventory System - Main JavaScript

// Sidebar toggle functionality
document.addEventListener('DOMContentLoaded', function() {
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }
    
    // Logout functionality
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
                window.location.href = 'login.html';
            }
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
    
    // Select all checkbox functionality
    const selectAllCheckbox = document.querySelector('thead .table-checkbox');
    const rowCheckboxes = document.querySelectorAll('tbody .table-checkbox');
    
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            rowCheckboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
            });
        });
    }
    
    // Update select all checkbox when individual checkboxes change
    rowCheckboxes.forEach(checkbox => {
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
    if (searchInput) {
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
        select.addEventListener('change', function() {
            applyFilters();
        });
    });
});

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
        const rowCategory = row.querySelector('.badge')?.textContent;
        const rowStatus = row.querySelector('.status')?.textContent;
        
        const categoryMatch = !category || category === 'Todas las categorías' || rowCategory === category;
        const statusMatch = !status || status === 'Todos los estados' || rowStatus === status;
        
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