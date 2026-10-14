# Mi plan y monetización — 1.1.3 / Android 5

Free: un equipo activo, Alexa y apagado con cancelación. Premium: diez equipos, aplicaciones y comandos autorizados, sin anuncios. La cuenta se comprueba en Azure para app/web/Alexa/agente. La app muestra Mi plan, equipo principal, vencimiento, cortesía, estado de renovación y restauración de compras.

Compras: `expo-iap`; precios y ofertas se consultan a Google Play. Las compras se envían al servidor y solo se finalizan tras verificar un estado de acceso válido. Un token no puede asociarse a otra cuenta WoL Pro. Cancelar renovación mantiene el acceso hasta la fecha verificada. La oferta anual debe tener etiqueta `intro-year`, una fase anual promocional y después la renovación anual; la UI muestra ambas fases. Consulta `wol_panel/MONETIZATION_DEPLOYMENT.md` para productos, cuentas de servicio y RTDN. iOS conserva el módulo compartido, pero el backend Apple y las ventas iOS requieren implementación antes de activarse.

Publicidad: `react-native-google-mobile-ads` 17, banner bajo el encabezado, intersticial en una pausa al regresar de Dispositivos a Inicio después de diez minutos, y rewarded voluntario de 30 minutos sin publicidad de cuenta. No muestra intersticiales durante órdenes, cuenta atrás ni al abrir la app. El SDK proporciona su botón de cierre. El servidor controla tickets, límites, firma y recompensa; finalizar un video en el cliente no acredita minutos por sí solo. La política se actualiza en segundo plano, sin bloquear los controles.

## Tres formatos — 1.1.3

Los tres formatos están incluidos en una sola compilación, con unidades reales de Android, precarga del intersticial y comprobación del plan y de órdenes pendientes antes de mostrar pantalla completa. El administrador conserva interruptores por formato y pantallas. El alcance de prueba admite los tres formatos para las cuentas configuradas; web permanece apagada. Guía vigente: [RELEASE_1.1.3.md](publishing/RELEASE_1.1.3.md). La configuración local está en live, con teléfono registrado en AdMob; la versión firmada y las pruebas de teléfono siguen pendientes.

## Android Studio

Instala las dependencias con Node 22.13 o posterior: `npm ci`. Tras agregar módulos nativos o cambiar configuración, ejecuta **`npx expo prebuild --platform android --no-clean --no-install`**. SDK 57 recrea los directorios por defecto; `--no-clean` aplica los plugins y conserva el proyecto abierto. No uses `--clean` sobre un directorio que guarda tu clave de firma. Respalda la clave fuera del repositorio y del directorio generado.

Abre `android/` en Android Studio, sincroniza Gradle, selecciona un teléfono y ejecuta. Para Google Play: Build → Generate Signed App Bundle or APK → Android App Bundle → usa **la misma clave de carga de la versión anterior** → release. Comprueba versión 1.1.3 / código 5 antes de subir. Esta entrega no generó un AAB firmado de publicación.

## Corrección de restauración — 1.1.2

El botón muestra Consultando compras mientras trabaja y un diálogo con el
resultado al terminar. Distingue compras verificadas, pagos pendientes y
suscripciones sin acceso vigente; también comunica cuando Google no encuentra
compras o cuando hay un error. Si Premium ya estaba activo, restaurar no cambia
el plan y ahora lo explica. Se actualiza el plan desde Azure incluso cuando
Google no devuelve compras. La confirmación sigue dependiendo del servidor;
no se activa Premium por encontrar un recibo en el teléfono.

Al regresar de Google Play, el bloqueo biométrico se conserva. Los recibos que
lleguen durante el bloqueo se retienen en memoria y se verifican después de
desbloquear. Al conectar o volver a la pantalla se consultan las compras de
Google para recuperar eventos perdidos o compras pendientes de confirmación;
se procesan una a una y se evita confirmar dos veces el mismo recibo. Azure
debe validar el acceso antes de finalizar la transacción. No se guardan tokens
de compra en almacenamiento local ni se omite la huella para activar Premium.

La misma entrega añade confirmación de Actualizar mi plan, distingue estados
de la suscripción y marca solo el equipo principal elegido para Free. Los
equipos inactivos tienen un aviso y no permiten vincular ni guardar acciones.
Se retiró la promesa de encendido por router en preparación.

Mi plan se presenta con una tarjeta de estado, métricas separadas para equipos
guardados y límite de activos, vigencia destacada y bloques de suscripción,
equipo principal y funciones. La actualización del plan queda en su tarjeta;
se evitan fechas repetidas para el mismo acceso y se conserva la distinción
entre una cortesía y una suscripción con fechas diferentes.

Validación de esta revisión: 44 pruebas móviles (incluidas siete de
restauración, seis de mensajes de estado y siete de recuperación tras bloqueo), 17 pruebas aisladas del servidor,
TypeScript y lint. Consulta [la lista de verificación](publishing/APP_VERIFICATION.md)
para distinguir lo comprobado en el teléfono de lo pendiente. La restauración
con Google Play sigue pendiente después de instalar el nuevo AAB.

Como referencia del modo anterior, `EXPO_PUBLIC_ADS_MODE=off` bloquea `AD_ID`, no pide anuncios y retrasa la medición. Los App IDs iniciales son de prueba oficiales para que el módulo nativo pueda cargar sin una cuenta AdMob. Para activar anuncios establece los IDs y unidades públicos de `.env.example`, habilita los mensajes UMP y política del backend, genera nuevamente el proyecto y compila. El modo live permite `AD_ID` del SDK: revisa el manifiesto y actualiza Play Console. Premium no monta banners ni inicializa el módulo publicitario mediante JS.

Validaciones: `npm test`, `npm run typecheck`, `npm run lint`, `npx expo export --platform all`, y Gradle `:app:assembleDebug`. Las compras reales, SSV con AdMob y la compilación iOS requieren las cuentas y dispositivos correspondientes; no han sido activadas en esta entrega.
