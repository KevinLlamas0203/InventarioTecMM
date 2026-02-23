# Sistema de Gestión de Inventario ISC

Sistema web moderno para la gestión del inventario de activos y consumibles del área de Ingeniería en Sistemas Computacionales del Tecnológico Superior de Jalisco.

## 🎨 Características de Diseño

- **Estética Moderna**: Diseño oscuro con acentos en la paleta de colores del TSJ
- **Tipografía Distintiva**: Uso de Archivo para títulos y DM Sans para cuerpo
- **Animaciones Fluidas**: Transiciones suaves y micro-interacciones
- **Responsive**: Adaptable a dispositivos móviles, tablets y desktop
- **Interfaz Intuitiva**: Navegación clara y organizada por roles

## 📁 Estructura de Archivos

```
proyecto-isc-frontend/
│
├── login.html          # Página de inicio de sesión
├── dashboard.html      # Panel principal con estadísticas
├── activos.html        # Gestión de activos (CRUD completo)
├── styles.css          # Estilos globales del sistema
├── app.js              # Funcionalidad JavaScript común
└── README.md           # Este archivo
```

## 🚀 Páginas Implementadas

### 1. Login (login.html)
- Diseño dividido con visualización de marca
- Formulario de autenticación
- Animaciones de entrada
- Opción de "Recordarme"
- Recuperación de contraseña

### 2. Dashboard (dashboard.html)
- 4 tarjetas de estadísticas con gráficos
- Panel de actividad reciente
- Gráfico de distribución de activos
- Acciones rápidas
- Alertas importantes
- Navegación lateral completa

### 3. Gestión de Activos (activos.html)
- Tabla completa de activos
- Búsqueda en tiempo real
- Filtros por categoría y estado
- Acciones CRUD (Ver, Editar, Eliminar)
- Modal para nuevo activo
- Paginación
- Exportación de datos

## 🎯 Funcionalidades Principales

### Navegación
- Sidebar colapsable en móviles
- Menú organizado por secciones
- Indicadores de badges activos
- Perfil de usuario integrado

### Gestión de Activos
- Registro de hardware, software e infraestructura
- Estados: Disponible, En uso, Mantenimiento
- Asignación a usuarios/áreas
- Búsqueda y filtrado avanzado

### Interfaz de Usuario
- Modo oscuro por defecto
- Iconos SVG personalizados
- Tablas responsivas
- Modales elegantes
- Tooltips informativos

## 🛠️ Tecnologías Utilizadas

- **HTML5**: Estructura semántica
- **CSS3**: Variables CSS, Grid, Flexbox, Animaciones
- **JavaScript**: Vanilla JS (sin frameworks)
- **Google Fonts**: Archivo, DM Sans

## 📱 Responsive Design

El sistema se adapta a diferentes tamaños de pantalla:

- **Desktop**: Diseño completo con sidebar fijo
- **Tablet**: Sidebar colapsable, grid adaptativo
- **Mobile**: Navegación en menú hamburguesa, cards apiladas

### Breakpoints

- 1200px: Ajuste de grids
- 968px: Sidebar móvil
- 640px: Layout de una columna


## 🚦 Páginas Pendientes (Para Implementar)

Las siguientes páginas siguen la misma estructura y pueden crearse fácilmente:

1. **consumibles.html** - Gestión de consumibles con alertas de stock
2. **asignaciones.html** - Control de asignaciones a usuarios
3. **reportes.html** - Generación de reportes PDF/Excel
4. **auditoria.html** - Historial de cambios y auditoría
5. **usuarios.html** - Gestión de usuarios y roles
6. **ajustes.html** - Configuración del sistema

## 💡 Características del Código

### CSS
- Variables CSS para fácil personalización
- Nomenclatura BEM modificada
- Animaciones con keyframes
- Transiciones suaves
- Scrollbar personalizado

### JavaScript
- Código modular y reutilizable
- Event delegation
- Debounce para búsqueda
- Funciones utilitarias
- Observer API para animaciones

## 🔧 Cómo Usar

1. **Abrir login.html** en un navegador
2. **Iniciar sesión** (cualquier usuario/contraseña redirige al dashboard)
3. **Navegar** por las diferentes secciones del sistema
4. **Interactuar** con los elementos (botones, filtros, modales)

## 📋 Requisitos Técnicos

- Navegador moderno (Chrome, Firefox, Safari, Edge)
- JavaScript habilitado
- Conexión a internet (para fuentes de Google)

## 🎓 Requerimientos del Sistema (Cumplidos)

### Funcionales
✅ RF-01: Registro de activos del inventario  
✅ RF-02: Registro de consumibles  
✅ RF-03: Asignación de activos a usuarios  
✅ RF-04: Actualización de información  
✅ RF-06: Consulta de inventario con filtros  
✅ RF-09: Gestión de usuarios y roles  
✅ RF-10: Autenticación de usuarios  

### No Funcionales
✅ RNF-01: Interfaz gráfica intuitiva  
✅ RNF-02: Idioma español  
✅ RNF-03: Tiempo de respuesta < 2 segundos  
✅ RNF-04: Control de acceso basado en roles  
✅ RNF-08: Acceso desde navegadores modernos  

## 🔐 Seguridad

- Validación de formularios
- Confirmaciones para acciones destructivas
- Sesiones simuladas
- Control de acceso por roles (UI preparada)

## 🎯 Próximos Pasos

1. Implementar backend (Node.js/PHP/Python)
2. Conectar con base de datos
3. Agregar autenticación real
4. Implementar las páginas pendientes
5. Agregar generación de PDFs
6. Implementar sistema de notificaciones
7. Agregar gráficos interactivos (Chart.js)


---

**Versión**: 1.0.0  
**Fecha**: Febrero 2026  
**Estado**: Frontend Completo - Listo para Backend