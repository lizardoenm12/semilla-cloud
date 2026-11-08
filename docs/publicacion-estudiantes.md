# Publicación en Azure for Students

Entorno del proyecto: `rg-asistente-negocios-m2`, North Central US. La suscripción estudiantil está habilitada, con el límite de gasto activado. No se modificó el plan ni se tocó la suscripción anterior.

- URL: https://app-asistente-negocios-dev.redplant-0de50877.northcentralus.azurecontainerapps.io
- Callback Google: https://app-asistente-negocios-dev.redplant-0de50877.northcentralus.azurecontainerapps.io/api/auth/callback
- Se reutilizaron Storage, PostgreSQL 16 (B1ms, 32 GiB), Key Vault, Log Analytics e identidad de runtime.
- Se crearon el registro Basic y Container Apps estándar con perfil Consumption: 0.5 vCPU, 1 GiB y 0–1 réplica. El entorno Express provisional se retiró porque no admite los diagnósticos requeridos.
- Se restauró el esquema de 23 tablas, sin copiar filas, usuarios, sesiones o comprobantes del respaldo. La base y los objetos originales siguen en el respaldo privado. Para restaurar el esquema del dump creado por herramientas PostgreSQL 18 en PostgreSQL 16 se omitió únicamente el ajuste de sesión `SET transaction_timeout = 0;`.
- La conexión SQL de la app está en Key Vault, con un rol de base limitado. La identidad de runtime tiene acceso al secreto SQL de aplicación y al contenedor privado de comprobantes; no al secreto administrativo.
- GitHub usa identidades federadas separadas para construir y actualizar la app. El registro mantiene su usuario administrador deshabilitado.
- HTTPS y rechazo de la API privada sin sesión ya se comprobaron. El acceso interactivo con Google requiere autorizar el callback nuevo y configurar el secreto OAuth en Key Vault con acceso de runtime al secreto específico.

Los documentos de cierre del 4 de noviembre describen la suscripción anterior. La URL y el QR de aquella publicación no apuntan a este entorno.

## Verificación de despliegue

GitHub Actions: ejecución 42533221752, jobs image y deploy aprobados. Revisión app-asistente-negocios-dev--0000001. La comprobación remota verificó la versión, HTTPS 200 y rechazo 401 sin sesión. No acredita una sesión Google ni operaciones con la base.

## Monitor y acceso pendiente

Se verificó en Log Analytics un evento estructurado de arranque para la revisión publicada. Las consultas de versiones, rendimiento y errores quedaron guardadas y la alerta quedó habilitada con una evaluación de 15 minutos. La retención es de 30 días y el límite de ingesta es de 0.025 GB diarios. No se disparó un incidente ni se probó un correo de alerta.

Para terminar Google: autorizar el callback indicado arriba en el cliente OAuth web y confirmar que se puede usar su secreto en el Key Vault estudiantil. Se encontró un JSON local que coincide con el cliente de la aplicación. El script `scripts/configurar-oauth-estudiantes.py` está preparado para usar ese archivo privado después de la autorización, con `--autorizado --callback-guardado`. No guardar el JSON en Git. Después del inicio real, probar una operación y subir y descargar un comprobante de prueba.

## Red verificada

PostgreSQL permite las 181 IP de salida de la app mediante reglas exactas; la regla anterior de todos los servicios de Azure y la regla temporal local quedaron retiradas. TLS permanece obligatorio en la aplicación.
