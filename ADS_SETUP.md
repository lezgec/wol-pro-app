# AdMob Android de WoL Pro

Las unidades reales están guardadas en `.env.example` y en el `.env` local.
El modo inicial sigue siendo `off`. La variable `EXPO_PUBLIC_ADS_PLATFORMS=android`
permite activar Android sin exigir IDs de una app iOS todavía no registrada.
En iOS los anuncios reales permanecen deshabilitados hasta añadir esa plataforma
y configurar sus propios App ID y unidades.

Consulta el estado de cuentas, IDs, verificación de dominio, callback y pasos
pendientes en [GOOGLE_ADS_SETUP.md del backend](https://github.com/lezgec/wol_panel/blob/codex/monetization/GOOGLE_ADS_SETUP.md).

No basta con guardar los IDs para activar anuncios: faltan revisión de cuenta,
consentimiento, despliegue del callback firmado en Azure y pruebas de recompensa.
Cambiar el App ID nativo requiere regenerar Android y firmar otro AAB; conserva
la clave de carga fuera de la carpeta generada. Para regenerar sin limpiar el
proyecto que abres en Android Studio:

```sh
npx expo prebuild --platform android --no-clean --no-install
```

Antes de publicar el build live revisa el manifiesto final y las declaraciones
de anuncios, identificador publicitario y Seguridad de datos en Play Console.
