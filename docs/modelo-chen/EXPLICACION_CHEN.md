> Actualización 17/10/2026: modelo ampliado para la versión local. Consultar ../modelo-ampliado.md para la correspondencia física y el alcance actual.

# Modelo conceptual corregido - notación Chen

Proyecto: asistente de gestión para pequeños negocios guatemaltecos.
Equipo: Lizardo Gonzalez (24000682), Jessel Contreras (23011020).
Fecha: 17/10/2026. Diseño conceptual ampliado; implementación local parcial en SQLite, sin despliegue cloud.

## 1. Revisión de la foto

La referencia ya usa correctamente rectángulos para Cliente/Pedido/Artículo, rombos para Realiza/Se compone y óvalos para atributos. Cantidad está correctamente conectada al rombo Se compone: depende de la pareja pedido-artículo.

| Elemento | Corrección o aclaración |
|---|---|
| Fecha subrayada en Pedido | Una fecha normalmente no identifica un pedido: puede repetirse. Añadir id_pedido subrayado y dejar fecha sin subrayar, salvo que exista una regla explícita de unicidad de fecha. |
| DNI y Núm. Serie | Subrayados si identifican de forma única sus entidades. Núm. Serie sirve si Artículo representa una unidad serializada; si representa un producto del catálogo, usar un identificador de producto/SKU adecuado. |
| Asteriscos de multiplicidad | Usar N/M sobre los segmentos, como pide la consigna. El asterisco se usa en otras variantes, pero no se mezcla aquí con la convención solicitada. |
| Etiquetas globales 1:N y N:M | Sustituirlas por 1/N/M en cada extremo para eliminar duplicación. |
| Participación | La foto no indica obligatoriedad. El ejemplo corregido asume que cada pedido tiene un cliente y al menos un artículo. Por eso las dos conexiones del rectángulo Pedido a sus rombos son gruesas. |
| Debilidad | No se puede deducir solo de la foto. Con id_pedido propio, Pedido es fuerte: llevar cliente obligatorio no lo convierte automáticamente en débil. |

Se entrega 05-ejemplo-foto-corregido para mostrar estas correcciones sin confundir Cliente/Pedido/Artículo con el alcance real del proyecto.

## 2. Corrección del diagrama anterior del proyecto

El diagrama anterior era un modelo lógico con listas de atributos dentro de rectángulos y relaciones indicadas por líneas. No era notación Chen tradicional. La nueva versión representa cada atributo como óvalo independiente, cada relación como rombo y cada entidad como rectángulo. No usa flechas ni patas de cuervo. Se divide en nueve láminas de proyecto (más el ejemplo de la foto) del MISMO modelo para conservar legibilidad; una entidad repetida en dos láminas no es una entidad adicional.

### Entidades fuertes y claves subrayadas

| Entidad | Óvalo de clave primaria (subrayado continuo) |
|---|---|
| USUARIO | id_usuario |
| NEGOCIO | id_negocio |
| PRODUCTO | id_producto |
| MOVIMIENTO | id_movimiento |
| COMPROBANTE | id_comprobante |
| PROPUESTA_IA | id_propuesta |
| ENTRADA_INVENTARIO | id_entrada |

Los demás atributos tienen óvalos simples sin subrayado de PK. La unicidad adicional de identidad_externa y ruta_blob se impone al convertir a tablas. sku es único por negocio, no global. Los ID son globales en estas entidades, por lo que conservan rectángulo simple incluso cuando su participación es obligatoria.

### Entidad débil y relación identificadora

DETALLE_MOVIMIENTO tiene rectángulo doble. Ya no se identifica por el UUID independiente detalle_id de la propuesta anterior: se rediseña con numero_linea local a un movimiento. Dos movimientos pueden tener una línea 1.

- Su clave completa es (id_movimiento, numero_linea).
- numero_linea aparece en un óvalo con subrayado discontinuo, que en Chen expresa clave parcial/discriminador. No es una clave global; no se debe presentar como si bastara por sí sola.
- CONTIENE tiene rombo doble: aporta la identidad del movimiento propietario.
- El tramo DETALLE_MOVIMIENTO–CONTIENE es grueso: todo detalle debe pertenecer a exactamente un movimiento.
- El tramo MOVIMIENTO–CONTIENE es delgado en el modelo general: permite gastos sin detalle. Las ventas y compras requieren una o más líneas mediante una regla adicional por tipo de movimiento.

En Chen, dependencia de existencia y dependencia de identificación se distinguen. No basta tener una FK o una relación obligatoria para dibujar doble rectángulo. PRODUCTO, COMPROBANTE y ENTRADA_INVENTARIO tienen ID propio; su dependencia obligatoria se muestra con línea gruesa, no con una falsa relación identificadora. Si se decidiera identificarlos solo mediante numeración local al propietario, habría que rediseñarlos también como débiles y modificar sus claves.

### Membresía como relación M:N

MEMBRESÍA pasa de tabla asociativa en el modelo lógico a rombo conceptual entre USUARIO y NEGOCIO. rol, activa y desde son óvalos unidos al rombo. No lleva una PK artificial en el diagrama conceptual. Al pasarlo a PostgreSQL se materializa como tabla con PK compuesta (id_usuario, id_negocio). Se conserva una fila por pareja; no se representa un historial de periodos de membresía.

## 3. Cardinalidad y participación, relación por relación

La cardinalidad expresa el máximo (1, N o M). La línea gruesa expresa el mínimo obligatorio; la fina permite cero. Una relación 1:1 con dos líneas finas permite cero o uno en ambos extremos; ORIGINA ahora es 1:N para permitir frases con varias operaciones. Las líneas que unen óvalos con su entidad o relación siempre son finas: no expresan participación.

| Relación | Cardinalidad | Tramo grueso (total) | Tramo fino (parcial) |
|---|---|---|---|
| USUARIO–MEMBRESÍA–NEGOCIO | M:N | NEGOCIO–MEMBRESÍA | USUARIO–MEMBRESÍA |
| NEGOCIO–ADMINISTRA–PRODUCTO | 1:N | PRODUCTO–ADMINISTRA | NEGOCIO–ADMINISTRA |
| NEGOCIO–REGISTRA–MOVIMIENTO | 1:N | MOVIMIENTO–REGISTRA | NEGOCIO–REGISTRA |
| USUARIO–AUTORÍA–MOVIMIENTO | 1:N | MOVIMIENTO–AUTORÍA | USUARIO–AUTORÍA |
| MOVIMIENTO–RESPALDA–COMPROBANTE | 1:N | COMPROBANTE–RESPALDA | MOVIMIENTO–RESPALDA |
| USUARIO–SOLICITA–PROPUESTA_IA | 1:N | PROPUESTA_IA–SOLICITA | USUARIO–SOLICITA |
| NEGOCIO–CONTEXTUALIZA–PROPUESTA_IA | 1:N | PROPUESTA_IA–CONTEXTUALIZA | NEGOCIO–CONTEXTUALIZA |
| PROPUESTA_IA–ORIGINA–MOVIMIENTO | 1:N | MOVIMIENTO–ORIGINA | PROPUESTA_IA–ORIGINA |
| MOVIMIENTO–CONTIENE–DETALLE_MOVIMIENTO | 1:N | DETALLE_MOVIMIENTO–CONTIENE | MOVIMIENTO–CONTIENE |
| DETALLE_MOVIMIENTO–REFERENCIA–PRODUCTO | N:1 | Ninguno | Ambos extremos |
| PRODUCTO–TIENE–ENTRADA_INVENTARIO | 1:N | ENTRADA_INVENTARIO–TIENE | PRODUCTO–TIENE |
| DETALLE_MOVIMIENTO–GENERA–ENTRADA_INVENTARIO | 1:N | Ninguno | Ambos extremos |

Justificación de los mínimos:
- Un usuario puede registrarse antes de vincularse a un negocio. Se propone que todo negocio se cree junto con al menos una membresía propietaria; la regla de propietario ACTIVO requiere validación adicional, pues no se expresa solo con el grosor.
- Un negocio puede estar vacío; cada producto, movimiento y propuesta pertenece a uno.
- Un movimiento tiene un autor. Un comprobante no se registra sin movimiento, aunque el movimiento puede no tener comprobantes.
- Toda propuesta tiene solicitante y negocio, pero puede rechazarse. Una operación manual tampoco requiere IA: se revisa y confirma dentro de una propuesta. Una propuesta origina varios movimientos, o ninguno si se rechaza o solo ajusta inventario. Se confirma una sola vez.
- Un gasto puede tener detalle sin producto. Un producto puede no haberse usado todavía.
- Toda entrada de inventario corresponde a un producto. Un ajuste/saldo inicial puede no provenir de un detalle; un detalle de un producto sin control de stock puede no generar inventario.

## 4. Reglas para convertir a PostgreSQL

1. La identidad de acceso utiliza un identificador estable de proveedor + sujeto; email es contacto. No guardar contraseñas en estas entidades.
2. Toda relación entre datos operativos debe mantenerse dentro del mismo negocio. El autor/solicitante debe tener membresía activa y permiso. Una FK no verifica por sí sola rol, estado activo ni autorización.
3. Materializar las relaciones 1:N mediante FKs y la M:N mediante la tabla Membresia. No duplicar dichas FKs como óvalos en el modelo conceptual.
4. DETALLE_MOVIMIENTO usa PK (id_movimiento, numero_linea). Las referencias de inventario a detalle deben llevar ambos componentes de la clave. Aplicar restricciones que garanticen el mismo producto y negocio.
5. El catálogo pertenece a un negocio; el inventario hereda ese contexto a través del producto; los comprobantes y detalles a través del movimiento. Si se propaga id_negocio por seguridad/RLS, exigir coherencia con FKs compuestas, no valores independientes.
6. precio_venta_gtq, total_gtq, precio_unitario_gtq y subtotal_gtq usan NUMERIC(14,2). cantidad y cantidad_delta usan NUMERIC(14,3). Fechas con TIMESTAMPTZ y presentación America/Guatemala. No se usa FLOAT para dinero.
7. Las ventas/compras tienen al menos una línea y su total concuerda con subtotales. Los gastos pueden no tener detalle. cantidades de detalle positivas, importes no negativos; cantidad_delta no nula ni cero. La suma de las entradas por producto produce existencias.
8. Confirmación IA, movimiento, detalles e inventario se guardan en una transacción. Evitar confirmación duplicada comprobando el estado de la propuesta dentro de la transacción; no hacer único propuesta_id en movimientos, porque una propuesta puede generar varios. Controlar concurrencia de stock y usar contrapartidas para anulaciones, conservando historia.
9. ENTRADA_INVENTARIO es un nombre conceptual más claro para la entidad que antes llamamos MOVIMIENTO_INVENTARIO; no representa una entidad adicional. Su ID global justifica rectángulo simple.
10. ruta_blob identifica cuenta/contenedor/objeto privado; no almacenar SAS ni tokens. La transacción SQL no incluye atómicamente Blob Storage: prever reintentos y objetos huérfanos.

El modelo conceptual se acompaña de una primera implementación local; las rutas cloud anteriores permanecen separadas. Las proyecciones están solo diseñadas. No hay esquema desplegado en Azure.

## 5. Archivos

- 01-acceso-catalogo.svg / .png: usuarios, membresías, negocios y productos.
- 02-movimientos-comprobantes.svg / .png: operaciones, autoría y comprobantes.
- 03-propuestas-ia.svg / .png: solicitante, negocio y confirmación opcional.
- 04-detalle-inventario.svg / .png: entidad débil, relación identificadora y stock.
- 05-ejemplo-foto-corregido.svg / .png: corrección independiente de la referencia adjunta.
- generar_chen.py: fuente editable y reproducible de las láminas SVG (solo biblioteca estándar de Python).
- estructura.json: inventario de entidades y atributos por lámina.

SVG es vectorial y editable; PNG sirve para insertar en documentos. La rasterización se realizó con Sharp. No se usó Mermaid erDiagram porque produciría otra notación.

## Referencia primaria

Peter P. Chen (1976), The Entity-Relationship Model—Toward a Unified View of Data, ACM TODS 1(1), 9–36: https://doi.org/10.1145/320434.320440
Repositorio del autor: https://csc.lsu.edu/~chen/papers.html

Se emplea la convención docente Chen solicitada: subrayado de claves, clave parcial discontinua, doble borde de debilidad e identificación, y trazo grueso como representación de participación total.

## Ampliación de esta versión
Las láminas 06–10 incorporan arquetipos y evaluaciones, diagnóstico y planes, aprendizaje, conversaciones y proyecciones futuras. Leer ../modelo-ampliado.md para su alcance exacto y reglas de fase.
