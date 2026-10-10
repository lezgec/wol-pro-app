# WoL Pro App

App móvil Android e iOS con Expo, React Native y TypeScript. Reutiliza el panel Flask en Azure: https://wol.luiszamora.dev.

Después de iniciar sesión, la app muestra navegación inferior nativa: Inicio, Dispositivos, Control y Cuenta. Incluye formularios nativos para agregar y editar nombre/MAC, eliminación y estado de dispositivos, instrucciones Alexa y cierre de sesión. Control permite vincular el agente por código, ejecutar aplicaciones/comandos autorizados, solicitar apagado protegido, guardar/eliminar acciones compartidas con el panel y Alexa, consultar historial y cancelar órdenes pendientes o apagados en cuenta atrás. El acceso y registro de cuentas siguen en el panel web. Incluye área segura, carga, recuperación de errores y navegación atrás Android. Los enlaces externos se abren en el navegador del sistema.

La API `/api/mobile/v1/devices` permite listar/crear dispositivos y `/api/mobile/v1/devices/{id}` editar/eliminar los propios. `/api/mobile/v1/control` expone el catálogo, presencia, acciones e historial del agente. Las órdenes viajan por HTTPS a la cola existente de Azure, sin depender de la red local del teléfono. Las solicitudes se ejecutan mediante un puente en la WebView del mismo origen; la cookie HttpOnly y el token CSRF permanecen allí. No se crean tokens móviles persistentes ni se copian contraseñas. La app valida el origen y correlaciona respuestas; no reintenta escrituras automáticamente.

La pantalla nativa requiere el backend actualizado. Si la API aún no está disponible, se mantiene el panel web. Router por Internet aparece deshabilitado como «Próximamente», sin campos IP/puerto. Los nuevos dispositivos usan Alexa; al editar se conserva el método existente. La API móvil también bloquea el encendido directo, aunque un cliente anterior lo intente. Alexa muestra instrucciones y el estado real de vinculación.

Control actualiza el estado en segundo plano sin mostrar el indicador de recarga ni deshabilitar botones durante las consultas automáticas. El indicador aparece al actualizar manualmente. Si falla una consulta, conserva la última información y muestra un aviso; las nuevas órdenes quedan deshabilitadas hasta confirmar de nuevo el estado, pero se permite intentar cancelar una orden conocida. Las acciones del usuario tienen prioridad sobre una consulta automática pendiente.

Backend, MariaDB, correo y Alexa siguen en [wol_panel](https://github.com/lezgec/wol_panel). No se copia la base de datos ni credenciales de Azure. El teléfono no envía UDP local: las órdenes siguen ejecutándose en el servidor.

## Desarrollo

Requiere Node.js 22.13 o posterior y Expo Go compatible con el SDK o un development build.

```sh
npm ci
cp .env.example .env
npm start
```

Abre el development build de WoL Pro y conecta al servidor de desarrollo. Face ID requiere una compilación propia en iOS. `npm run android` abre un emulador instalado; `npm run ios` requiere macOS y Xcode para el simulador. Primera etapa dirigida a Android e iOS, sin cliente web.

`EXPO_PUBLIC_BACKEND_URL` debe ser HTTPS; es pública y nunca debe contener secretos.

## Validación

```sh
npm run typecheck
npm run lint
npm test
npx expo-doctor
npx expo export --platform all
```

Antes de distribuir, probar en ambos sistemas: registro y verificación, acceso con correo, persistencia y cierre de sesión, equipos, encendido, navegación atrás, pérdida de red y recuperación. No se ha validado aún en dispositivos físicos.

La auditoría actual de npm reporta 28 avisos transitivos (10 moderados y 18 altos) en las dependencias de Expo/React Native. `npm audit fix` no los resuelve; no debe aplicarse una corrección forzada que cambie a versiones incompatibles con este SDK. Revisarlos y actualizar el SDK o sus dependencias compatibles antes de distribuir.

Amazon abre el navegador externo. El retorno autenticado a la app requiere un flujo móvil con navegador del sistema y enlace de retorno; por ahora usar correo y contraseña. La vinculación Alexa existente se administra en el panel web.

## Compilación

Configurar una cuenta Expo y vincular el proyecto con `npx eas-cli@latest init`.

```sh
npx eas-cli@latest build --platform android --profile preview
npx eas-cli@latest build --platform all --profile production
```

Preview genera APK Android. iOS y tiendas requieren cuentas de desarrollador, firma y configuración de publicación. Confirmar los identificadores `dev.luiszamora.wolpro` antes de publicar. Este repositorio no modifica ni despliega Azure automáticamente.

### Android independiente del servidor de desarrollo

La variante `release` incluye el código JavaScript y los recursos dentro del APK. Se conecta por HTTPS a Azure y no necesita Expo/Metro, el ordenador de desarrollo ni estar en la misma red local. Conserva el acceso web y las pantallas nativas de la app.

En Android Studio abre `android`, sincroniza Gradle y selecciona `release` para el módulo `app` en **Build > Select Build Variant** (o la ventana **Build Variants**). Usa **Build > Build Bundle(s) / APK(s) > Build APK(s)** para generar el APK. La ruta de salida es `android/app/build/outputs/apk/release/app-release.apk`. Para volver a desarrollar con recarga automática, selecciona `debug`.

La compilación requiere Node.js 22.13 o posterior disponible para Gradle y el JDK de Android Studio. Desde una terminal con esas herramientas configuradas, el equivalente es `gradlew.bat :app:assembleRelease` dentro de `android`. Los cambios de JavaScript requieren generar e instalar de nuevo este APK; el botón Actualizar solo consulta Azure.

El plugin `plugins/withAndroidBuild.js` configura 3 GiB de heap y 1 GiB de Metaspace para Gradle; el límite generado de 512 MiB de Metaspace se agotó con las bibliotecas nativas. En Windows también acorta la carpeta de archivos CMake a `~/.cxx/wolpro` y configura el acortamiento de nombres de objetos, evitando el límite de rutas de Ninja. Estos ajustes se conservan al regenerar con Expo.

La configuración Android generada actualmente firma `release` con la misma clave de pruebas que `debug`, permitiendo actualizar la instalación de desarrollo sin borrar sus datos. Este APK sirve para probar el funcionamiento independiente; antes de distribuirlo como versión definitiva, utiliza **Build > Generate Signed Bundle / APK**, crea o selecciona tu clave privada de producción y conserva una copia segura de esa clave. Cambiar la firma no permite actualizar directamente una instalación firmada con otra clave. Para Google Play genera un AAB firmado; para instalar directamente en Android genera un APK firmado. Referencias: [compilación local de Expo](https://docs.expo.dev/guides/local-app-production/) y [firma en Android Studio](https://developer.android.com/studio/publish/app-signing).

Se generó e instaló el APK release 1.0.0 en el emulador, con las cuatro arquitecturas Android y el bundle Hermes integrado. Se verificaron firma, ausencia del modo debuggable y arranque en frío con Metro 8081/8082 detenido y sin redirecciones ADB. La pantalla de acceso cargó Azure sin Development Build ni errores JavaScript/nativos. Al cambiar a release pidió iniciar sesión de nuevo: falta comprobar Control y persistencia de esa sesión después del acceso del usuario, además de biometría física. El APK local de esta prueba está en `dist/WoLPro-1.0.0.apk` y no se publica en Git.

## Próxima etapa

Sustituir acceso y registro de cuentas por pantallas nativas y diseñar autenticación móvil independiente antes de retirar la WebView. Completar OAuth Amazon, pruebas físicas y requisitos de tiendas antes de publicar.

## Control remoto y acceso biométrico

El agente mantiene todos los permisos y scripts en Windows. La app envía exclusivamente IDs del catálogo autorizado; no acepta scripts ni rutas de ejecutables. El reinicio se ofrece mediante un comando que el usuario haya autorizado en Windows. Se distinguen Control disponible, PC conectado sin sesión de control, Sin conexión y Agente sin vincular. La presencia se consulta cada cinco segundos mientras Control está visible y la app está desbloqueada y activa. No se reintentan órdenes automáticamente; ante un resultado incierto consulta el historial antes de repetir.

Cuenta permite activar Face ID/Touch ID en iOS o biometría compatible en Android, con el código del teléfono como alternativa del sistema. Se verifica la identidad antes de activar/desactivar el bloqueo. Al volver a abrir o abandonar la app se protege el acceso. SecureStore guarda únicamente la preferencia de bloqueo; la contraseña no se guarda. La sesión sigue siendo la cookie HttpOnly del panel. Cuenta permite conservarla hasta 30 días de manera explícita; el servidor guarda un identificador aleatorio con hash, propietario y caducidad en su estado SQLite. Cerrar sesión desde la app o la web, o desactivar Mantener sesión, revoca ese acceso recordado. Si caduca, se inicia sesión otra vez: la biometría no renueva la sesión ni sustituye la autenticación del servidor. SSO y tokens móviles independientes quedan para otra etapa. Para el acceso rápido, activa Mantener sesión 30 días y luego Acceso con biometría en Cuenta.

Face ID necesita una compilación iOS propia; no funciona en Expo Go. Tras añadir estos módulos debes volver a compilar en Android Studio (sin desinstalar la app para conservar la sesión). El proyecto Android existente se sincronizó con `npx expo prebuild --platform android --no-install --no-clean`; usa `--no-clean` para conservar las carpetas generadas y la configuración local de Android Studio en SDK 57. Después sincroniza Gradle y pulsa Run.

### Actualización del servidor

Copia también `mobile_control.py` y el `app.py` actualizado a Azure y reinicia `wol.service`. Debe estar habilitado `ENABLE_WINDOWS_AGENT=1` y aplicada la migración de presencia de la versión actual del backend. Esta entrega no añade tablas MariaDB ni cambia el protocolo del agente. Al iniciar, el backend crea automáticamente la tabla de sesiones móviles en su SQLite de autenticación. Las nuevas APIs están protegidas por sesión, CSRF y comprobaciones de propietario. Si Azure aún no tiene estas rutas, Control muestra un error y deshabilita la vinculación.

Validación local: 22 pruebas del puente y bloqueo, lint, TypeScript, Expo Doctor y exportación Android/iOS. La prueba del backend recorre móvil -> cola -> claim del agente con un catálogo ficticio y verifica permisos, revocación, aislamiento, cancelación e idempotencia. No abre programas, apaga equipos ni utiliza cuentas Amazon reales. Verificar Face ID/huella en un teléfono físico y enviar una orden real desde datos móviles tras actualizar Azure.
