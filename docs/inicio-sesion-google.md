> Actualización: Google ya fue verificado con la cuenta real y los datos del negocio y sesiones están en PostgreSQL. La app continúa local; los archivos respaldados permanecen en Blob. Ver [estado PostgreSQL](postgresql.md). Las referencias anteriores a SQLite describen el modo alternativo o el estado previo al traslado.

# Inicio de sesión con Google y servicios Azure

## Estado

Google está preparado como proveedor OIDC alternativo. La configuración y el inicio de sesión real requieren un cliente OAuth Web creado en un proyecto Google Cloud propio. No se ha creado un proyecto Google ni unas credenciales desde Codex. La app conserva el modo local y su conexión real con Blob hasta completar este paso.

Google identifica a la persona. La base de datos y los archivos permanecen en Azure según la arquitectura del proyecto; no hay que migrarlos a GCP. La identidad del servidor, Azure RBAC e identidad administrada siguen siendo necesarios para proteger los recursos Azure. No se presupone que el acceso Google cuente como otro de los siete servicios del curso.

## Configurar Google Cloud

1. Entrar en https://console.cloud.google.com/ con una cuenta personal y crear el proyecto `Cloud Negocios`, separado de otros proyectos como Carpe Diem. Esto separa credenciales y configuración.
2. Seleccionar el proyecto y abrir Google Auth Platform. Completar Branding con nombre de la app y correo de soporte/contacto.
3. En Audience seleccionar External para usar cuentas personales. Mantener el entorno de pruebas durante el desarrollo; agregar las cuentas del equipo a Test users si el panel lo solicita. Las políticas de cuentas administradas pueden limitar el acceso. El comportamiento exacto de usuarios de prueba depende de los scopes y políticas de Google.
4. Pedir únicamente identidad básica `openid profile`; no Gmail, Drive ni Calendar. No se usa Firebase. No es necesario desplegar cómputo o base de datos en Google para este flujo.
5. En Clients crear un OAuth Client de tipo Web application. Nombre sugerido: `Cloud Negocios Local`.
6. Agregar exactamente la URI de retorno `http://localhost:3010/api/auth/callback`. Si se solicita origen JavaScript, usar `http://localhost:3010`.
7. Descargar el JSON del cliente OAuth y guardarlo fuera del repositorio, por ejemplo en Descargas. Ese archivo contiene un secreto: no subirlo a Git ni enviarlo por chat.
8. Desde la carpeta del proyecto:

```powershell
node scripts/configurar-google.mjs "C:\ruta\client_secret_descargado.json"
$env:PORT="3010"
npm.cmd run dev:local
```

El configurador comprueba el tipo Web y la URI de retorno. Conserva las variables Azure, respalda la configuración previa en `.data/backups` y guarda los valores privados en `.env.local` sin imprimir secretos. Abrir `http://localhost:3010` y pulsar Iniciar sesión con Google. No mezclar esta dirección con 127.0.0.1 durante el acceso.

## Recuperar los negocios previos

Un usuario nuevo no hereda los negocios de la demostración. La identidad estable de Google es el claim `sub`, no el nombre ni el correo. Después de un inicio de sesión REAL se puede consultar el usuario propio en `/api/auth/session`; su id tiene la forma `google:<sub>`.

Solo después de comprobar que es la cuenta del propietario original, configurar `AUTH_LEGACY_GOOGLE_SUB=<sub verificado>` y volver a iniciar sesión. También se puede pasar `--owner-sub <sub verificado>` al configurador. No se selecciona automáticamente al primer visitante ni se vinculan identidades distintas por coincidir el correo. La recuperación conserva movimientos, adjuntos y archivos Azure; no vuelve a cargarlos.

Si ya se hubieran vinculado los negocios a otra identidad, el cambio requiere una migración deliberada; no se reemplaza el propietario silenciosamente. El registro Entra universitario no se activó, por lo que esa vinculación no se realizó en el equipo actual.

## Controles y límites

Se reutiliza Authorization Code + PKCE S256, state y nonce, verificación criptográfica de firma OIDC con JWKS, issuer, audience y expiración. Sesión opaca de ocho horas, cookie HttpOnly/SameSite y Secure con HTTPS. Las sesiones de un proveedor se rechazan cuando se cambia al otro. Cerrar sesión revoca la sesión de la app, no toda la cuenta Google del navegador.

La app sigue ejecutándose en loopback y SQLite. Antes de publicar se requiere backend persistente, HTTPS, configuración del retorno de producción y una política de acceso apropiada para el piloto. El modo local no debe exponerse como un acceso público sin autenticación. No se ha publicado ni se ha validado un acceso real hasta disponer de credenciales OAuth.

Pruebas: `npm run test:google` usa identidades simuladas, no Google; `npm run test:oidc` verifica tokens con un proveedor simulado. Ninguna sustituye el recorrido real de consentimiento y acceso con la cuenta del usuario.

Referencia: [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect) y [configuración del cliente](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).
