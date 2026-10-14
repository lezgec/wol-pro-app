# Entrega de prueba 1.1.2 / Android 4

Proyecto: `C:\Users\lezgo\Desktop\wol-pro-app`.
Paquete: `dev.luiszamora.wolpro`.
`app.json` y `android/app/build.gradle` ya indican versión 1.1.2 y código 4.

## Cambios reunidos

- Recuperación automática de compras después de regresar de Google Play y
  desbloquear la app; Azure verifica el recibo antes de finalizar la compra.
- Restaurar compras y Actualizar mi plan muestran progreso y resultado.
- Elegir equipo principal confirma el guardado y marca solo el seleccionado.
- La suscripción vencida ya no presenta la vigencia anterior como acceso actual.
- Mi plan presenta estado, equipos, vigencia, pagos y funciones por separado.
- Agregar equipos ofrece Alexa; se retiró la tarjeta de encendido por router.
- Avisos y restricciones visibles para equipos inactivos al volver a Free.

## Generar el AAB firmado manualmente

1. En Android Studio, abre `C:\Users\lezgo\Desktop\wol-pro-app\android`.
2. Deja terminar la sincronización de Gradle.
3. Selecciona **Build → Generate Signed App Bundle or APK → Android App Bundle**.
4. Elige **la misma clave de carga y alias usados en Google Play** e introduce
   sus contraseñas directamente en Android Studio.
5. Selecciona **release** y una carpeta de salida donde puedas encontrar el AAB.
6. Sube el AAB a **Prueba interna** de WoL Pro y confirma que Google muestre
   código de versión **4**. Completa el lanzamiento de esa prueba e instala la
   actualización en el teléfono con la cuenta de verificador.

La configuración generada de Gradle conserva firma debug para ejecución local.
No uses su `bundleRelease` directo como archivo de publicación: utiliza el
asistente anterior con la clave de carga existente. No se generó todavía un
AAB firmado en esta revisión.

## Notas de versión para Google Play

```text
<es-US>
Mejoras en Mi plan y en los mensajes de suscripción.
Confirmación al restaurar compras, actualizar el plan y elegir equipo principal.
Recuperación de la compra al volver de Google Play y desbloquear la app.
Avisos para equipos inactivos y actualización del encendido mediante Alexa.
</es-US>
```

## Comprobar después de instalar

1. En Mi plan, Actualizar mi plan debe informar el resultado.
2. Restaurar compras debe informar compras verificadas, ausencia de compras o
   error; no debe terminar únicamente con un parpadeo.
3. Elegir el equipo principal debe mostrar **Equipo principal guardado** y ✓
   solo junto al elegido.
4. Agregar equipo debe mostrar Alexa sin la tarjeta de router.
5. Con una compra de prueba, regresar de Google Play, desbloquear y comprobar
   activación de Premium **sin pulsar Restaurar compras**.
6. Comprobar presentación de Mi plan y mensajes después del vencimiento.

Resultados locales: 44 pruebas móviles, TypeScript, lint y exportación Android
correctos. Los flujos básicos de la versión instalada se comprobaron en el
teléfono; las correcciones nuevas necesitan esta entrega. La lista completa
está en [APP_VERIFICATION.md](APP_VERIFICATION.md).

## Cambios de web pendientes en Azure

Los cambios de texto en `wol_panel/templates/login.html` y `privacy.html`
necesitan actualización manual del servidor. No se requiere un nuevo despliegue
del backend para las correcciones de compra y confirmación de esta app.

La oferta introductoria, pagos pendientes, retención/gracia, cambio de cuenta
propietaria y publicidad siguen en la lista de pruebas antes de producción.
