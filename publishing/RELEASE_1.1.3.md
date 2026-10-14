# WoL Pro 1.1.3 — Android código 5

Una compilación incluye banner, intersticial automático y video voluntario. El administrador permite activar cada formato, cambiar pantallas y ajustar los límites sin recompilar. Esta entrega configura inicialmente la prueba para la cuenta interna 1; no activa anuncios para todos los usuarios ni publicidad web.

## Comportamiento

- Banner bajo el encabezado, con actualización optimizada por Google.
- Intersticial precargado al volver de Dispositivos a Inicio: al menos diez minutos desde el inicio de sesión y entre solicitudes, máximo tres solicitudes al día. Si no hay anuncio preparado, se omite. El SDK de Google controla la duración y el cierre; no se impone una espera propia de treinta segundos.
- Video voluntario en Mi plan: otorga treinta minutos sin publicidad solamente después de la verificación firmada de AdMob en Azure. No concede Premium.
- Premium y la pausa por recompensa bloquean todos los formatos. Antes de abrir un anuncio completo se consulta el plan y se comprueba que no haya órdenes pendientes, reclamadas o programadas en el PC. Se evitan anuncios durante formularios, bloqueo biométrico, cambios de pantalla o paso al segundo plano.
- El botón del video muestra Preparando video mientras trabaja y mensajes cuando no está disponible.

## Estado de AdMob

Las tres unidades ya existen. Banner: actualización optimizada por Google. Intersticial: una impresión cada diez minutos. Recompensado: treinta minutos sin anuncios, con SSV en `https://wol.luiszamora.dev/api/ads/ssv`. Los mensajes de consentimiento ya están publicados y los teléfonos pixel9 y a115 figuran como dispositivos de prueba.

Se desactivó Anuncios con alta participación para evitar esperas y pasos adicionales de cierre. Google sigue gestionando el cierre. Referencia: https://support.google.com/admob/answer/15525707.

AdMob todavía muestra Debe revisarse y no tiene una ficha de tienda vinculada; Añadir aparece deshabilitado. La aprobación para anuncios reales sigue pendiente. No se ha publicado una versión nueva en Google Play desde este trabajo.

## Actualizar Azure manualmente

Este ZIP sustituye al paquete anterior de prueba solo recompensada. Contiene dos módulos del backend, el JavaScript del administrador, instalador con respaldo y restauración si falla el reinicio, y un configurador limitado a tu cuenta. No incluye claves ni bases de datos.

Desde PowerShell:

```powershell
scp "C:\Users\lezgo\Desktop\wol_panel\artifacts\ads-setup\WoLPro-all-ads-1.1.3.zip" azureuser@130.131.32.129:/home/azureuser/
```

En Azure, verifica el hash del ZIP con el archivo local `WoLPro-all-ads-1.1.3.sha256`. Después ejecuta este bloque; se detiene si falla un paso:

```bash
bash <<'BASH'
set -euo pipefail
wol_ads_stage="$(mktemp -d /home/azureuser/wol-ads-1.1.3-XXXXXX)"
python3 -m zipfile -e /home/azureuser/WoLPro-all-ads-1.1.3.zip "$wol_ads_stage"
sudo bash "$wol_ads_stage/install.sh"
cd /srv/apps/wakeonlan
sudo .venv/bin/python "$wol_ads_stage/enable-all-ads-test.py"
sudo systemctl is-active wol.service
echo "CARPETA=$wol_ads_stage"
BASH
```

El configurador comprueba que la cuenta 1 sea la cuenta esperada, que exista el estado actual y que coincida la unidad recompensada. Respalda `.env` y SQLite antes de configurar `ADS_TEST_USER_IDS=1`, recompensa 30 minutos, intervalo 600 segundos y límite diario 3. Reinicia antes de activar los anuncios para que el proceso cargue primero el alcance limitado. No modifica equipos, compras ni membresías.

Recarga el administrador con Ctrl+F5 y revisa Publicidad: debe indicar prueba limitada a las cuentas configuradas. Los tres formatos de la app estarán activos para esa cuenta si está en Free. La publicidad web permanece apagada.

Después de superar las pruebas y completar la aprobación de AdMob, se puede dejar `ADS_TEST_USER_IDS` vacío y reiniciar `wol.service` para aplicar la política a todas las cuentas Free. No requiere otra compilación. Esta ampliación no se ejecutó aquí.

## Compilar una vez en Android Studio

El proyecto nativo ya se actualizó con Expo sin limpiar la carpeta. Abre `C:\Users\lezgo\Desktop\wol-pro-app\android`, sincroniza Gradle y usa Build → Generate Signed App Bundle or APK → Android App Bundle → la misma clave de carga anterior → release. Verifica versión 1.1.3 y código 5. No uses el APK debug para publicar.

La configuración local contiene el App ID y las tres unidades reales para Android. No se generó ni se subió un AAB firmado. El modo live permite AD_ID: al enviar manualmente la versión, declara que contiene anuncios y revisa Seguridad de los datos para el SDK publicitario.

## Notas para Google Play (es-US)

```text
Banner superior y anuncios automáticos con límites de frecuencia para cuentas Free.
Videos voluntarios para obtener 30 minutos sin publicidad.
Mejoras en Mi plan y en los mensajes de disponibilidad de videos.
Premium continúa sin anuncios.
```

## Validación y prueba en el teléfono

Pasaron 53 pruebas móviles, 22 del servidor, TypeScript, lint, exportación del bundle Android y compilación nativa Gradle assembleDebug para las cuatro arquitecturas (BUILD SUCCESSFUL). El APK generado confirmó versión 1.1.3 / código 5; no sustituye al AAB firmado de publicación. Se comprobó el manifiesto generado, incluida la actualización de AD_ID al cambiar de modo apagado a live. Estas comprobaciones no sustituyen una prueba de entrega de AdMob en el teléfono.

Tras instalar la versión firmada en tu teléfono registrado como dispositivo de prueba:

1. En Free, comprueba banner con etiqueta de anuncio de prueba y ausencia de anuncios durante órdenes del PC.
2. Tras diez minutos, vuelve de Dispositivos a Inicio y comprueba el intersticial. Sin inventario precargado se omite; no aparece tarde.
3. En Mi plan, completa el video voluntario y confirma treinta minutos sin anuncios después de la verificación del servidor. Cerrar antes de obtener la recompensa no acredita minutos.
4. Actualiza el plan, cambia de pantalla y vuelve a abrir la app: la pausa debe mantenerse en la cuenta. Mantén la cuenta en Free.
5. Desactiva cada formato desde el administrador y comprueba que se respete la política actualizada. En Premium no deben aparecer anuncios.

La entrega real de los tres formatos, la firma SSV desde el teléfono y el AAB firmado quedan pendientes de estos pasos manuales.
