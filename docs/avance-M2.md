# M2 - Arquitectura y avance técnico

Asistente de gestión para pequeños negocios guatemaltecos. Cloud Computing 2026, Universidad Galileo, FISICC. Fecha: 16/10/2026, Guatemala.

Integrantes: Lizardo Gonzalez (24000682), Jessel Contreras (23011020).

## Problema y solución
Los pequeños negocios necesitan registrar ventas y gastos de forma sencilla. La solución final interpretará texto, propondrá movimientos y permitirá confirmar/corregir antes de guardar. Tendrá separación por negocio, historial, inventario y dashboard. M2 demuestra únicamente persistencia de un comprobante sintético de Q50 mediante frontend/backend y almacenamiento privado.

## Cambio de proveedor
El usuario confirmó Azure porque no obtuvieron créditos gratuitos de Google Cloud. Se migró el código existente, conservando sus pantallas y rutas. La cuenta fue creada por Jessel; el nombre/ID de suscripción, región y permisos todavía no se han verificado. No se han creado recursos cloud en esta sesión.

## Cumplimiento reportado
| Requisito del TXT | Estado verificable | Falta |
|---|---|---|
| Cuenta/proyecto configurado | Reportado por el usuario, sin evidencia | Suscripción habilitada y acceso individual |
| Dos servicios desplegados | Pendiente | Container Apps + Blob Storage con lectura/escritura real |
| Diagrama | Fuente editable y exportación preparadas | Actualizar con recursos verificados |

El Word académico no fue adjuntado. La aceptación de servicios, fechas y formato debe contrastarse con el original. No se declara M2 completo.

## Arquitectura M2 propuesta
Navegador -> HTTPS -> Azure Container Apps (Next.js frontend/backend) -> Azure Blob Storage (JSON privado). La identidad administrada asignada por el usuario accede solo al contenedor mediante Storage Blob Data Contributor y al registro ACR mediante AcrPull. El token de demo se obtiene de un secreto de Container Apps. La demo no implementa autenticación final de usuarios. El script configura cuenta Storage sin acceso público ni claves compartidas, HTTPS y TLS 1.2 mínimo. Los scripts no fueron ejecutados contra Azure.

Fuente: arquitectura-provisional.mmd. Exportaciones: arquitectura-provisional.svg y el diagrama incluido en el PDF. Todo se etiqueta como preparado/propuesto hasta verificar la nube.

## Siete servicios propuestos para el final
| Servicio Azure | Función | Estado |
|---|---|---|
| Container Apps | Web y API | Código y Dockerfile preparados; falta despliegue |
| Blob Storage | Comprobantes privados | SDK preparado; falta integración remota |
| Container Registry | Imágenes y compilación ACR Tasks | Script preparado, no ejecutado |
| Database for PostgreSQL | Negocios, movimientos e inventario | Planeado |
| Servicio de IA Azure (modelo por confirmar) | Interpretación en propuestas | Planeado; depende de disponibilidad |
| Key Vault | Secretos centralizados | Planeado; M2 usa secreto de Container Apps |
| Monitor / Log Analytics | Logs persistentes, métricas y alertas | Planeado; logs de consola no lo sustituyen |

Microsoft Entra ID y RBAC apoyan la solución; no se presupone que el docente los cuente como un servicio independiente. La lista requiere aprobación académica, no representa siete servicios implementados.

## Cambios y validación
SDK Google retirado; SDK Azure Blob + Identity, DefaultAzureCredential con identidad administrada o CLI local; UUID v4 estricto; lectura posterior por ID; listado acotado a una muestra de 100; logs sin mensajes completos de SDK; estados sin simular despliegue. Next.js actualizado a 16.4.1 por el parche oficial del 14/10/2026. Lockfile regenerado.

Instalación reproducible con npm ci desde caché aprobada. Tipos y build aprobados. Sintaxis Bash de ambos scripts aprobada (bash -n), sin ejecutar despliegue. Trece comprobaciones HTTP locales aprobadas; salida real en evidencias/pruebas-locales.json. Los intentos iniciales de instalación/compilación fallaron por red y restricciones de enlaces del entorno; al habilitar el acceso necesario y mantener SDKs como paquetes externos, la compilación final funcionó. La verificación se realizó en Windows con Node 24; imagen Docker prevista Node 22, no construida aquí. npm informó cero vulnerabilidades tras retirar el SDK Google; esto no garantiza ausencia de vulnerabilidades futuras.

Las pruebas locales verifican health, páginas, rechazo sin token, token incorrecto, IDs inválidos y errores controlados sin configuración Azure. No verifican escritura remota. El script remoto compara el comprobante completo en una petición nueva y deja pendientes las comprobaciones administrativas.

## Registro de infraestructura (rellenar con evidencia real)
- Suscripción / ID: pendiente.
- Grupo de recursos: pendiente.
- Región: pendiente.
- Aplicación / URL HTTPS / revisión lista: pendiente.
- Cuenta Storage / contenedor: pendiente.
- Identidad / scopes de roles: pendiente.
- Registro ACR / imagen: pendiente.

## Próximo paso y evidencias
Jessel revisa Suscripciones en Azure Portal y otorga acceso individual al compañero. Seguir docs/despliegue.md una etapa a la vez. Los scripts preparar/publicar pueden generar cargos; revisar presupuesto, créditos, región y cuotas antes de ejecutarlos. No hay garantía de costo cero ni límite monetario automático por 0-2 réplicas.

Guardar evidencia de suscripción, recursos desplegados, health 200, POST sin token 401, POST válido 201 Q50, objeto privado, GET posterior idéntico, lectura sin token rechazada, controles de privacidad y log con el mismo ID. Token y claves excluidos de toda entrega.

## Pendientes finales
Completar M2 remoto; confirmar Word; base de datos, IA, aislamiento por negocio y autenticación, inventario, dashboard, monitoreo persistente, Key Vault, pipeline, costos por región/cantidades, video y paquete final. No se ha enviado nada a GES.

## Fuentes
- https://learn.microsoft.com/en-us/azure/container-apps/managed-identity
- https://learn.microsoft.com/en-us/azure/container-apps/managed-identity-image-pull
- https://learn.microsoft.com/en-us/azure/storage/blobs/storage-quickstart-blobs-nodejs
- https://learn.microsoft.com/en-us/cli/azure/containerapp
- https://learn.microsoft.com/en-us/cli/azure/storage/container-rm
- https://nextjs.org/blog/nextjs-security-update-october-14-2026
