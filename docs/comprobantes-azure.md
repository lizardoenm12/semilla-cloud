> Actualización: Google ya fue verificado con la cuenta real y los datos del negocio y sesiones están en PostgreSQL. La app continúa local; los archivos respaldados permanecen en Blob. Ver [estado PostgreSQL](postgresql.md). Las referencias anteriores a SQLite describen el modo alternativo o el estado previo al traslado.

# Operación y comprobante con respaldo Azure

## Alcance implementado

Desde la app: Contar mi día → preparar propuesta → revisar → confirmar → Movimientos y comprobantes → seleccionar operación → adjuntar PNG/JPG/PDF.
La operación, importes e inventario siguen en SQLite local. Con `ATTACHMENT_STORAGE=azure`, el servidor respalda el archivo en el contenedor privado existente y conserva la copia local. No despliega la app ni migra las operaciones a una base cloud. La app sigue limitada al equipo local hasta implementar autenticación real.

La lista muestra Solo en este equipo, Guardado en Azure o Pendiente de reintentar en Azure. No se hacen listados remotos periódicos ni migración automática de archivos anteriores. El botón Reintentar respaldo permite respaldar un archivo anterior o recuperar una carga fallida. Al fallar una carga, no se repite ni modifica la operación.

## Ejecutar desde PowerShell

```powershell
cd D:\Usuario\Lizardo\cloud
npm.cmd ci
az login
$env:PORT="3010"
npm.cmd run dev:local
```

Abrir http://127.0.0.1:3010. `npm ci` solo es necesario al instalar o cambiar dependencias. La cuenta de `az login` necesita Colaborador de datos de Storage Blob sobre el recurso. No compartir tokens ni contraseñas. El iniciador busca también la instalación estándar de Azure CLI de Windows.

Configurar `.env.local` (privado e ignorado por Git):

```dotenv
ATTACHMENT_STORAGE=azure
AZURE_STORAGE_ACCOUNT=stclouddevlizardo01
AZURE_STORAGE_CONTAINER=comprobantes
```

Para trabajar sin llamadas a Azure, cambiar `ATTACHMENT_STORAGE=local` y reiniciar. Los archivos ya marcados Guardado en Azure siguen descargándose o eliminándose en su ubicación remota registrada; los archivos nuevos se guardan solo localmente. La configuración no elimina respaldos existentes.

## Persistencia y seguridad

- Migración aditiva a esquema 3: `attachment_cloud` relaciona el adjunto con cuenta, contenedor, nombre y estado; no borra datos previos. La copia local conserva el archivo en base64. Respaldar toda `.data`, con SQLite cerrado o usando SQLite Backup API; la exportación del perfil no incluye archivos.
- Ruta remota estable: `operaciones/<negocio>/<movimiento>/<adjunto>`. El nombre no contiene el nombre original del archivo ni datos personales. El mismo reintento sobrescribe los mismos bytes inmutables; no genera otro objeto.
- La app comprueba negocio y movimiento antes de contactar Azure. Descarga a través del servidor, con cabeceras de descarga, sin URL pública ni SAS expuesto. Los adjuntos respaldados se descargan de Azure y se verifica tamaño y SHA-256; un fallo remoto devuelve un error recuperable, no una descarga local presentada como remota.
- Quitar elimina primero el objeto remoto y después el registro local. Si Azure falla, se conserva el registro y se permite reintentar. La eliminación remota puede quedar sujeta a retención o soft delete configurados en Azure.
- La tabla de ubicación también se conserva tras una carga incierta, para poder reintentar o quitar el objeto sin dejarlo deliberadamente sin referencia. El bloqueo por adjunto protege acciones concurrentes dentro de un proceso; despliegue multiproceso pendiente.
- Límites actuales: 2 MiB por archivo, 5 por movimiento y 25 MiB de archivos activos por negocio, tanto en local como respaldados. No antivirus ni comprobación completa de estructura PDF/imagen. La sesión actual es local, no un sistema multiusuario público.
- No hay colas, sincronización de fondo ni reintentos automáticos de la carga. El SDK usa un intento por petición y un tiempo acotado. Una operación de SDK puede implicar más de una solicitud HTTP; no constituye una promesa de facturación exacta.

## Verificación

`npm run test:workspace`: pruebas HTTP con SQLite aislado y respaldo Azure desactivado.
`npm run test:attachments`: Azure simulado, sin red: fallos recuperables, concurrencia, reintentos, integridad, separación de negocios y eliminación.
`npm run verify:azure-operation`: prueba REAL opcional y manual; crea un movimiento en SQLite aislado y carga un PNG de menos de 100 bytes en el contenedor existente, luego lo descarga y compara. No ejecutarla rutinariamente. El objeto se conserva como evidencia, con ubicación documentada en `evidencias/operacion-azure-2026-10-20.json`. No usa los negocios del usuario.

Implementación basada en el SDK oficial: [carga de blobs](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-upload-javascript) y [BlobClient / downloadToBuffer](https://learn.microsoft.com/javascript/api/@azure/storage-blob/blobclient).
