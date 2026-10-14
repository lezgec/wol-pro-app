# WoL Pro 1.1.4 · Android 6

Versión preparada para actualizar por Google Play. Paquete `dev.luiszamora.wolpro`, versión `1.1.4`, código `6`.

Incluye acceso, registro, verificación de correo y recuperación con formularios nativos, y el tour recuperable desde Inicio/Cuenta. Conserva equipos, Control de PC, Alexa, planes y comprobación de compras. Azure ya responde a `/api/mobile/v1/auth/session` y `/mobile/bridge`; no carga formularios web para el acceso móvil.

## Firma y subida manual

1. Abre `C:\Users\lezgo\Desktop\wol-pro-app\android` en Android Studio y espera la sincronización de Gradle.
2. Selecciona **Build → Generate Signed App Bundle or APK → Android App Bundle**.
3. Elige la misma clave de carga y el alias que usaste en la publicación anterior. Existe `C:\Users\lezgo\Desktop\wol-pro-app\wolpro-release.jks`; úsala solo si es la clave usada para esa app. Introduce las contraseñas directamente en Android Studio.
4. Selecciona el módulo **app**, variante **release**, y genera el AAB firmado.
5. En Google Play Console, abre WoL Pro y crea una versión en el mismo canal de pruebas que estás utilizando. Sube el AAB y comprueba **1.1.4 / código 6**. Si ese código ya está utilizado, no lo reutilices: aumenta `android.versionCode` en `app.json` y regenera Android con Expo.
6. Guarda/envía el lanzamiento de prueba y, cuando esté disponible, actualiza desde Google Play con la cuenta de verificador.

El AAB sin firmar está en `dist/WoLPro-1.1.4-android6-SIN-FIRMAR.aab`. Se comprobó su manifiesto: paquete, versión 1.1.4 y código 6, sin firmas, y bundle con acceso nativo. No lo subas a Play antes de firmarlo; el asistente de Android Studio anterior genera el archivo firmado para publicar. El APK con firma debug tampoco puede actualizar una instalación con otra firma. No se desinstaló ni borró la app existente del emulador. No se publicaron credenciales, claves ni contraseñas.

TypeScript, lint y la compilación nativa `bundleRelease` pasaron. El proyecto Android se sincronizó con Expo `prebuild --platform android --no-install --no-clean`; no se editaron a mano sus carpetas generadas. La clave `.jks` sigue ignorada por Git.

## Notas para Google Play

```text
Inicio de sesión, registro y recuperación con pantallas nativas.
Nuevo recorrido guiado para aprender a configurar y utilizar WoL Pro.
Mejoras en la experiencia de acceso y configuración de equipos.
```

## Comprobación después de instalar

Prueba registro/correo, acceso con cuenta existente, recuperación, conservar sesión, cierre de sesión y bloqueo biométrico. Comprueba dispositivos, consulta de Control de PC, planes y restauración de compras. El tour debe poder cerrarse y volver a abrirse desde Inicio o Cuenta. Las pruebas locales no sustituyen estas comprobaciones en el teléfono.

Referencia: [firma y Google Play App Signing](https://developer.android.com/studio/publish/app-signing).
