# Prueba del video recompensado — referencia anterior

**Sustituida por [RELEASE_1.1.3.md](RELEASE_1.1.3.md): usa el paquete nuevo de tres formatos y una sola compilación.** Los pasos siguientes documentan la preparación anterior de prueba solo recompensada; no vuelvas a ejecutar esos configuradores después del paquete nuevo.

La versión 1.1.2 instalada se compiló con `EXPO_PUBLIC_ADS_MODE=off`.
Activar el servidor no modifica el modo incluido en esa instalación.
La copia local ahora explica por qué el botón está deshabilitado.

Estado posterior: `pixel 9` registrado en AdMob. La configuración local ya
está en `live` y Android se regeneró con prebuild sin limpiar. La app instalada
conserva su configuración anterior hasta compilar e instalar otra vez.
Azure todavía no se actualizó para esta prueba.
También se corrigió el prebuild para eliminar el bloqueo del ID de publicidad
que quedaba de un build anterior en modo off. Se comprobó el cambio de off a
live en el manifiesto nativo; off vuelve a bloquear el permiso y live lo permite.

1. En el teléfono: Ajustes → Google → Anuncios, copia el ID de publicidad.
   En AdMob: Configuración → Dispositivos de prueba → Agregar, nombre
   `Teléfono WoL Pro`, Android, ese ID, gesto Ninguno, Guardar.
   No es necesario enviar el identificador por el chat. Google indica que
   la activación puede tardar hasta 24 horas.
2. Después de registrar el teléfono, cambia solo `EXPO_PUBLIC_ADS_MODE=live`
   en el `.env` local. Conserva los IDs reales existentes. Este modo usa nuestra
   unidad recompensada, cuya URL SSV ya está verificada; las unidades de muestra
   del modo `test` pertenecen a Google y no comprueban nuestro callback.
3. Regenera Android con Node 24 y `npx expo prebuild --platform android --no-clean --no-install`.
   Conserva tu configuración de firma y compila manualmente en Android Studio.
   Esta instalación de prueba no necesita enviarse a Google Play. Si el APK
   tiene una firma distinta a la app instalada, usa otro teléfono de prueba o
   un emulador; evita desinstalar tu app principal para esta comprobación.
4. En Azure instala el archivo de monetización preparado y ejecuta manualmente
   el configurador `enable-rewarded-test.py` desde `/srv/apps/wakeonlan`.
   Configura `ADS_TEST_USER_IDS=1`: únicamente la cuenta existente de pruebas
   podrá pedir videos. Banner, intersticial y web permanecen apagados.
   El configurador reinicia el servicio para cargar el alcance limitado antes
   de habilitar el interruptor publicitario.
   `ADS_LIVE_READY=1` permite esa configuración; no significa que la prueba
   completa ni la revisión de la tienda hayan terminado.
5. Con la cuenta Free, abre Mi plan, Actualizar mi plan y Ver video.
   Comprueba que el anuncio indica **Test Ad / Anuncio de prueba** antes
   de interactuar. Al completarlo, el servidor debe recibir el SSV firmado.
   Actualiza Mi plan: debe seguir Free, mostrar la pausa de 30 minutos y
   deshabilitar el video mientras la pausa siga activa. También debe aparecer
   la misma pausa en la web. Premium nunca muestra anuncios.

No se acredita la recompensa por el aviso del teléfono: se mantiene la
verificación de firma de Google y de la unidad real en Azure.
La prueba del teléfono y la llegada de ese SSV aún están pendientes.
Para terminar la prueba, apaga Publicidad en el administrador y vuelve a
`EXPO_PUBLIC_ADS_MODE=off` antes de preparar otra compilación sin anuncios.
Conserva el alcance limitado hasta que decidas activar anuncios en producción.

Referencias: [dispositivos de prueba](https://support.google.com/admob/answer/9691433),
[variables al compilar con Expo](https://docs.expo.dev/guides/environment-variables/).
