# Mi plan y monetización — 1.1.0 / Android 3

Free: un equipo activo, Alexa y apagado con cancelación. Premium: diez equipos, aplicaciones y comandos autorizados, sin anuncios. La cuenta se comprueba en Azure para app/web/Alexa/agente. La app muestra Mi plan, equipo principal, vencimiento, cortesía, estado de renovación y restauración de compras.

Compras: `expo-iap`; precios y ofertas se consultan a Google Play. Las compras se envían al servidor y solo se finalizan tras verificar un estado de acceso válido. Un token no puede asociarse a otra cuenta WoL Pro. Cancelar renovación mantiene el acceso hasta la fecha verificada. La oferta anual debe tener etiqueta `intro-year`, una fase anual promocional y después la renovación anual; la UI muestra ambas fases. Consulta `wol_panel/MONETIZATION_DEPLOYMENT.md` para productos, cuentas de servicio y RTDN. iOS conserva el módulo compartido, pero el backend Apple y las ventas iOS requieren implementación antes de activarse.

Publicidad: `react-native-google-mobile-ads` 17, banner bajo el encabezado, intersticial en una pausa al regresar de Dispositivos a Inicio después de diez minutos, y rewarded voluntario de 30 minutos sin publicidad de cuenta. No muestra intersticiales durante órdenes, cuenta atrás ni al abrir la app. El SDK proporciona su botón de cierre. El servidor controla tickets, límites, firma y recompensa; finalizar un video en el cliente no acredita minutos por sí solo. La política se actualiza en segundo plano, sin bloquear los controles.

## Android Studio

Instala las dependencias con Node 22.13 o posterior: `npm ci`. Tras agregar módulos nativos o cambiar configuración, ejecuta **`npx expo prebuild --platform android --no-clean --no-install`**. SDK 57 recrea los directorios por defecto; `--no-clean` aplica los plugins y conserva el proyecto abierto. No uses `--clean` sobre un directorio que guarda tu clave de firma. Respalda la clave fuera del repositorio y del directorio generado.

Abre `android/` en Android Studio, sincroniza Gradle, selecciona un teléfono y ejecuta. Para Google Play: Build → Generate Signed App Bundle or APK → Android App Bundle → usa **la misma clave de carga de la versión anterior** → release. Comprueba versión 1.1.0 / código 3 antes de subir. El APK debug generado para verificar esta entrega no es el AAB firmado de publicación.

El modo inicial `EXPO_PUBLIC_ADS_MODE=off` bloquea `AD_ID`, no pide anuncios y retrasa la medición. Los App IDs iniciales son de prueba oficiales para que el módulo nativo pueda cargar sin una cuenta AdMob. Para activar anuncios establece los IDs y unidades públicos de `.env.example`, habilita los mensajes UMP y política del backend, genera nuevamente el proyecto y compila. El modo live permite `AD_ID` del SDK: revisa el manifiesto y actualiza Play Console. Premium no monta banners ni inicializa el módulo publicitario mediante JS.

Validaciones: `npm test`, `npm run typecheck`, `npm run lint`, `npx expo export --platform all`, y Gradle `:app:assembleDebug`. Las compras reales, SSV con AdMob y la compilación iOS requieren las cuentas y dispositivos correspondientes; no han sido activadas en esta entrega.
