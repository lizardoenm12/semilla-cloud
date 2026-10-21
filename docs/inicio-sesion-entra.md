# Inicio de sesión Microsoft Entra y acceso por usuario

## Estado real — 20/10/2026

El código del flujo de inicio de sesión está implementado y se verifica localmente. **Todavía no hay un inicio de sesión real de Microsoft validado.** El intento de registrar `cloud-negocios-dev` con la cuenta actual del directorio Universidad Galileo fue rechazado: `Insufficient privileges to complete the operation`. Ser propietario de la suscripción Azure o tener permisos de Storage no concede automáticamente permisos para registrar aplicaciones en Microsoft Entra.

Se mantiene `AUTH_MODE=local` para conservar la app disponible. Las sesiones de prueba son simuladas, en bases aisladas, y no se presentan como autenticación real. No se creó un registro ni una credencial en el directorio. Ver la [solicitud para el administrador](solicitud-registro-entra.md).

## Flujo preparado

1. Con `AUTH_MODE=entra`, el inicio muestra Iniciar sesión con Microsoft. La URL de desarrollo es `http://localhost:3010` (no mezclar con 127.0.0.1 durante la sesión).
2. El servidor inicia OIDC Authorization Code con PKCE S256, state aleatorio, nonce y una cookie de correlación HttpOnly. El verificador queda en SQLite y caduca a los diez minutos. El retorno exige tanto estado como cookie y solo se consume una vez.
3. `openid-client` descubre la configuración del emisor del tenant configurado, intercambia el código y valida el ID token. Se activa verificación criptográfica de firma con JWKS, además de issuer, audience, expiración y nonce. Solo se solicitan `openid profile`; no se solicita acceso a Graph ni a los archivos del usuario.
4. El usuario se identifica por `tid` y `oid`, nunca por el nombre ni el correo. Una cuenta de otro directorio se rechaza.
5. Se crea una sesión opaca de ocho horas. Solo el hash del token se conserva en SQLite. La cookie es HttpOnly y SameSite=Lax; Secure cuando la URL usa HTTPS. Los tokens de Microsoft se usan durante el retorno y no se guardan en el navegador ni en la base.
6. Cada solicitud resuelve su usuario desde la sesión y lo transmite mediante AsyncLocalStorage, sin variables globales de usuario ni identificadores confiados al cliente. Los negocios requieren membresía activa; operaciones, comprobantes, perfiles y descargas usan ese mismo control de acceso. No hay ruta pública para emitir sesiones de prueba.
7. Cerrar sesión revoca la sesión de esta app y borra las cookies. No cierra toda la cuenta de Microsoft del navegador. Se exige POST del mismo origen. Al iniciar sesión de nuevo se revoca la sesión anterior del mismo navegador.

## Preservación de los negocios existentes

La migración aditiva al esquema 4 añade `auth_sessions`, `auth_flows` y `legacy_claims`. Se conservan negocios, operaciones, inventario y adjuntos existentes. Hay una copia SQLite previa en `.data/backups/antes-identidad-*.sqlite`.

`AUTH_LEGACY_OWNER_OBJECT_ID` debe ser el oid previamente comprobado del propietario original. Solo ese oid dentro de `AUTH_TENANT_ID` recibe acceso a los negocios de `usuario-local`, una sola vez. También se conserva el perfil, aprendizaje e historial de conversaciones. Los autores históricos de las operaciones se mantienen como `usuario-local`; no se reescribe la autoría de movimientos pasados. El primer visitante no hereda nada. Un usuario nuevo empieza sin negocios y puede crear el suyo.

La membresía local previa no se elimina; el modo Entra no la usa como usuario implícito. Cambiar explícitamente a modo local vuelve al entorno de demostración y **no debe usarse como acceso multiusuario público**. No hay aún roles de colaboración, invitaciones o administración de usuarios dentro de la app.

## Configuración después del registro aprobado

Guardar estos valores en `.env.local`, nunca en Git, capturas ni mensajes públicos:

```dotenv
AUTH_MODE=entra
AUTH_TENANT_ID=<id del directorio Universidad Galileo>
AUTH_CLIENT_ID=<id de aplicación cloud-negocios-dev>
AUTH_CLIENT_SECRET=<valor del secreto entregado de forma segura>
AUTH_BASE_URL=http://localhost:3010
AUTH_LEGACY_OWNER_OBJECT_ID=<oid comprobado del propietario original>
```

El secreto es exclusivamente del servidor; no usar prefijos NEXT_PUBLIC. El administrador puede rotarlo y debe comunicar su fecha de expiración. No confundir el identificador del secreto con su valor. En producción utilizar HTTPS y evaluar certificado o mecanismo de credencial adecuado al despliegue.

Reiniciar la app:

```powershell
cd D:\Usuario\Lizardo\cloud
$env:PORT="3010"
npm.cmd run dev:local
```

Abrir `http://localhost:3010`. La app conserva el backend local en SQLite y sigue escuchando solo en loopback. El acceso a Blob continúa usando la identidad del servidor (Azure CLI local), no un token de almacenamiento de cada persona. La app comprueba primero su membresía; el usuario no necesita un rol directo sobre Storage. En un despliegue futuro se sustituye la sesión CLI del servidor por la identidad administrada y se prepara la persistencia compartida.

## Verificación pendiente con Microsoft real

Cuando exista el registro: iniciar sesión con el propietario, comprobar sus negocios previos, cerrar sesión y confirmar que la API devuelve 401. Con otra cuenta autorizada del mismo directorio, comprobar lista propia vacía y rechazo 404 al acceder a un negocio ajeno. No crear otra suscripción ni desplegar servicios para esta verificación. La política del directorio puede exigir consentimiento o asignación de la aplicación; el administrador debe confirmar ese punto.

## Pruebas sin Azure

- `npm run test:auth`: sesiones, caducidad, logout, state, cookie, acceso por negocio, datos existentes y concurrencia. Identidades simuladas en SQLite aislado.
- `npm run test:oidc`: proveedor simulado con JWT firmado localmente; rechaza firma, issuer, audience, nonce, state y expiración incorrectos. No llama a Microsoft.
- `npm run test:workspace` y `npm run test:attachments`: regresión local y errores de Blob simulados.

Estas pruebas validan implementación y controles locales; no prueban consentimiento, MFA ni políticas de la universidad. Tampoco convierten la app en un despliegue público listo para producción.

Referencias oficiales: [registro de aplicación Entra](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app), [URI de retorno](https://learn.microsoft.com/en-us/entra/identity-platform/reply-url) y [openid-client](https://github.com/panva/openid-client).
