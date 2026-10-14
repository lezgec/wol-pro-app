# Verificación antes de la siguiente entrega

Revisión del 10 de octubre de 2026. Los cambios pendientes se reúnen en
1.1.2 / código Android 4. La prueba física se está haciendo con la versión
ya instalada; las correcciones locales necesitan el próximo AAB.

El usuario confirmó que subió la versión nueva a Prueba cerrada y que está en
revisión de Google. Las comprobaciones físicas de las correcciones siguen
pendientes hasta que pueda instalar esa entrega. La publicidad continúa
desactivada en la configuración de la app.

## Evidencia y pendientes

| Flujo | Evidencia actual | Próxima comprobación |
| --- | --- | --- |
| Compra mensual de prueba | Google mostró tarjeta de prueba; la app mostró Premium y renovación; Azure verificó un recibo sin errores. Una captura posterior mostró acceso hasta las 17:57:26, frente a las 17:32:26 de la primera captura. El usuario confirmó que al cancelar se desactivó la renovación y al vencer cambió a Free | Repetir restauración con el próximo AAB; la fecha actualizada por sí sola no distingue RTDN de reconciliación |
| Notificaciones RTDN | Dos entregas HTTP 200 en Azure | Observar cambios reales de renovación y cancelación |
| Revisión periódica | Timer activo con próxima ejecución; dos consultas sin errores | Mantener vigilancia de resultados en el servidor |
| Administrar suscripción | El usuario confirmó que abre Google Play y aparece WoL Pro; canceló allí y observó Premium sin renovación hasta la fecha de vencimiento, seguido de Free | Cancelación, vencimiento y permisos básicos de Free comprobados en la app |
| Restaurar compras | Usuario observó bloqueo momentáneo de botones sin resultado | Corrección local: progreso y diálogo final; repetir con el próximo AAB |
| Regreso de Google Play con biometría | Al comprar el plan anual, el usuario tuvo que desbloquear con huella y pulsar Restaurar compras para activar Premium; Google Play mostraba confirmar el plan/abrir app | Corrección local: conservar recibos recibidos durante el bloqueo, consultar compras al reconectar o regresar/desbloquear, verificar con Azure antes de finalizar y mostrar progreso/resultado. Repetir en el teléfono con el próximo AAB |
| Actualizar mi plan | Usuario observó parpadeo sin confirmación. Después mostró Premium con una fecha de acceso posterior; la app recibió datos actualizados | Corrección local: consulta de plan con resultado o error; comprobar la confirmación con el próximo AAB |
| Estado de suscripción | Tras cambiar a Free, la versión instalada conservó en el texto de la suscripción su fecha anterior | Corrección local: la suscripción vencida indica que no tiene acceso Premium; repetir con el próximo AAB. Pendiente, pausa, retención y gracia aún requieren pruebas de Google Play |
| Equipo principal para Free | Premium marcaba todos los equipos activos en ese selector. Con dos equipos, el usuario confirmó la prueba de elegir Escritorio como principal y volver a Free: solo Escritorio permite control. También confirmó que la versión instalada no muestra confirmación al elegir el principal | Selección funcional comprobada con dos equipos. Corrección pendiente de instalar: marcar solo el principal con ✓, mostrar «Equipo principal guardado» tras la respuesta del servidor y comunicar los errores |
| Equipos inactivos | Tras volver a Free con dos equipos, el usuario confirmó que ambos se conservan y solo Escritorio permite control. El servidor también rechaza órdenes fuera de los límites en las pruebas aisladas | Conservación y restricción comprobadas en el teléfono. Corrección visual pendiente: aviso en Dispositivos/Control y bloqueo de vinculación y guardado de acciones para equipos inactivos |
| Encendido por router | El usuario confirmó que la versión instalada aún muestra esa opción al agregar un equipo | Corrección local preparada: eliminar la tarjeta del editor; solo Alexa aparece para equipos nuevos. También se retiró la referencia promocional en el acceso web y se aclararon los datos de configuraciones anteriores en privacidad. Requiere el próximo AAB y actualización manual de las plantillas web |
| Free | Tras vencer la compra, el usuario confirmó en Control → Escritorio que Spotify y aplicaciones quedan bloqueados y el apagado sigue disponible. También intentó agregar un segundo equipo: la app informó que alcanzó el límite del plan, rechazó el registro y conservó Escritorio. Después confirmó apagado completo, encendido con Alexa y cancelación del apagado. Además, 17 pruebas del servidor incluyen cuota, apagado permitido, comandos bloqueados y conservación de equipos | Permisos básicos, límite de un equipo y operaciones de energía comprobados |
| Premium | El usuario confirmó que Spotify abrió en Windows tras enviarlo desde la app. Al restaurar la compra anual confirmó que Premium habilitó comandos y controles, que las órdenes se ejecutan y que pudo registrar un segundo dispositivo de prueba. Después confirmó que al volver a Free se conservan los dos equipos, solo Escritorio permite control y aplicaciones/comandos vuelven a pedir Premium. También confirmó editar y eliminar el equipo temporal, quedando solo Escritorio. Pruebas del servidor comprueban permisos y aislamiento | Flujos básicos solicitados comprobados; activación automática tras compra pendiente de repetir con el próximo AAB |
| Apagado y cancelación | El usuario confirmó en el PC real apagado completo, posterior encendido con Alexa y cancelación del apagado; también hay pruebas aisladas del servidor | Pruebas físicas superadas |
| Registro y edición de equipos | El usuario creó un segundo equipo temporal con Premium; con Free se rechazó su registro. Después confirmó editar el equipo de prueba, comprobar el nombre tras actualizar y eliminarlo, quedando solo Escritorio. Puente móvil cubierto por tests | Creación, edición y eliminación del equipo temporal comprobadas |
| Biometría y sesión | El usuario confirmó la prueba de mantener sesión y activar biometría: cerrar y reabrir la app, cancelar la autenticación manteniendo el acceso bloqueado y desbloquear recuperando la sesión. Después cerró sesión y reabrió: pidió huella y, al desbloquear, mostró el inicio de sesión; la biometría no recuperó la sesión cerrada. Al iniciar sesión de nuevo confirmó que Escritorio sigue guardado y el plan es Free. También confirmó que cambiar a otra aplicación y regresar exige huella o código y conserva la sesión tras desbloquear. Hay cinco pruebas aisladas de bloqueo y pruebas del puente de sesión | Todas las comprobaciones físicas solicitadas de biometría y sesión superadas |
| Privacidad, términos y eliminación | El usuario confirmó que las tres páginas abren desde Cuenta en el teléfono; la prueba solo verifica los enlaces, no el procesamiento de una solicitud de eliminación. Enlaces y contenido también revisados en el código | Apertura de las tres páginas comprobada |
| Anual y oferta del primer año | Catálogo activo mundial; precio y fases de Google usados por la app. Tras volver a Free, el usuario confirmó que Mi plan muestra las opciones mensual de 2,99 y anual de 24,99. En el pago anual de Google Play confirmó la tarjeta de prueba, el precio y un período de 30 minutos. Compró y restauró: Premium se activó, las órdenes funcionan y pudo agregar un segundo equipo | Compra anual comprobada con restauración manual; falta repetir activación automática con el próximo AAB y comprobar la oferta del primer año con una cuenta elegible. Los períodos acelerados de prueba no son los de producción |
| Publicidad | Desactivada | Probar después de completar configuración de cuentas y unidades, con anuncios de prueba |

## Comprobaciones locales

- 44 pruebas móviles: puente HTTPS/CSRF, autenticación, bloqueo, compra,
  restauración, mensajes de estado y recuperación de recibos tras el bloqueo
  (siete pruebas nuevas de recuperación, duplicados y rechazos).
- 17 pruebas aisladas del servidor: límites, permisos, compras, vencimientos,
  cuentas propietarias, administración y recompensas.
- TypeScript y lint sin errores.

Las pruebas aisladas utilizan recibos y datos ficticios; no sustituyen las
pruebas de Google Play en el teléfono. Toda corrección queda en la misma
versión pendiente hasta terminar esta revisión.

## Presentación de Mi plan

La misma entrega reorganiza la pantalla en tarjeta de plan, métricas de equipos,
vigencia, suscripción de Google Play, equipo principal y funciones incluidas.
El botón de actualización queda dentro de la tarjeta principal. La fecha de
Google Play no se repite en el bloque de renovación cuando coincide con el
origen del plan; si existe una cortesía con otra vigencia, se conserva la fecha
propia de la suscripción. Botones de al menos 48 puntos, texto que permite
varias líneas y métricas que se apilan cuando falta ancho. Estos cambios están
en el código pendiente; su presentación en el teléfono se verificará con el
próximo AAB.
