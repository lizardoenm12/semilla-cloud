# Pausa del proyecto después de la presentación

Estado al 4 de noviembre de 2026, Guatemala. La aplicación fue detenida y el job `image` de GitHub Actions quedó con `if: ${{ false }}`. El job deploy depende de image, por lo que tampoco publica. Retirar esa condición solo cuando exista de nuevo un entorno Azure preparado.

## Cierre completado

El propietario autorizó eliminar rg-cloud-dev. Se comprobó que el grupo dejó de existir y que no quedaron recursos activos en la suscripción. Azure aceptó después la cancelación. El estado observado y la respuesta están en `evidencias/cierre-azure-2026-11-04.json`.

La URL anterior y su QR ya no ofrecen la aplicación. Los jobs de despliegue permanecen pausados. No se retiró el límite de gasto ni se convirtió el plan a pago por uso. El consumo anterior puede reflejarse con retraso; la cancelación no borra consumo ya incurrido.

Para continuar no basta con encender la página: habrá que disponer de una suscripción válida y reconstruir los recursos. No se garantiza conservar nombres, URL o crédito de prueba. El repositorio y los respaldos locales permanecen disponibles.

## Respaldo local privado verificado

Carpeta: `D:\Usuario\Lizardo\cloud\.data\backups\cierre-2026-11-04`.

- `negocios.dump`: exportación PostgreSQL custom sin propietarios ni ACL; restaurada en PostgreSQL local y comparadas las 23 tablas por conteos exactos.
- `blobs/`: cuatro objetos descargados; tamaños y hashes SHA-256 comprobados en el manifiesto.
- `proyecto.PRIVADO.zip`: código y documentos, sin node_modules, cachés, .data ni archivos .env privados. Estructura ZIP comprobada.
- `recursos.json`, `app-antes.json`, `suscripcion.json`: inventario y configuración de referencia. Tratar el conjunto como privado.
- `respaldo-verificado.json` y `verificacion-completa.json`: resultado del respaldo y restauración.

No subir esta carpeta a Git ni compartirla: contiene información de los negocios. La restauración de comprobación local se detuvo al finalizar.

No se exportaron valores de Key Vault: la revisión automática rechazó esa acción por falta de autorización específica. Conservar por separado la configuración privada YA existente en .data/private y los archivos OAuth locales. Si no se conservan o dejan de servir, regenerar credenciales SQL/OAuth al reconstruir. El ZIP no es una copia de esas credenciales.

## Para continuar en el futuro

1. Conservar otra copia privada del respaldo en un dispositivo seguro; no depender de la retención temporal de una suscripción cancelada.
2. Comprobar si la suscripción puede reactivarse y bajo qué plan. No retirar spendingLimit ni aceptar pago por uso automáticamente. El crédito de prueba no se renueva por cancelar y reactivar.
3. Si los recursos ya no existen, reconstruir usando infra y los scripts revisados del repositorio. Los nombres y URL públicos pueden cambiar.
4. Crear un PostgreSQL compatible, un rol de aplicación y restaurar negocios.dump con pg_restore. Revisar roles/propiedad para el entorno nuevo. La restauración local verificada fue de PostgreSQL 16 hacia PostgreSQL 18; no garantiza restaurar un dump de una versión futura hacia otra anterior.
5. Recuperar los objetos de blobs en la cuenta y contenedores adecuados. Si cambia la ubicación, actualizar las referencias guardadas en la base; copiar archivos a otra cuenta no cambia esas referencias automáticamente.
6. Recuperar o regenerar secretos, configurar Key Vault e identidades/RBAC y comprobar red y TLS. No colocar secretos en Git.
7. Restaurar la configuración Google de origen/callback si cambia el dominio. Revisar audiencia autorizada.
8. Publicar una versión y verificar login, operación, descarga privada y Monitor con una prueba pequeña.
9. Solo entonces habilitar otra vez el workflow y validar el despliegue. Retirar `if: ${{ false }}` del job image requiere publicar el cambio conscientemente.

Fuentes: https://learn.microsoft.com/en-us/azure/cost-management-billing/manage/cancel-azure-subscription y https://learn.microsoft.com/en-us/azure/cost-management-billing/manage/subscription-disabled .
