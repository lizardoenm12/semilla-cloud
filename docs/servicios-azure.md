# Servicios cloud acordados y ruta de integración

Selección indicada por el equipo el 17/10/2026. Esta lista reemplaza la propuesta anterior que contaba ACR o IA dentro de los siete. No representa siete servicios desplegados. Su aceptación académica se contrasta con el Word/docente cuando esté disponible.

| Servicio acordado | Responsabilidad | Qué falta comprobar |
|---|---|---|
| Azure Container Apps | Ejecutar web y backend | Imagen, revisión disponible, URL compartida y pruebas de aplicación. |
| Azure Blob Storage | Comprobantes e imágenes de productos privados | Escritura/lectura desde backend y acceso privado comprobado. La demo solo implementa comprobantes; carga de imágenes de productos pendiente. |
| Azure Database for PostgreSQL | Usuarios, negocios, ventas, gastos e inventario | Migraciones, driver y persistencia compartida; SQLite actual no se despliega como base compartida. |
| Microsoft Entra ID e identidades administradas | Identidad entre servicios y roles acotados | Identidades, permisos y evidencias de acceso/rechazo. El inicio de sesión de personas requiere una configuración adicional. |
| Azure Monitor | Logs, errores, rendimiento y alertas | Instrumentación, destino persistente, alerta y evidencia de funcionamiento. |
| Azure DevOps / Azure Pipelines | Pruebas y despliegue al actualizar código | Conectar GitHub y ejecutar CI; después añadir CD con conexión Azure por federación. |
| Azure Key Vault | Secretos del backend | Vault, permisos de lectura de la identidad y referencias al secreto desde Container Apps. El secreto propio de la demo Container Apps no equivale a Key Vault configurado. |

ACR puede apoyar el almacenamiento de imágenes del contenedor, pero no sustituye uno de los siete acordados. El proveedor de IA sigue pendiente de elección e integración; no se añade ni activa automáticamente.

## Qué resuelve GitHub ahora

Un repositorio privado permite compartir, revisar y combinar avances de código y documentación. Cada integrante ejecuta la versión local con su propia base. Publicar el código en GitHub no convierte Next.js y SQLite en una aplicación web compartida, y GitHub Pages no ejecuta este backend.

La URL para que ambos vean y modifiquen la misma información llegará con Container Apps y PostgreSQL. Las rutas `/api/local` actuales permanecen limitadas al equipo que las ejecuta: no se deben exponer eliminando sus comprobaciones.

## Flujo de entrega acordado

```mermaid
flowchart LR
    GH[GitHub privado: semilla-cloud] --> CI[Azure Pipelines: instalar, tipos, build y pruebas]
    CI -. CD por configurar .-> APP[Azure Container Apps]
    APP --> DB[Azure Database for PostgreSQL]
    APP --> BLOB[Azure Blob Storage]
    APP --> KV[Azure Key Vault]
    ID[Microsoft Entra ID / identidades administradas] -. identidad y roles .-> APP
    ID -. acceso .-> DB
    ID -. acceso .-> BLOB
    ID -. acceso .-> KV
    APP -. logs y métricas .-> MON[Azure Monitor]
```

## Etapas concretas

1. Crear `semilla-cloud` privado, subir el código e invitar a Jessel. Confirmar URL y permisos reales.
2. Crear/conectar el proyecto de Azure DevOps al repositorio GitHub y seleccionar el YAML existente. La validación no necesita una suscripción Azure para su lógica, pero sí acceso al servicio DevOps y un agente/parallel job habilitado. No se promete disponibilidad gratuita.
3. Implementar migraciones PostgreSQL, autenticación/autorización, persistencia compartida y metadatos Blob. Conservar la transacción de confirmación e impedir referencias entre negocios.
4. Configurar la suscripción de Jessel, región, presupuesto e identidades con acceso acotado. Preparar Key Vault y Monitor.
5. Añadir despliegue al pipeline mediante una conexión ARM con federación de identidades y entorno de despliegue definido. No usar secretos de producción en validaciones de pull requests.
6. Probar desde dos cuentas y equipos: aislamiento por negocio, escritura/lectura compartida, rechazo sin permiso, logs y alerta. Registrar evidencia real.

El YAML preparado actualmente valida código y publica un artefacto de fuentes; no despliega recursos, no configura Key Vault ni convierte la aplicación local en multiusuario.

## Fuentes oficiales

- GitHub con Azure Pipelines: https://learn.microsoft.com/en-us/azure/devops/pipelines/repos/github
- Container Apps con Azure Pipelines: https://learn.microsoft.com/en-us/azure/container-apps/azure-pipelines
- Identidades administradas: https://learn.microsoft.com/en-us/azure/container-apps/managed-identity
- Inicio de sesión de personas con Entra: https://learn.microsoft.com/en-us/azure/container-apps/authentication-entra
- Secretos y referencias Key Vault: https://learn.microsoft.com/en-us/azure/container-apps/manage-secrets
- Conexión ARM y federación: https://learn.microsoft.com/en-us/azure/devops/pipelines/library/connect-to-azure
