// ========================================
// ISC Inventory System - Consumibles JS
// ========================================

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    initializeFilters();
    initializeForms();
    updateStockVisuals();
    initializeModals();
    initializeEventListeners();
});

// ========================================
// FILTROS Y BÚSQUEDA
// ========================================

function initializeFilters() {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const stockFilter = document.getElementById('stockFilter');

    if (searchInput) {
        searchInput.addEventListener('input', filterTable);
    }

    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterTable);
    }

    if (stockFilter) {
        stockFilter.addEventListener('change', filterTable);
    }
}

function filterTable() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter').value.toLowerCase();
    const stockFilter = document.getElementById('stockFilter').value;

    const rows = document.querySelectorAll('#consumiblesTable tr');

    let visibleCount = 0;

    rows.forEach(row => {
        const code = row.querySelector('.consumible-code')?.textContent.toLowerCase() || '';
        const name = row.querySelector('.consumible-name')?.textContent.toLowerCase() || '';
        const category = row.getAttribute('data-category') || '';
        const stock = parseInt(row.getAttribute('data-stock')) || 0;

        // Filtro de búsqueda
        const matchesSearch = code.includes(searchTerm) || name.includes(searchTerm);

        // Filtro de categoría
        const matchesCategory = !categoryFilter || category === categoryFilter;

        // Filtro de stock
        let matchesStock = true;
        if (stockFilter === 'critico') {
            matchesStock = stock < 10;
        } else if (stockFilter === 'bajo') {
            matchesStock = stock >= 10 && stock <= 30;
        } else if (stockFilter === 'medio') {
            matchesStock = stock > 30 && stock <= 100;
        } else if (stockFilter === 'alto') {
            matchesStock = stock > 100;
        }

        // Mostrar u ocultar fila
        if (matchesSearch && matchesCategory && matchesStock) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });

    // Actualizar contador
    updateTableInfo(visibleCount);
}

function updateTableInfo(count) {
    const tableInfo = document.querySelector('.table-info');
    if (tableInfo) {
        const total = document.querySelectorAll('#consumiblesTable tr').length;
        tableInfo.innerHTML = `Mostrando <strong>1-${count}</strong> de <strong>${total}</strong> consumibles`;
    }
}

// ========================================
// VISUALIZACIÓN DE STOCK
// ========================================

function updateStockVisuals() {
    const stockInfos = document.querySelectorAll('.stock-info');
    
    stockInfos.forEach(info => {
        const stockNumber = parseInt(info.querySelector('.stock-number').textContent);
        const row = info.closest('tr');
        const minStock = parseInt(row.cells[5].textContent);
        
        // Calcular porcentaje
        const percentage = (stockNumber / minStock) * 100;
        
        // Actualizar barra de progreso
        const stockFill = info.querySelector('.stock-fill');
        if (stockFill) {
            stockFill.style.width = Math.min(percentage, 100) + '%';
        }
        
        // Actualizar clases de estado
        info.classList.remove('critical', 'low', 'medium', 'high');
        
        if (stockNumber < 10) {
            info.classList.add('critical');
        } else if (stockNumber <= 30) {
            info.classList.add('low');
        } else if (stockNumber <= 100) {
            info.classList.add('medium');
        } else {
            info.classList.add('high');
        }
    });
}

// ========================================
// MODALES
// ========================================

function initializeModals() {
    // Cierra los modales con la tecla ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeConsumibleModal();
            closeStockModal();
        }
    });
}

function openConsumibleModal() {
    document.getElementById('consumibleModal')?.classList.add('active');
}

function closeConsumibleModal() {
    document.getElementById('consumibleModal')?.classList.remove('active');
}

function openStockModal(code) {
    const modal = document.getElementById('stockModal');
    if (modal) {
        modal.querySelector('#stockItemCode').value = code;
        modal.classList.add('active');
    }
}

function closeStockModal() {
    document.getElementById('stockModal')?.classList.remove('active');
}

// Hacer las funciones de modal accesibles globalmente para los `onclick` en el HTML
window.openConsumibleModal = openConsumibleModal;
window.closeConsumibleModal = closeConsumibleModal;
window.openStockModal = openStockModal;
window.closeStockModal = closeStockModal;

// ========================================
// FORMULARIOS
// ========================================

function initializeForms() {
    // Formulario de nuevo consumible
    const consumibleForm = document.querySelector('.consumible-form');
    if (consumibleForm) {
        consumibleForm.addEventListener('submit', handleConsumibleSubmit);
    }

    // Formulario de añadir stock
    const stockForm = document.querySelector('.stock-form');
    if (stockForm) {
        stockForm.addEventListener('submit', handleStockSubmit);
    }
}

function handleConsumibleSubmit(e) {
    e.preventDefault();
    
    // Aquí iría la lógica para guardar el consumible
    // Por ahora solo mostramos una confirmación
    
    alert('Consumible registrado exitosamente');
    closeConsumibleModal();
    
    // Resetear formulario
    e.target.reset();
}

function handleStockSubmit(e) {
    e.preventDefault();
    
    const code = document.getElementById('stockItemCode').value;
    const quantity = document.getElementById('stockQuantity').value;
    
    // Aquí iría la lógica para actualizar el stock
    // Por ahora solo mostramos una confirmación
    
    alert(`Stock actualizado para ${code}: +${quantity} unidades`);
    closeStockModal();
    
    // Resetear formulario
    e.target.reset();
    
    // Actualizar visualización
    updateStockVisuals();
}

// ========================================
// EVENT LISTENERS ADICIONALES
// ========================================

function initializeEventListeners() {
    // Cierre del banner de alerta
    const alertClose = document.querySelector('.alert-close');
    if (alertClose) {
        alertClose.addEventListener('click', function() {
            this.closest('.alert-banner').style.display = 'none';
        });
    }

    // Checkbox para seleccionar todo
    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
        selectAll.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('#consumiblesTable .table-checkbox');
            checkboxes.forEach(cb => cb.checked = this.checked);
        });
    }
}

// ========================================
// GENERACIÓN DE CÓDIGO AUTOMÁTICO
// ========================================

function generateConsumibleCode(category) {
    const prefixes = {
        'cables': 'CAB',
        'perifericos': 'PER',
        'papeleria': 'PAP',
        'limpieza': 'LIM',
        'componentes': 'COM'
    };
    
    const prefix = prefixes[category] || 'GEN';
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return `${prefix}-${randomNum}`;
}

// ========================================
// NOTIFICACIONES DE STOCK BAJO
// ========================================

function checkLowStock() {
    const lowStockItems = [];
    const rows = document.querySelectorAll('#consumiblesTable tr');
    
    rows.forEach(row => {
        const stock = parseInt(row.getAttribute('data-stock')) || 0;
        const code = row.querySelector('.consumible-code')?.textContent || '';
        const name = row.querySelector('.consumible-name')?.textContent || '';
        
        if (stock < 10) {
            lowStockItems.push({ code, name, stock });
        }
    });
    
    return lowStockItems;
}

// ========================================
// EXPORTACIÓN DE DATOS
// ========================================

function exportConsumibles() {
    const rows = document.querySelectorAll('#consumiblesTable tr');
    let csvContent = "Código,Nombre,Categoría,Stock Actual,Stock Mínimo,Unidad,Precio,Ubicación,Estado\n";
    
    rows.forEach(row => {
        if (row.style.display !== 'none') {
            const cells = row.querySelectorAll('td');
            const rowData = [
                cells[1]?.textContent.trim() || '',
                cells[2]?.querySelector('.consumible-name')?.textContent.trim() || '',
                cells[3]?.textContent.trim() || '',
                cells[4]?.querySelector('.stock-number')?.textContent.trim() || '',
                cells[5]?.textContent.trim() || '',
                cells[6]?.textContent.trim() || '',
                cells[7]?.textContent.trim() || '',
                cells[8]?.textContent.trim() || '',
                cells[9]?.textContent.trim() || ''
            ].join(',');
            
            csvContent += rowData + "\n";
        }
    });
    
    // Crear y descargar archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `consumibles_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ========================================
// ORDENAMIENTO DE TABLA
// ========================================

function sortTable(columnIndex, ascending = true) {
    const table = document.querySelector('#consumiblesTable');
    const rows = Array.from(table.querySelectorAll('tr'));
    
    rows.sort((a, b) => {
        const aValue = a.cells[columnIndex]?.textContent.trim() || '';
        const bValue = b.cells[columnIndex]?.textContent.trim() || '';
        
        // Intentar comparar como números
        const aNum = parseFloat(aValue.replace(/[^0-9.-]/g, ''));
        const bNum = parseFloat(bValue.replace(/[^0-9.-]/g, ''));
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
            return ascending ? aNum - bNum : bNum - aNum;
        }
        
        // Comparar como strings
        return ascending 
            ? aValue.localeCompare(bValue) 
            : bValue.localeCompare(aValue);
    });
    
    // Reorganizar filas
    rows.forEach(row => table.appendChild(row));
}

// ========================================
// ACCIONES MASIVAS
// ========================================

function getSelectedItems() {
    const selected = [];
    const checkboxes = document.querySelectorAll('#consumiblesTable .table-checkbox:checked');
    
    checkboxes.forEach(checkbox => {
        const row = checkbox.closest('tr');
        const code = row.querySelector('.consumible-code')?.textContent || '';
        const name = row.querySelector('.consumible-name')?.textContent || '';
        
        selected.push({ code, name, row });
    });
    
    return selected;
}

function deleteSelectedItems() {
    const selected = getSelectedItems();
    
    if (selected.length === 0) {
        alert('No hay consumibles seleccionados');
        return;
    }
    
    if (confirm(`¿Estás seguro de eliminar ${selected.length} consumible(s)?`)) {
        selected.forEach(item => {
            item.row.remove();
        });
        
        alert('Consumibles eliminados exitosamente');
        updateStockVisuals();
    }
}

// ========================================
// VALIDACIONES
// ========================================

function validateStockQuantity(quantity, currentStock, maxStock = 9999) {
    const newStock = currentStock + quantity;
    
    if (quantity <= 0) {
        return { valid: false, message: 'La cantidad debe ser mayor a 0' };
    }
    
    if (newStock > maxStock) {
        return { valid: false, message: `El stock no puede exceder ${maxStock}` };
    }
    
    return { valid: true, newStock };
}

function validatePrice(price) {
    if (price < 0) {
        return { valid: false, message: 'El precio no puede ser negativo' };
    }
    
    if (price > 999999) {
        return { valid: false, message: 'El precio es demasiado alto' };
    }
    
    return { valid: true };
}

// ========================================
// UTILIDADES
// ========================================

function formatCurrency(amount) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(amount);
}

function formatDate(date) {
    return new Intl.DateTimeFormat('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date(date));
}

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

// ========================================
// EXPORT FUNCTIONS
// ========================================

// Hacer funciones disponibles globalmente si es necesario
window.exportConsumibles = exportConsumibles;
window.deleteSelectedItems = deleteSelectedItems;
window.sortTable = sortTable;