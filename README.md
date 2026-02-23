# 📦 Magastore - Sistema de Rastreo de Paquetes

Este es el módulo de rastreo de carga orientado al cliente para el ecosistema de Magastore. Permite a los usuarios finales consultar el estado en tiempo real de sus importaciones mediante su número de tracking, ofreciendo una experiencia visual moderna y fluida.

### 🚀 Características

• Rastreo en Tiempo Real: Visualización detallada del historial de paquetes.

• Interfaz de Usuario Premium: Diseño limpio basado en Tailwind CSS con estados visuales claros (En Aduana, Entregado, etc.).

• Diseño Responsivo: Optimizado para dispositivos móviles y escritorio.

• Acceso Rápido: Integración directa con el Backoffice para administradores mediante navegación protegida.

• Feedback Visual: Animaciones de entrada y estados de carga simulados para una mejor UX.

### 🛠️ Stack Tecnológico

• Framework: Next.js(https://nextjs.org/) (React)

• Lenguaje: TypeScript

• Estilos: Tailwind CSS

• Iconografía: Lucide React

• Componentes: Librería interna de componentes (`Typography`, `DashboardLayout`, etc.)

### 📁 Estructura del Módulo

El archivo principal se encuentra en: `./src/pages/tracking/index.tsx`

# ⚙️ Instalación y Desarrollo

1. Clonar el repositorio:

```

git clone https://github.com/tu-usuario/magastore-sistema.git

```

2. Instalar dependencias:

```

npm install

```

3. Ejecutar en local:

```

npm run dev

```

4. Abrir el navegador: Visita `http://localhost:3000/tracking` para ver el rastreador.

### 📝 Notas de Implementación

Manejo de Caracteres Especiales (Linting)

Para cumplir con las reglas de ESLint (`react/no-unescaped-entities`), todos los textos que contienen comillas o símbolos especiales en el JSX han sido escapados utilizando entidades HTML (ej. `&quot;`).

Simulación de Datos (Mocking)

Actualmente, el componente utiliza un objeto `MOCK_PACKAGE_RESULT` que simula la respuesta de la base de datos de paquetes (`BD PAQUETES.csv`). Para conectar con la API real, se debe sustituir la lógica dentro de la función `handleSearch`.

### 🤝 Contribución

1. Crea una rama para tu mejora: `git checkout -b feature/MejoraIncreible`

2. Haz tus cambios y dales commit: `git commit -m "Añadida nueva funcionalidad"`

3. Sube la rama: `git push origin feature/MejoraIncreible`

4. Abre un Pull Request.

---
