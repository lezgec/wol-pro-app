# Acceso para revisores de Google Play

La declaración actual dice «No hay restricciones». Debe cambiarse a «Sí» al proporcionar una cuenta válida; la app requiere iniciar sesión. No se guardó una declaración con credenciales inventadas.

1. Crear una cuenta independiente y verificar su correo antes de entregar el acceso.
2. Mantener una contraseña reutilizable y no activar biometría para esa cuenta durante la revisión.
3. Vincular exclusivamente un PC de pruebas, con el agente activo y aplicaciones/comandos inocuos autorizados. Mantenerlo disponible durante la revisión; no vincular un PC personal.
4. Comprobar inicio de sesión y ejecución de una acción desde una instalación distribuida por Google Play y datos móviles.
5. Introducir las credenciales en **Contenido de la app → Detalles de acceso → Sí → Agrega detalles**. Google pide instrucciones en inglés y acceso completo; no pide que el revisor cree la cuenta.
6. Para la versión 1.1, concede a esa cuenta Premium de cortesía desde el administrador con una fecha que cubra la revisión. Así podrá probar aplicaciones y comandos sin realizar una compra. Revisa también las declaraciones de anuncios y datos después de configurar los SDK.

Texto para el campo de instrucciones (adaptar solo después de preparar el equipo):

> Sign in with the supplied verified test account. Biometric unlock is optional; leave it disabled. The review account has a courtesy Premium entitlement; no purchase is required. Open Devices and Control to use the dedicated test PC and its authorized actions. The Windows agent on that PC is kept online during review; Internet access is sufficient and no local network connection is needed. Alexa power-on additionally requires a compatible Echo on the PC network.

No pegar credenciales aquí ni guardarlas en Git. El texto supone que el PC de pruebas existe y está disponible; actualmente no se ha preparado ni vinculado uno.
