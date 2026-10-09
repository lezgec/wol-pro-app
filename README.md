# WoL Pro App

Base móvil Android e iOS con Expo, React Native y TypeScript. Reutiliza el panel Flask en Azure: https://wol.luiszamora.dev.

El panel se muestra en una WebView conservando formularios, sesiones, CSRF, equipos y órdenes del servidor. Incluye área segura, carga, recuperación de errores y navegación atrás Android. Los enlaces externos se abren en el navegador del sistema.

Backend, MariaDB, correo y Alexa siguen en [wol_panel](https://github.com/lezgec/wol_panel). No se copia la base de datos ni credenciales de Azure. El teléfono no envía UDP local: las órdenes siguen ejecutándose en el servidor.

## Desarrollo

Requiere Node.js LTS y Expo Go compatible con el SDK o un development build.

```sh
npm ci
cp .env.example .env
npm start
```

Escanear el QR con Expo Go. `npm run android` abre un emulador instalado; `npm run ios` requiere macOS y Xcode para el simulador. Primera etapa dirigida a Android e iOS, sin cliente web.

`EXPO_PUBLIC_BACKEND_URL` debe ser HTTPS; es pública y nunca debe contener secretos.

## Validación

```sh
npm run typecheck
npx expo-doctor
npx expo export --platform all
```

Antes de distribuir, probar en ambos sistemas: registro y verificación, acceso con correo, persistencia y cierre de sesión, equipos, encendido, navegación atrás, pérdida de red y recuperación. No se ha validado aún en dispositivos físicos.

La auditoría inicial de npm reporta 22 avisos transitivos (7 moderados y 15 altos) en las dependencias de Expo/React Native. `npm audit fix` no los resuelve; la corrección forzada propuesta retrocede a Expo 44 y rompe esta base. Revisarlos y actualizar el SDK o sus dependencias compatibles antes de distribuir.

Amazon abre el navegador externo. El retorno autenticado a la app requiere un flujo móvil con navegador del sistema y enlace de retorno; por ahora usar correo y contraseña. La vinculación Alexa existente se administra en el panel web.

## Compilación

Configurar una cuenta Expo y vincular el proyecto con `npx eas-cli@latest init`.

```sh
npx eas-cli@latest build --platform android --profile preview
npx eas-cli@latest build --platform all --profile production
```

Preview genera APK Android. iOS y tiendas requieren cuentas de desarrollador, firma y configuración de publicación. Confirmar los identificadores `dev.luiszamora.wolpro` antes de publicar. Este repositorio no modifica ni despliega Azure automáticamente.

## Próxima etapa

Agregar API móvil versionada al backend con autenticación apropiada, reutilizando lógica de usuarios, equipos y Alexa. Sustituir gradualmente el panel embebido por pantallas nativas. Completar OAuth Amazon, pruebas físicas y requisitos de tiendas antes de publicar.
