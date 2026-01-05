# Tiendas Móvil

Bienvenido al repositorio de **Tiendas Móvil**. Esta es una aplicación móvil desarrollada con [Expo](https://expo.dev) y React Native, diseñada para la gestión de clientes y servicios, utilizando [Supabase](https://supabase.com) como backend.

## 🚀 Características Principales

- **Gestión de Clientes**: Visualización y edición de clientes.
- **Ruteo Dinámico**: Uso de Expo Router para navegación fluida.
- **Integración con Supabase**: Autenticación y base de datos en tiempo real.
- **UI Moderna**: Componentes estilizados y responsivos.

## 🛠 Tech Stack

- **Framework**: React Native con Expo (SDK 52+)
- **Lenguaje**: TypeScript
- **Navegación**: Expo Router
- **Backend / Base de Datos**: Supabase
- **Gestión de Estado/Data**: Hooks personalizados y Context API
- **Estilos**: StyleSheet estándar y constantes de diseño

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- [Node.js](https://nodejs.org/) (versión LTS recomendada)
- [Git](https://git-scm.com/)
- Un gestor de paquetes como `npm` (incluido con Node), `yarn` o `pnpm`.

> **Nota**: Recomendamos usar un dispositivo físico con Expo Go o un emulador (Android Studio / Xcode) para probar la app.

## 🔧 Instalación

1. **Clonar el repositorio:**

   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd tiendas_movil
   ```

2. **Instalar dependencias:**

   ```bash
   npm install
   ```

## ⚙️ Configuración

Actualmente, las credenciales de Supabase están configuradas en `lib/supabase.ts`.

> **Recomendación para Desarrolladores:**
> Para mayor seguridad y flexibilidad, se recomienda mover estas credenciales a variables de entorno. Crea un archivo `.env` en la raíz del proyecto y añade las siguientes variables (luego actualiza `lib/supabase.ts` para usarlas):
>
> ```bash
> EXPO_PUBLIC_SUPABASE_URL=tu_url_de_supabase
> EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
> ```

## 🏃‍♂️ Ejecutar la Aplicación

Para iniciar el servidor de desarrollo:

```bash
npm start
# o
npx expo start
```

Esto abrirá la interfaz de Expo CLI. Desde allí puedes:

- Presionar `a` para abrir en Android Emulator.
- Presionar `i` para abrir en iOS Simulator (solo macOS).
- Escanear el código QR con la app **Expo Go** en tu dispositivo físico.

## 📂 Estructura del Proyecto

- `app/`: Rutas y pantallas de la aplicación (File-based routing).
- `components/`: Componentes reutilizables de UI.
- `lib/`: Configuraciones de librerías externas (ej. Supabase).
- `services/`: Lógica de negocio y llamadas a la API.
- `types/`: Definiciones de tipos TypeScript globalmente compartidos (Interfaces, DTOs).

## 🤝 Contribuir

1. Haz un Fork del proyecto.
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`).
3. Haz commit de tus cambios (`git commit -m 'Add some AmazingFeature'`).
4. Haz push a la rama (`git push origin feature/AmazingFeature`).
5. Abre un Pull Request.

---

Desarrollado con ❤️ para gestión eficiente de tiendas.
