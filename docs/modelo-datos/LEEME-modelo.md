> Versión histórica de notación lógica. El diseño conceptual corregido en Chen está en ../modelo-chen/EXPLICACION_CHEN.md; DETALLE cambia a clave por movimiento y número de línea.

# Modelo entidad-relación propuesto

Proyecto: asistente de gestión para pequeños negocios guatemaltecos.
Equipo: Lizardo Gonzalez (24000682) y Jessel Contreras (23011020).
Fecha: 16/10/2026. Destino propuesto: Azure Database for PostgreSQL.

Este es el diseño de la aplicación final, no una base de datos ya implementada. La demo M2 actual guarda comprobantes sintéticos directamente en Blob Storage; aún no crea estas tablas.

## Lectura del diagrama
PK: clave primaria. FK: clave foránea. UK: unicidad. 1: exactamente uno. 0..N: cero o muchos. 0..1: opcional y como máximo uno. La fuente Mermaid muestra cardinalidades con pata de cuervo; el PNG/SVG usa etiquetas numéricas equivalentes.

- USUARIO y NEGOCIO tienen una relación muchos a muchos resuelta por MEMBRESIA. Su PK compuesta evita duplicar una membresía.
- Una membresía activa y con rol autorizado permite registrar operaciones o solicitar propuestas de IA. Un usuario puede pertenecer a varios negocios con distintos permisos.
- MOVIMIENTO agrupa ventas, compras y gastos confirmados; DETALLE_MOVIMIENTO conserva cantidades y precios históricos. Un gasto sin producto puede tener una línea solo descriptiva.
- PROPUESTA_IA conserva la entrada y la propuesta. No registra dinero ni stock hasta que una persona confirma. Un movimiento puede originarse sin IA y una propuesta puede no convertirse en movimiento. Si se confirma, origina como máximo un movimiento.
- PRODUCTO es el catálogo de cada negocio. MOVIMIENTO_INVENTARIO registra entradas, salidas, saldo inicial y ajustes. Las existencias se calculan sumando cantidad_delta por negocio/producto; no se guarda un segundo saldo que pueda desincronizarse.
- COMPROBANTE registra metadatos y ubicación de objetos privados de Blob Storage. No almacena tokens, enlaces SAS ni el archivo binario en PostgreSQL. Un movimiento admite cero o varios comprobantes.

## Reglas para la implementación posterior
1. Aislamiento por negocio: propagar negocio_id y usar claves foráneas compuestas contra claves UNIQUE (negocio_id, id) en productos, movimientos, propuestas y detalles. Las referencias entre tablas deben corresponder siempre al mismo negocio. autor_id + negocio_id referencia MEMBRESIA. Implementar autorización del backend y políticas de seguridad por fila (RLS) con contexto de negocio validado por el servidor; no confiar en el negocio_id enviado por el navegador.
2. Unicidad: MEMBRESIA(negocio_id, usuario_id), PRODUCTO(negocio_id, sku), USUARIO(identidad_externa), MOVIMIENTO(propuesta_id) cuando no sea nulo y COMPROBANTE(ruta_blob). identidad_externa representa el proveedor/emisor y el sujeto estable, no solo el correo. No guardar contraseñas en estas tablas.
3. Importes con numeric(14,2); cantidades con numeric(14,3). Usar timestamptz para fechas y convertir a America/Guatemala al mostrar. Moneda GTQ en esta versión. Exigir cantidades de detalle positivas, precios y totales no negativos, y delta de inventario distinto de cero. No usar float para dinero.
4. El total del movimiento debe concordar con la suma de sus subtotales cuando existan detalles. Una venta/compra necesita al menos un detalle; un gasto puede registrarse solo con su total. No hay descuentos, impuestos separados ni cuentas por cobrar en este alcance.
5. Confirmar propuesta, crear movimiento/detalles y registrar stock en una sola transacción PostgreSQL; bloquear/revisar existencias para evitar ventas concurrentes con stock negativo. Rechazar confirmaciones duplicadas. Guardar los datos corregidos definitivos en movimiento/detalles; datos_propuestos conserva la propuesta original.
6. Los productos con controla_stock=false no generan entradas de inventario. Cada entrada puede tener detalle_id nulo para ajustes/saldo inicial. Si detalle_id existe, la FK compuesta (negocio_id, detalle_id, producto_id) debe asegurar que el detalle corresponde al mismo producto. La unicidad y el flujo transaccional deben evitar aplicar dos veces la misma venta/compra. Una anulación se conserva y genera contrapartidas de inventario; no eliminar historia.
7. Comprobar permisos de membresía activa al escribir. La FK acredita pertenencia, pero no valida por sí sola rol ni estado activo. No borrar en cascada registros financieros al retirar usuarios; desactivar membresías/productos y conservar la historia.
8. Escritura de Blob Storage y transacción SQL no son atómicas entre sí. Manejar estados/reintentos y limpieza de objetos huérfanos al incorporar comprobantes reales.

## Archivos
- diagrama-er.mmd: fuente Mermaid editable.
- diagrama-er.svg: diagrama vectorial ampliable.
- diagrama-er.png: imagen para insertar en Word o presentación.

Es un modelo lógico propuesto; aún falta convertir las reglas en migraciones SQL y probar su integridad y autorización. No se desplegó una base de datos ni se modificó el alcance de la demo M2.
