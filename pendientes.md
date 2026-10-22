## Completado: Key Vault funcional — 21/10/2026

Dos secretos reales integrados (PostgreSQL y Google), prueba real aprobada, sin nuevos recursos ni operaciones. Ver docs/keyvault.md y evidencias/keyvault-integracion-real.json. Próximo paso: preparar despliegue Container Apps, HTTPS y uso real de identidad administrada; después Monitor y CI/CD.

## Avance confirmado PostgreSQL
- [x] Inicio Google real y negocios anteriores vinculados al propietario verificado.
- [x] PostgreSQL Flexible Server B1ms/32 GB en Central US, Ready.
- [x] Migración verificada de 22 tablas y 50 registros; conserva 2 negocios, 5 operaciones y el adjunto existente.
- [x] App activa en PostgreSQL con rol de datos, TLS verificado y acceso limitado a IP de desarrollo.
- [x] Copia SQLite conservada; no se crearon gastos ficticios ni se volvieron a cargar archivos a Blob.
- [ ] Integrar la credencial de la base con Key Vault y preparar el acceso del servidor para el despliegue.
- [ ] Container Apps con HTTPS, política de acceso del piloto, Monitor y GitHub Actions.

Las notas de iteraciones anteriores se conservan debajo como historial; el estado actual prevalece.

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

## Inicio de sesión preparado — pendiente de habilitación
- [x] Flujo OIDC con PKCE, validación de firma, state y nonce.
- [x] Sesiones opacas, cierre de sesión y separación por usuario.
- [x] Vinculación de los datos previos solo al oid comprobado del propietario.
- [x] 13 pruebas de identidad y 7 de OIDC con identidades/proveedor simulados, sin Azure.
- [ ] Registro de `cloud-negocios-dev`: el directorio universitario rechazó la creación por permisos insuficientes.
- [ ] Validar un inicio de sesión real, consentimiento y MFA después de obtener el registro.
- [ ] Activar AUTH_MODE=entra solo cuando estén completos el registro y la configuración.

Ver `docs/inicio-sesion-entra.md` y `docs/solicitud-registro-entra.md`. Actualmente continúa el modo local y el respaldo Blob funciona igual.

## Siguiente prioridad
- Inicio de sesión real y permisos multiusuario antes de abrir el acceso a terceros.
- PostgreSQL y despliegue público cuando estén preparados autenticación, costes y cuotas.
- Respaldos completos/restauración, auditoría y estrategia para varios procesos.
- IA generativa opcional con confirmación humana; hoy se usan reglas locales.
- Actualizar diagramas y presentación con el flujo integrado cuando se solicite.

No crear servicios ni ejecutar pruebas de carga sin revisar el presupuesto. La operación aún reside en SQLite local; solo el archivo adjunto se respalda en Azure. La identidad administrada existe, pero la ejecución local usa la sesión de Azure CLI.

## Ajuste después de recibir el Word del curso
- [x] Copia de los requisitos en `docs/requisitos/Course_Project_2026.docx` y matriz de servicios/estado.
- [x] Google preparado como proveedor alternativo; no se exige iniciar sesión Microsoft para cumplir IAM.
- [ ] Crear cliente OAuth Google en un proyecto propio y verificar un inicio de sesión real.
- [ ] Vincular el sub Google del propietario original después de comprobar su identidad.
- [ ] PostgreSQL → secretos funcionales en Key Vault → Container Apps → Monitor → GitHub Actions.
- [ ] Entrega final con URL, PDF y video; ver `docs/requisitos/plan-segun-curso.md`.
