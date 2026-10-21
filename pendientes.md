# Estado y siguientes pasos — 20/10/2026

## Implementado y verificado
- App local con propuestas revisables, ventas, gastos, compras, inventario y varios negocios.
- Adjuntos PNG/JPG/PDF asociados a la operación, validación y límites.
- Respaldo opcional de adjuntos en Azure Blob Storage privado, estado visible y reintento manual.
- Descarga de respaldos desde Azure por servidor y comparación SHA-256; copia local conservada.
- Eliminación coordinada Azure/local con recuperación ante fallo y sin cambiar la operación.
- Migración aditiva SQLite esquema 3; copia de seguridad previa en `.data/backups`.
- Prueba real acotada con un archivo de 68 bytes; evidencia en `evidencias/operacion-azure-2026-10-20.json`.
- 28 comprobaciones HTTP locales y pruebas simuladas de errores/reintentos, sin Azure.
- Guía de ejecución: `docs/comprobantes-azure.md`. Presentación y defensa técnica en `docs`.

## Siguiente prioridad
- Inicio de sesión real y permisos multiusuario antes de abrir el acceso a terceros.
- PostgreSQL y despliegue público cuando estén preparados autenticación, costes y cuotas.
- Respaldos completos/restauración, auditoría y estrategia para varios procesos.
- IA generativa opcional con confirmación humana; hoy se usan reglas locales.
- Actualizar diagramas y presentación con el flujo integrado cuando se solicite.

No crear servicios ni ejecutar pruebas de carga sin revisar el presupuesto. La operación aún reside en SQLite local; solo el archivo adjunto se respalda en Azure. La identidad administrada existe, pero la ejecución local usa la sesión de Azure CLI.
