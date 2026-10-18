# Modelo ampliado del producto

## Cinco pasos que se reflejan en la aplicación
1. Plantear: negocio, actividad, etapa, oferta, cliente y valor diferencial.
2. Conocerse: arquetipos y evaluaciones históricas del emprendedor. El perfil actual es una referencia a su última elección.
3. Entender: diagnósticos históricos del negocio. Las respuestas iniciales son organización, registros y formalidad declarada; el formulario versionado y evaluación fiscal requieren una fase posterior.
4. Organizar: un plan actual por negocio, orientado por el último diagnóstico, y sus acciones con progreso.
5. Crecer: indicadores construidos con movimientos e inventario, aprendizaje, conversación y futuro cálculo de escenarios/proyecciones.

## Modelo conceptual y persistencia de esta fase
| Concepto Chen | Implementación local |
|---|---|
| USUARIO, NEGOCIO, MEMBRESÍA | users, businesses, memberships; usuario de demostración sin login |
| PRODUCTO, ENTRADA_INVENTARIO | products, inventory_entries; existencias por suma de deltas |
| PROPUESTA_IA | proposals; nombre conceptual, proveedor real todavía sustituido por reglas |
| MOVIMIENTO, DETALLE_MOVIMIENTO | movements, movement_details; detalle débil PK (movement_id,line_number) |
| COMPROBANTE | receipts, con payload JSON en SQLite; no es factura ni objeto Blob de esta fase |
| ARQUETIPO | catálogo constante en contracts.ts, validado por el servicio |
| EVALUACION_ARQUETIPO | archetype_evaluations; método de autoelección |
| Perfil actual del emprendedor | entrepreneur_profiles; referencia actual derivada del historial |
| DIAGNOSTICO | diagnostics; formulario inicial de tres respuestas |
| PLAN_MEJORA, ACCION_MEJORA | improvement_plans, plan_actions; fuente del plan = diagnóstico más reciente |
| CONTENIDO_EDUCATIVO, COMPLETA | catálogo constante LESSONS y learning_progress |
| CONVERSACION, MENSAJE | conversations, messages; un hilo por usuario-negocio en esta fase |
| PROYECCION | solo diseño conceptual; sin tabla ni cálculo implementados |
| Perfil Productivo Digital / dashboard | consultas compuestas; no una tabla que mezcle todos los dominios |

## Ajuste del flujo propuesto originalmente
Una frase puede contener venta, gasto, compra y ajuste. Por eso PROPUESTA–ORIGINA–MOVIMIENTO es 1:N, con participación total del movimiento en esta versión (también el registro manual se confirma como propuesta). Una propuesta puede no generar movimientos si solo ajusta inventario; el ledger conserva su referencia. La confirmación completa es una transacción y una propuesta confirmada no puede ejecutarse de nuevo.

La propuesta conserva el texto y los datos interpretados originales. Al confirmar se guarda además la versión corregida. Nunca se sustituye silenciosamente la interpretación por datos definitivos. Las entradas ambiguas requieren corrección humana.

## Reglas económicas e inventario
- Dinero en centavos enteros; cantidades enteras en la primera versión. PostgreSQL futuro usará NUMERIC.
- Venta reduce stock; compra lo incrementa y registra importe; ajuste mueve solo stock. No se admite resultado negativo.
- Se evalúa el lote en orden: una compra previa puede abastecer una venta posterior en la misma confirmación.
- Gastos sin producto no afectan inventario. Los productos locales actuales controlan stock; servicios/productos sin stock se incorporarán después.
- La diferencia ventas−gastos−compras no se presenta como utilidad, proyección ni saldo bancario.
- La separación por negocio se comprueba en cada ruta y en las referencias de productos. Las relaciones del ledger se crean exclusivamente desde el flujo transaccional validado. Falta aislamiento real entre identidades y pruebas multiusuario.

## Evolución y trazabilidad
El historial de diagnósticos y de elección de arquetipo se conserva. En esta etapa, la etapa y el planteamiento del negocio guardan solo su valor actual; la auditoría completa de esos cambios y las versiones históricas de planes quedan pendientes. La instantánea de perfil exportada contiene las ventanas visibles (20 propuestas/diagnósticos/evaluaciones, 40 movimientos y 50 mensajes); la base conserva el resto. No es una herramienta de respaldo completo.

## Cómo leer las láminas Chen
01 acceso/catálogo; 02 movimientos/autoría/comprobantes; 03 propuestas; 04 detalle/inventario; 05 ejemplo independiente de la foto; 06 arquetipos; 07 diagnóstico/plan; 08 aprendizaje; 09 conversación; 10 proyecciones futuras. Entidades en rectángulos, relaciones en rombos y atributos en óvalos. Solo DETALLE es débil por identificación, con doble rectángulo y rombo CONTIENE doble; numero_linea es discriminador con subrayado discontinuo. Claves propias con subrayado continuo. Grueso = participación total; fino = parcial. Una entidad repetida es la misma entidad, no una tabla nueva.

Todos los catálogos, métodos, predicciones y reglas que no estén implementados se indican expresamente. La forma del diagrama conceptual no implica que ya exista cada tabla en SQLite o en Azure.
