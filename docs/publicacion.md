# Publicación de desarrollo en Azure Container Apps

En preparación. El código y la configuración pública están en la misma carpeta del proyecto. No afirmar que el acceso Google público ha sido verificado hasta completar su retorno HTTPS y una prueba del usuario.

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

El firewall PostgreSQL debe conservar la IP local autorizada y agregar solo las IP de salida reportadas por la app. No se habilita la regla de todas las IP ni la de todos los servicios Azure. Revisar las IP al recrear el entorno, porque no se contrató salida fija mediante NAT.

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
