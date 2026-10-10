# Preparación de Google Play — WoL Pro

Paquete: `dev.luiszamora.wolpro`. La compilación preparada es 1.0.1, código 2.

## Recursos

- `icon-512.png`: PNG RGBA 512 × 512, sin esquinas dibujadas ni insignias.
- `feature-graphic-1024x500.png`: PNG RGB 1024 × 500, portada de marca.
- `01-inicio.png` y `02-agregar-equipo.png`: capturas reales del emulador Android a 1080 × 1920. No muestran correo, contraseñas ni MAC reales.
- Los SVG y `create-assets.cjs` permiten volver a generar las piezas de marca; los originales de la app no se cambian.

La resolución del emulador se restauró después de capturar. Las capturas corresponden a la app 1.0.0; no muestran funciones que aún no están distribuidas.

## Eliminación de cuenta

Se preparó un enlace visible en **Cuenta → Solicitar eliminación de cuenta**. Abre la página pública `/account-deletion`, que permite preparar una solicitud por correo. La solicitud no se envía automáticamente y no borra nada al abrir la página. Google acepta un recorrido por soporte si está disponible y se atiende realmente.

El buzón `dev@luiszamora.dev` figura como correo público verificado en Google Play Console. Se utilizó para las páginas preparadas y la ficha. El propietario debe atender realmente las solicitudes que lleguen allí. El soporte debe verificar la identidad y eliminar efectivamente la cuenta y sus datos relacionados, además de revocar los tokens, permisos y sesiones. La página no implementa eliminación automática de datos en producción.

### Actualización manual de Azure

1. Guardar una copia de `/srv/apps/wakeonlan/app.py` y `templates/privacy.html`.
2. Copiar `wol_panel/app.py`, `wol_panel/templates/privacy.html` y el nuevo `wol_panel/templates/account_deletion.html` a sus rutas correspondientes en `/srv/apps/wakeonlan`.
3. Reiniciar `wol.service`.
4. Abrir `https://wol.luiszamora.dev/account-deletion` y `/privacy` sin sesión y comprobar que aparecen las instrucciones y el correo correcto.

Esta preparación no despliega Azure automáticamente ni elimina cuentas reales.

### Nueva compilación Android

El proyecto local Android y `app.json` ya tienen código 2 y versión 1.0.1. En Android Studio sincronizar Gradle y generar **Android App Bundle → release** con la misma clave de subida utilizada para 1.0.0. Subir el nuevo `.aab` a prueba interna; en Google Play los códigos de versión deben ser únicos.

Antes de enviar Seguridad de los datos con un enlace de eliminación, verificar que la página está publicada y que la compilación con el acceso visible está subida. No declarar disponible una función basándose únicamente en el código local.

## Seguridad de los datos

La app requiere autenticación con correo/contraseña. Existe una ruta OAuth con Amazon en el backend, pero la pantalla actual de acceso no la ofrece; no se declara como método disponible en la app actual. La biometría se procesa por el sistema operativo y no se envía al servidor. No se recopilan contactos, fotos, ubicación GPS, tarjetas bancarias ni huellas/rostros. Revisar también la sesión web, el catálogo de aplicaciones del PC y las órdenes: la WebView forma parte de la app para este formulario.

Tipos que revisar/declarar según el comportamiento actual:

| Tipo | Datos y finalidad |
| --- | --- |
| Correo electrónico | Registro, recuperación, autenticación y gestión de cuenta; obligatorio. |
| ID de usuario | Identificador de la cuenta; autenticación y gestión de cuenta; obligatorio. |
| Dispositivo u otros ID | MAC del PC, identificadores del agente y sesión; función, autenticación y seguridad. |
| Interacciones en la app | Operaciones, órdenes y resultados en el historial; función y seguridad. |
| Otro contenido generado por usuarios | Nombres de equipos y acciones; función. |
| Apps instaladas | Nombres/IDs del catálogo de aplicaciones autorizadas del PC; opcional para el control del agente. No se escanea el inventario de apps Android. |

HTTPS cifra las comunicaciones app-servidor. Azure/Cloudflare/correo son proveedores necesarios para prestar el servicio. La vinculación opcional con Alexa comunica a Amazon los nombres/identificadores/MAC y eventos necesarios; revisar la excepción de transferencias iniciadas por el usuario de Google y mantener esta divulgación en la política. No marcar publicidad o análisis publicitario.

Referencias: [formulario](https://support.google.com/googleplay/android-developer/answer/10787469), [eliminación de cuenta](https://support.google.com/googleplay/android-developer/answer/13327111).

## Acceso para revisión y publicación

El panel de Google exige una prueba cerrada con 12 probadores que participen de forma continua durante 14 días. La prueba interna no satisface ese requisito. Actualmente la cuenta también muestra un aviso de inactividad: abrir **Ver detalles** para atender las condiciones y el plazo indicados.

Preparar una cuenta de revisión independiente. No entregar la cuenta personal ni autorizar a revisores a manejar PCs personales. La información de acceso debe explicar registro, vinculación, agente Windows y restricciones de hardware. No afirmar que todas las funciones están disponibles sin iniciar sesión.


## Estado de la revisión del 10 de octubre de 2026

- Texto de la ficha guardado como borrador en Google Play Console.
- Categoría Herramientas confirmada; contacto público dev@luiszamora.dev y https://wol.luiszamora.dev completados.
- Declaración de ID publicitario: No, guardada. Pendiente de enviar a revisión con el resto de cambios.
- Seguridad de datos: borrador inicial guardado con recopilación, HTTPS y contraseña + biometría opcional. Falta completar tipos/uso y publicar la página de eliminación antes de declarar su URL disponible.
- Acceso de revisores: la declaración guardada anterior decía sin restricciones. No pudo corregirse definitivamente porque faltan credenciales y un PC de pruebas disponible. Consultar reviewer-access.md.
- Icono, portada y dos capturas preparados; Chrome bloqueó la carga porque la extensión no permite acceso a URLs de archivo. Habilitar ese acceso para ChatGPT en chrome://extensions o subir las imágenes manualmente en la ficha.
- Aviso de inactividad: fecha límite visible **12 de octubre**. Correo de contacto, teléfono y correo público del desarrollador figuran verificados. Ya existe una versión interna activa, pero el aviso continúa visible. Google permite usar una subida interna para esta condición; no asumir que el aviso se resolvió hasta que desaparezca o soporte lo confirme.
- Producción bloqueada por el requisito de prueba cerrada: 12 participantes continuos durante 14 días. La prueba interna no sustituye esa prueba.
- Azure no se desplegó y no se generó/subió el AAB 1.0.1.
- Verificación: typecheck y lint correctos, 22 pruebas de app y 53 pruebas de test_app correctas; /privacy y /account-deletion devuelven 200 localmente.

Notas de versión sugeridas para el código 2:

```text
<es-US>
Añadimos un acceso en Cuenta para solicitar la eliminación de la cuenta y consultar las instrucciones de privacidad.
</es-US>
```

Referencia del aviso: https://support.google.com/googleplay/android-developer/answer/11605267
