# WoL Pro 1.1.5 · Android 7

Corrige el acceso nativo que mostraba «No pudimos confirmar el acceso» aunque Azure ya hubiera aceptado la contraseña.

En Android, React Native WebView 13.16.1 entrega el origen del mensaje (`https://wol.luiszamora.dev`) mediante `WebMessageListener`; en el otro transporte puede entregar la URL completa. La validación anterior exigía siempre `/mobile/bridge` en esa URL y descartaba las respuestas de Android.

La respuesta ahora incluye un marcador del documento vacío del puente. Se aceptan origen o URL completa conservando dominio exacto, validación de documento, canal e ID de solicitud. Se rechazan otros dominios, páginas, credenciales, parámetros y fragmentos. El script solo corre en el documento de puente y el marco principal, y la navegación nativa sigue restringida a ese documento.

## Actualizar desde Google Play

1. En Android Studio abre `C:\Users\lezgo\Desktop\wol-pro-app\android` y sincroniza Gradle.
2. Selecciona **Build → Generate Signed App Bundle or APK → Android App Bundle**.
3. Usa la misma clave de carga y alias que en 1.1.4. Introduce sus contraseñas directamente en Android Studio.
4. Genera **release**, sube el AAB firmado al canal de pruebas y confirma **1.1.5 / código 7**.
5. Cuando esté disponible, actualiza el emulador/teléfono desde Google Play. No desinstales ni borres datos para aplicar la corrección.

Esta corrección no requiere modificar Azure, el agente Windows ni Alexa. Conserva el permiso AD_ID de la compilación actual. El AAB sin firmar de comprobación no debe subirse a Play.

## Notas de versión

```text
Corregimos un problema que impedía completar el inicio de sesión en Android.
Mejoramos la compatibilidad y validación de las respuestas de acceso.
```

## Verificación

Pasaron 65 pruebas móviles, TypeScript, lint y compilación Android. Las pruebas reproducen el origen sin ruta que entrega Android, comprueban que termine la solicitud y verifican rechazo de mensajes de otro origen o documento y protección biométrica.

En el emulador Pixel 9 API 35 se reprodujo el fallo de 1.1.4 instalada desde Google Play. La compilación de comprobación 1.1.5 se instaló con el paquete separado `dev.luiszamora.wolpro.verify`, conservando la instalación original y sus datos. El acceso llegó al panel nativo con equipos y Alexa vinculada. Después de retirar el diagnóstico temporal, actualizar el paquete QA y abrirlo otra vez, se restauró la sesión y el panel volvió a mostrarse sin introducir la contraseña. No se ejecutaron órdenes de PC. La firma y distribución de la actualización normal continúan mediante Google Play.

El AAB sin firmar final está en `dist/WoLPro-1.1.5-android7-SIN-FIRMAR.aab`. Se comprobaron paquete original, versión 1.1.5, código 7, permiso AD_ID, ausencia de firma y ausencia de los mensajes temporales de diagnóstico. El proyecto Android se actualizó mediante Expo prebuild, sin editar sus carpetas generadas a mano.

Referencia del transporte: [RNCWebView 13.16.1](https://github.com/react-native-webview/react-native-webview/blob/v13.16.1/android/src/main/java/com/reactnativecommunity/webview/RNCWebView.java).
