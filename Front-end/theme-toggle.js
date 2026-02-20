/**
 * ISC Inventory System - Theme Toggle
 * Sistema de cambio de tema claro/oscuro
 * Incluye persistencia en localStorage y detección de preferencias del sistema
 */

(function() {
    'use strict';

    // Inicializar el tema cuando el DOM esté listo
    function initTheme() {
        const html = document.documentElement;
        
        // Cargar tema guardado o usar preferencia del sistema
        const savedTheme = localStorage.getItem('theme');
        const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        const currentTheme = savedTheme || systemPreference;
        
        // Aplicar tema al cargar
        html.setAttribute('data-theme', currentTheme);
        
        // Configurar el botón de toggle
        setupToggleButton();
        
        // Escuchar cambios en preferencia del sistema
        watchSystemPreference();
    }

    // Configurar el evento del botón de toggle
    function setupToggleButton() {
        const themeToggle = document.getElementById('themeToggle');
        
        if (!themeToggle) {
            console.warn('Theme toggle button not found. Make sure element with id="themeToggle" exists.');
            return;
        }
        
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Función para cambiar el tema
    function toggleTheme() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        // Aplicar nuevo tema
        html.setAttribute('data-theme', newTheme);
        
        // Guardar en localStorage
        localStorage.setItem('theme', newTheme);
        
        // Disparar evento personalizado (útil para otros scripts)
        const event = new CustomEvent('themeChanged', { 
            detail: { theme: newTheme } 
        });
        document.dispatchEvent(event);
    }

    // Escuchar cambios en la preferencia del sistema
    function watchSystemPreference() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        mediaQuery.addEventListener('change', (e) => {
            // Solo cambiar si el usuario no tiene una preferencia guardada
            if (!localStorage.getItem('theme')) {
                const html = document.documentElement;
                const newTheme = e.matches ? 'dark' : 'light';
                html.setAttribute('data-theme', newTheme);
            }
        });
    }

    // Función pública para obtener el tema actual
    window.getCurrentTheme = function() {
        return document.documentElement.getAttribute('data-theme');
    };

    // Función pública para establecer un tema específico
    window.setTheme = function(theme) {
        if (theme !== 'light' && theme !== 'dark') {
            console.error('Invalid theme. Use "light" or "dark".');
            return;
        }
        
        const html = document.documentElement;
        html.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    };

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTheme);
    } else {
        initTheme();
    }

})();