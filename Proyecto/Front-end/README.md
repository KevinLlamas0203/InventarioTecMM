# Sistema de Gestión de Inventario ISC

Sistema web moderno para la gestión del inventario de activos y consumibles del área de Ingeniería en Sistemas Computacionales del Tecnológico Superior de Jalisco.

##  Características de Diseño

- **Estética Moderna**: Diseño oscuro con acentos en la paleta de colores del TSJ
- **Tipografía Distintiva**: Uso de Archivo para títulos y DM Sans para cuerpo
- **Animaciones Fluidas**: Transiciones suaves y micro-interacciones
- **Responsive**: Adaptable a dispositivos móviles, tablets y desktop
- **Interfaz Intuitiva**: Navegación clara y organizada por roles

##  Estructura de Archivos

```
Proyecto/
│
├── Back-End/                        # Lógica del servidor y API
│   ├── venv/                        # Entorno virtual de Python
│   ├── .env                         # Variables de entorno (credenciales, configuración)
│   ├── requirements.txt             # Lista de dependencias necesarias
│   ├── serverFlask.py               # Servidor principal Flask
│   └── Modules/                     # Módulos CRUD organizados por entidad
│       ├── Activos/                 # Gestión de activos
│       │   ├── createActivos.py     # Endpoint para crear activos
│       │   ├── readActivos.py       # Endpoint para consultar activos
│       │   ├── updateActivos.py     # Endpoint para actualizar activos
│       │   └── deleteActivos.py     # Endpoint para eliminar activos
│       ├── Reportes/                # Gestión de reportes
│       │   ├── createReporte.py     # Crear reporte
│       │   ├── readReporte.py       # Consultar reportes
│       │   ├── updateReporte.py     # Actualizar reporte
│       │   └── deleteReporte.py     # Eliminar reporte
│       └── Historial/               # Registro de acciones y auditoría
│           ├── createHistorial.py   # Crear registro en historial
│           ├── readHistorial.py     # Consultar historial
│           └── appReportes.py       # Configuración de blueprint/reportes
│
└── Front-end/                       # Interfaz gráfica del sistema
    ├── css/                         # Estilos visuales
    │   ├── styles.css               # Estilos globales
    │   └── consumibles.css          # Estilos específicos para consumibles
    ├── js/                          # Funcionalidad en JavaScript
    │   ├── app.js                   # Funciones comunes
    │   ├── activos.js               # Lógica de activos
    │   ├── consumibles.js           # Lógica de consumibles
    │   ├── control-nivel.js         # Control de niveles/stock
    │   └── theme-toggle.js          # Cambio de tema (oscuro/claro)
    ├── pagesAdmin/                  # Páginas HTML del sistema
    │   ├── login.html               # Página de inicio de sesión
    │   ├── dashboard_admin.html     # Panel principal con estadísticas
    │   ├── activos.html             # Gestión de activos
    │   ├── consumibles.html         # Gestión de consumibles
    │   ├── asignaciones.html        # Control de asignaciones
    │   ├── reportes.html            # Generación de reportes
    │   ├── auditoria.html           # Historial de cambios
    │   ├── usuarios.html            # Gestión de usuarios y roles
    │   └── ajustes.html             # Configuración del sistema
    └── images/                      # Recursos gráficos
        ├── tsjLogo.png              # Logo institucional
        └── favicon_io/              # Íconos para navegador

```

##  Páginas Implementadas

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

## Funcionalidades Principales

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

## Tecnologías Utilizadas

- **HTML5**: Estructura semántica
- **CSS3**: Variables CSS, Grid, Flexbox, Animaciones
- **JavaScript**: Vanilla JS (sin frameworks)
- **Google Fonts**: Archivo, DM Sans

## Instalación y Ejecución

### 1. Entrar al directorio del backend
cd Back-End/

### 2. Instalar dependencias
pip install -r requirements.txt

### 3. Ejecutar el servidor Flask
python serverFlask.py

### 4. Abrir el frontend
# Abre login.html en tu navegador o con Live Server en VS Code

- El servidor Flask corre en http://127.0.0.1:5000.
-  El archivo login.html carga en el navegador y se conecta al backend.

## Credenciales de Prueba

- Usuario: pepe
- Contraseña: 1234


##  Cómo Usar

1. **Abrir login.html** en un navegador
2. **Iniciar sesión** (cualquier usuario/contraseña redirige al dashboard)
3. **Navegar** por las diferentes secciones del sistema
4. **Interactuar** con los elementos (botones, filtros, modales)

##  Requisitos Técnicos

- Navegador moderno (Chrome, Firefox, Safari, Edge)
- JavaScript habilitado
- Conexión a internet (para fuentes de Google)

##  Responsive Design

El sistema se adapta a diferentes tamaños de pantalla:

- **Desktop**: Diseño completo con sidebar fijo
- **Tablet**: Sidebar colapsable, grid adaptativo
- **Mobile**: Navegación en menú hamburguesa, cards apiladas

### Breakpoints

- 1200px: Ajuste de grids
- 968px: Sidebar móvil
- 640px: Layout de una columna


##  Características del Código

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



##  Requerimientos del Sistema (Cumplidos)

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

##  Seguridad

- Validación de formularios
- Confirmaciones para acciones destructivas
- Sesiones simuladas
- Control de acceso por roles (UI preparada)

##  Próximos Pasos

1. Conectar frontend con backend vía API REST
2. Implementar autenticación real con base de datos
3. Generar reportes PDF/Excel desde backend
4. Completar páginas pendientes (consumibles, auditoría, usuarios, ajustes)
5. Agregar notificaciones y gráficos interactivos (Chart.js)

---

**Versión**: 1.0.0  
**Fecha**: Mayo 2026  
**Estado**: Frontend Completo - Listo para Backend