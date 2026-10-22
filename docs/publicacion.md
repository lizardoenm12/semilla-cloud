# Publicación de desarrollo en Azure Container Apps

App desplegada y prueba técnica pública aprobada el 21/10/2026 (Guatemala).

URL: https://app-asistente-negocios-dev.happyocean-ee55db6c.centralus.azurecontainerapps.io/

El usuario confirmó el inicio completo con Google desde la URL HTTPS y que ve sus negocios. La prueba técnica utilizó una sesión interna temporal del propietario ya verificado y la revocó al terminar; no se presentó como otro inicio OAuth real. Se verificó el conjunto completo de 161 IP de salida autorizadas y se conservó la regla del equipo local. El despliegue ARM inicial terminó con GatewayTimeout en algunas reglas; se completaron únicamente las pendientes y la comprobación final confirmó todas las reglas esperadas. La aplicación permaneció operativa durante ese cierre.

## Recursos y límites

- Un entorno `cae-cloud-dev`, Central US, perfil Consumption.
- Una aplicación `app-asistente-negocios-dev`, 0.5 vCPU / 1 GiB, mínimo cero y máximo una réplica por revisión, modo de revisiones Single. El máximo no es un límite monetario ni una garantía de que una sustitución de revisión no solape contenedores temporalmente.
- Registro privado Basic `acrcloudlizardo01`, administrador deshabilitado; tiene costo de almacenamiento/servicio aunque la app duerma. Está contemplado dentro de la reserva de planificación, no es gratuito por llamarse pequeño.
- Identidad existente `id-cloud-app-dev` para leer Key Vault, acceder a Blob y extraer imágenes (AcrPull en ese registro).
- Identidad separada `id-cloud-build-dev` con AcrPush únicamente en el registro y federación GitHub OIDC restringida al repositorio y rama main. No tiene acceso a secretos ni a la base de datos.
- Se conserva Free Trial y spendingLimit On. No se crea un plan de cómputo dedicado, NAT Gateway ni Log Analytics en esta etapa.

## Construcción y publicación

Azure restringe ACR Tasks en suscripciones con créditos gratuitos. La imagen se construye en GitHub Actions con Docker y se sube al registro privado. Los minutos de GitHub Actions siguen las cuotas del plan GitHub, independientes del crédito Azure. El flujo tiene timeout de veinte minutos y una cola única; no realiza pruebas de carga ni lecturas de secretos.

El archivo `.github/workflows/imagen-dev.yml` utiliza acciones fijadas a commits, autenticación federada y etiquetas de imagen por SHA completo. No guarda contraseña de Azure ni de ACR en GitHub. La imagen excluye `.env*`, `.data`, descargas OAuth, evidencias y documentos. Se publica código, nunca respaldos de usuario.

En esta fase GitHub construye y sube la imagen; el despliegue se ejecuta con el script Azure autorizado. No contar todavía este flujo como CI/CD completo que despliega a Azure automáticamente.

## Seguridad del servidor

`APP_MODE=cloud` exige autenticación externa, PostgreSQL, referencias Key Vault y origen HTTPS canónico. Los endpoints de negocios rechazan otro Host y las escrituras exigen Origin exacto. No se admite usuario local ni fallback a SQLite en cloud. Las cookies OAuth y sesión son HttpOnly, SameSite=Lax y Secure con HTTPS. El endpoint de salud no expone configuración ni consulta los servicios de pago.

El runtime utiliza la identidad administrada vinculada. La URL PostgreSQL y secreto Google se recuperan de Key Vault únicamente en el servidor. Los comprobantes permanecen en Blob privado. Los datos y sesiones son los mismos de la base actual; un nuevo dominio requiere iniciar sesión allí y no comparte cookies con localhost.

El firewall PostgreSQL debe conservar la IP local autorizada y agregar solo las IP de salida reportadas por la app. Azure reportó un conjunto de 161 IP posibles de salida. Se autoriza ese conjunto exacto; son direcciones compartidas de la plataforma, no una red exclusiva de esta app. PostgreSQL sigue exigiendo credenciales y TLS. No se habilita la regla de todas las IP ni la de todos los servicios Azure. La integración privada o salida fija queda como mejora posterior. Revisar las IP al recrear el entorno, porque no se contrató salida fija mediante NAT.

## Configurar Google para la URL pública

En Google Cloud Console, proyecto Asistente-Negocios, abrir Google Auth Platform → Clientes → cliente web existente. Agregar, sin borrar el retorno local:

`https://app-asistente-negocios-dev.happyocean-ee55db6c.centralus.azurecontainerapps.io/api/auth/callback`

Agregar `https://app-asistente-negocios-dev.happyocean-ee55db6c.centralus.azurecontainerapps.io` a orígenes JavaScript autorizados si se usa esa lista. Guardar. El flujo del servidor usa la URI de redirección; no necesita descargar otra contraseña ni crear otro cliente OAuth. Si el consentimiento está en modo Testing, los usuarios que prueben deben estar autorizados en Audiencia → Usuarios de prueba.

Este ajuste requiere una sesión Google del propietario; no se realiza mediante permisos Azure. La prueba final del usuario confirma el consentimiento y callback real. Una redirección del servidor a Google por sí sola no demuestra que Google haya aceptado el retorno.

## Operación y pausa

La dirección continúa existiendo mientras se conserve la app y la suscripción habilitada. Al quedar sin tráfico, la app puede bajar a cero; al recibir otra petición arranca y puede tardar. Esto no pausa PostgreSQL ni el registro de imágenes. Consultar docs/costos-y-cierre.md antes del vencimiento del crédito. Los avisos de presupuesto todavía no se han configurado.

Fuentes:
- https://learn.microsoft.com/en-us/azure/container-apps/managed-identity-image-pull
- https://learn.microsoft.com/en-us/azure/container-apps/scale-app
- https://learn.microsoft.com/en-us/azure/container-registry/container-registry-tasks-overview


## Evidencia técnica pública

`evidencias/publicacion-real.json`: HTTPS y salud 200; negocios sin sesión 401; propietario con sesión temporal 200; origen ajeno 403; dos negocios conservados en PostgreSQL; descarga de comprobante Blob con SHA-256 correcto; redirección Google con retorno público correcto. No se agregaron operaciones ni archivos.

La imagen `acrcloudlizardo01.azurecr.io/asistente-negocios:792933773f48969d06dbe930c3ae468e101cd7f6` fue construida correctamente en GitHub Actions, ejecución 39720933995, intento 2. El primer intento detectó una diferencia del subject OIDC; se ajustó la federación al subject exacto emitido por GitHub, con IDs estables del propietario y repositorio y la rama main. No se aumentaron permisos ni se crearon contraseñas.

El endpoint público no contiene Azure CLI. La prueba de PostgreSQL, Key Vault y Blob se ejecutó con la identidad administrada vinculada. Verificar de nuevo las IP de salida al recrear la infraestructura.


## Herramientas históricas retiradas del acceso público

Los enlaces Comprobantes y Estado de servicios pertenecían a la demostración inicial. Sus API requerían DEMO_TOKEN y la de comprobantes solo trabajaba sobre el prefijo `comprobantes-demo/`, separado de los adjuntos reales `operaciones/`. Antes de este cambio, solicitudes públicas sin token devolvieron 401; no se detectó acceso público libre por esas API.

La app cloud ahora oculta ese encabezado y devuelve 404 en `/comprobantes`, `/estado`, `/api/comprobantes` (GET y POST) y `/api/estado`, incluso si se configurara o suministrara un token demo. Los adjuntos reales continúan en Movimientos y comprobantes, con sesión y autorización por negocio. No se eliminan archivos ni se cambian sus permisos de Blob.

Antes de completar CI/CD, las actualizaciones usaban `scripts/actualizar-imagen.py IMAGEN_CON_SHA`: reemplaza solo la imagen de la app existente, conserva configuración, identidad y escala, y espera una revisión lista. No vuelve a configurar PostgreSQL ni sus reglas de red. Desde el 22/10, el flujo activo de GitHub Actions construye y despliega automáticamente; ver docs/cicd.md. El script anterior queda como herramienta de operación dirigida.


Verificación publicada del retiro de demo: raíz 200 sin enlaces técnicos; las dos pantallas y sus API devolvieron 404 (incluido POST sintético); negocios sin sesión 401 y con sesión temporal autorizada 200. La sesión temporal fue revocada; sin movimientos, descargas de adjuntos ni cambios en permisos. Evidencia: evidencias/demo-publica-deshabilitada.json y evidencias/actualizacion-imagen.json. Imagen de esa verificación: 03048b82290e7cb037bcc528cb542d4e41e9dc2a.


El inicio sin sesión fue rediseñado y publicado con la imagen 219eb67bb18e4b52f52e5a609e2875fec746bbbd. Guía editable y revisión de escritorio/móvil: docs/diseno-inicio.md; evidencia pública: evidencias/diseno-inicio.json. La autenticación, los datos y los permisos no cambiaron.


## CI/CD y Monitor completados el 22/10

Run 39864595655 correcto con dos jobs y federación OIDC separada para construir y publicar. Revisión 0000004, imagen por SHA 5bca0110e138416fe193300d0286a15d90c8c2f8. Salud con versión exacta, login 200 y API privada sin sesión 401. Sin cambios de base o firewall. Evidencia: `evidencias/cicd-despliegue.json`.

Azure Monitor conserva eventos reales de esta versión y consultas de errores, duración y arranques. Regla de errores habilitada y correo configurado. El usuario recibió el aviso de incorporación. No se ejercitó una alerta por incidente; el endpoint de prueba rechaza Free Trial. Ver [observabilidad](observabilidad.md) y `evidencias/monitor-real.json`.
