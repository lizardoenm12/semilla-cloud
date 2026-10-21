> Actualización 20/10/2026: hay respaldo Azure opcional integrado con los movimientos; ver [comprobantes-azure.md](comprobantes-azure.md). La copia local y los límites descritos aquí se conservan.

# Comprobantes reales de movimientos

Esta función trabaja íntegramente en local. No crea recursos ni realiza llamadas a Azure. La demo cloud de comprobantes sintéticos conserva su funcionamiento separado.

## Uso

En Movimientos y comprobantes, elige una venta, gasto o compra confirmada. Selecciona un archivo y pulsa Adjuntar comprobante. Puedes descargarlo o quitarlo después de confirmar la eliminación. Los filtros por descripción y tipo aplican a los 40 movimientos recientes que carga el MVP; no son una búsqueda de todo el historial.

Se admiten PNG, JPEG y PDF hasta 2 MiB cada uno. El límite es cinco archivos por movimiento y 25 MiB por negocio. Se valida extensión, tipo declarado, cabecera de formato y base64 canónico. No es un análisis antivirus ni una validación estructural completa del documento. Las descargas usan Content-Disposition attachment, nosniff y CSP sandbox. No se renderizan archivos incrustados ni se aceptan HTML o SVG.

## Datos y migración

La tabla movement_attachments conserva el archivo en base64 dentro de SQLite junto a nombre, MIME, tamaño, SHA-256, fecha, negocio y movimiento. Su clave propia es id y la relación (business_id,movement_id) referencia un movimiento del mismo negocio. No se convierte en entidad débil por depender operativamente del movimiento, ya que tiene identificador propio.

La inicialización añade esta tabla e índice si faltan y registra schema_version 2. Conserva las tablas y registros anteriores; no borra ni reinicializa bases. Base64 aumenta el tamaño físico alrededor de un tercio, además de la sobrecarga de SQLite. El límite de 25 MiB corresponde al contenido decodificado activo por negocio, no al tamaño total de la base. No es una solución para archivos grandes. Adjuntar y eliminar no cambia importes, movimientos, propuestas ni stock. El borrado no asegura eliminación forense del archivo SQLite ni de sus respaldos.

Para respaldar, hay que conservar la base SQLite mediante un procedimiento consistente con la aplicación detenida. La exportación del perfil JSON no incluye el contenido binario de los adjuntos y no constituye un respaldo integral. Los archivos, .env y la base están excluidos de Git y Docker por las reglas existentes. No guardar comprobantes de usuarios reales en el repositorio.

## Seguridad y siguiente fase

La API exige APP_MODE=local, Host loopback y Origin coincidente para mutaciones. La pertenencia del movimiento al negocio se verifica para listar, subir, descargar y eliminar. Los cuerpos se leen con límite incremental: 3 MiB para subir un adjunto y 20 000 bytes para las otras operaciones JSON. No hay autenticación multiusuario: permanece como requisito antes de publicar el producto.

La siguiente fase podrá conservar metadatos y mover el contenido a un adaptador Blob explícito. Esta entrega no activa ese adaptador y no aumenta el consumo de Azure. El rol de la identidad administrada y las cuotas cloud necesitarán verificarse por separado.
