# Formularios nativos de acceso

`src/AuthScreen.tsx` utiliza controles React Native para correo, contraseña, registro, verificación y recuperación. Incluye mostrar/ocultar contraseña, confirmación de nueva contraseña, reenvío de código, navegación atrás, teclado y formulario desplazable. La contraseña se elimina del estado al enviar o abandonar el formulario; no se persiste en SecureStore ni se transmite en una URL.

`src/useNativeAuth.ts` coordina solicitudes, caducidad, respuestas y bloqueo biométrico. `src/nativeAuth.ts` realiza únicamente las operaciones de acceso permitidas. No hay reintentos automáticos de escrituras.

Desde 1.1.5, los mensajes de acceso admiten tanto la URL completa de la WebView como el origen sin ruta que proporciona Android `WebMessageListener`. Se exige el dominio esperado y, para el formato de origen, el marcador `/mobile/bridge` de nuestro script. La navegación sigue limitada al documento de puente; otros dominios, páginas, parámetros o fragmentos se rechazan.

La WebView existente queda invisible y restringida a `/mobile/bridge`, un documento vacío del backend. Conserva la cookie HttpOnly y el CSRF del mismo origen para mantener la sesión y los controles actuales. Los formularios web de acceso ya no se muestran ni se abre un navegador para iniciar sesión. Amazon OAuth conserva su configuración web y no se incorpora como nuevo acceso móvil en esta entrega.

Actualizar primero el backend `wol_panel` con `native_auth.py` y los cambios de `app.py`, reiniciar Azure y después generar una nueva compilación Android/iOS. Si esas rutas no están instaladas, se muestra un error de conexión; la app no vuelve al formulario web. No hay nuevas dependencias nativas y no se modifica el proyecto Android generado.

```sh
npm test
npm run typecheck
npm run lint
```

Validar también en un teléfono: teclado/autocompletado, registro y correo real, pérdida de conexión, conservar sesión, cierre de sesión, bloqueo biométrico y Control de PC. Las pruebas locales usan cuentas simuladas y no ejecutan órdenes reales.
