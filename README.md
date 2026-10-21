Material de exposición y respuestas: [presentación](docs/presentaciones/Presentacion_defensa_cloud.pptx) y [defensa técnica](docs/defensa-tecnica-cloud.md).

> **Nuevo: movimientos y comprobantes locales.** En la sección “Movimientos y comprobantes” puedes filtrar los 40 registros recientes, seleccionar uno, adjuntar PNG/JPG/PDF, descargarlos y quitarlos. No requiere Azure. Ver [alcance y límites](docs/comprobantes-locales.md).

> **Actualización 19/10/2026:** backend conectado a Blob Storage y Key Vault, con pruebas reales aprobadas usando Azure CLI. Evidencia en `evidencias/conexion-azure-real-2026-10-19.json`. Container Apps e identidad administrada en ejecución pendientes.

> **Guía para Jessel y demo de conexiones Azure:** [docs/GUIA-JESSEL.md](docs/GUIA-JESSEL.md). Ejecutar `npm run dev:cloud` para la demo Azure o `npm run dev:local` para el negocio con SQLite.

# Semilla - asistente para negocios guatemaltecos

**Versión local 0.2.0 - 17/10/2026.** Semilla es un nombre provisional.
Equipo: Lizardo Gonzalez (24000682) y Jessel Contreras (23011020).

Repositorio privado: https://github.com/lizardoenm12/semilla-cloud. Para colaborar, leer [CONTRIBUTING.md](CONTRIBUTING.md). Los [siete servicios Azure acordados](docs/servicios-azure.md) y el YAML `azure-pipelines.yml` definen la continuación hacia la versión compartida. El YAML está preparado para validar el código; no se ha ejecutado en Azure DevOps ni desplegado la aplicación.

Primera implementación del producto ampliado. Conserva el proyecto Next.js existente y la demostración Azure separada. Funciona localmente con SQLite, sin cuenta Azure, sin claves y sin servicios de IA.

## Abrir la aplicación
Requiere **Node.js 24 LTS** y npm. Instalar dependencias una vez desde la carpeta que contiene package.json:

```powershell
npm.cmd ci
npm.cmd run dev:local
```

Abrir **http://127.0.0.1:3000**. En Windows también se puede ejecutar `INICIAR_LOCAL.cmd`. El script instala dependencias solo si falta node_modules. La instalación inicial requiere Internet; el flujo local de producto no usa servicios externos. No hay que configurar .env ni Azure.

Para ejecutar la compilación de producción local:

```powershell
npm.cmd run build
npm.cmd run start:local
```

Los datos se guardan en `.data/negocios.sqlite`. Cerrar y volver a iniciar conserva el historial. No eliminar ese archivo para actualizar. Es una versión inicial del esquema; futuros cambios necesitarán migraciones que respeten los datos. El ZIP excluye bases de datos, cachés y credenciales.

## Qué se puede probar
1. Seleccionar Tienda La Ceiba (negocio sintético con 24 aguas y 30 panes, sin ventas ficticias) o crear otro negocio con su propia idea, clientes y etapa.
2. Abrir Contar mi día y escribir `Vendí diez aguas a Q5 cada una y gasté Q20 de transporte`.
3. Revisar, corregir cantidades/precios/productos y confirmar. Se crean una venta y un gasto, se actualizan resumen y stock y se guardan comprobantes locales.
4. Rechazar una propuesta: no cambia ningún movimiento ni existencia.
5. Añadir productos y registrar compras (`Compré 6 aguas a Q3`) o ajustes (`Entraron 5 aguas; salieron 2 panes`). En esta etapa se usan unidades enteras.
6. Elegir uno de los cuatro arquetipos, completar una autoevaluación y seguir acciones de mejora. Se conservan evaluaciones y diagnósticos anteriores; repetir la autoevaluación no borra el avance del plan.
7. Leer contenidos de educación financiera, guardar el avance y conversar con la guía local que usa información del negocio seleccionado.
8. Descargar una instantánea JSON del Perfil Productivo Digital. Esta instantánea contiene las ventanas visibles de historial; no es un respaldo integral de SQLite. Para respaldo completo, conservar la base cerrando la aplicación y copiando su archivo con un procedimiento de respaldo consistente.

## Alcance real de la interpretación
El analizador local **usa reglas**, no IA generativa. Reconoce solo los formatos del apartado anterior; avisa sobre texto desconocido o productos ambiguos y permite introducir/corregir registros a mano. Una propuesta nunca modifica dinero o inventario antes de confirmar. Confirmación, movimientos, detalles, comprobantes y existencias se guardan en una transacción; un fallo revierte el conjunto. No permite stock negativo ni repetir una confirmación.

El dinero se guarda en centavos enteros. Ventas menos gastos y compras se muestra como **diferencia registrada**, no como utilidad ni saldo bancario. Esta fase asume operaciones de contado; no implementa crédito, impuestos, descuentos ni contabilidad completa.

## Perfil y acompañamiento
El arquetipo es una autoelección, no una evaluación psicológica validada. El dashboard cambia la orientación según la elección y muestra un punto de partida para negocios en idea, o historial de siete días para negocios en marcha/crecimiento. Las autoevaluaciones registran organización, hábitos de registro y formalidad declarada; no calculan obligaciones ni riesgos fiscales. Planes y conversaciones usan reglas transparentes.

## Modelo de datos

Consultar primero [el índice de documentación vigente](docs/INDICE.md). El E/R ampliado está en `docs/modelo-chen/modelo-chen-completo.svg`. Las exportaciones PNG se pueden generar con `npm run diagrams:png` después de instalar las dependencias.
- `docs/modelo-chen/`: modelo conceptual ampliado en notación Chen, SVG/PNG y generador editable. Las láminas con entidades repetidas pertenecen al mismo modelo.
- `docs/modelo-ampliado.md`: alcance y correspondencia entre conceptos y tablas.
- `docs/schema-local.sql`: DDL extraído de la implementación, para revisión.
- `src/lib/local/db.ts`: creación real del esquema y semilla.
- `src/lib/local/service.ts`: validación y transacciones de negocio.
- `src/lib/local/parser.ts`: interpretación local sustituible por un proveedor de IA.
- `src/app/api/local/[...path]/route.ts`: API local.
- `src/app/workspace.tsx` y `.css`: interfaz.

Cambio importante: una propuesta puede contener **varias operaciones**. ORIGINA pasa de 1:1 a 1:N; la propuesta completa se confirma una sola vez. Los ajustes de inventario pueden no generar movimientos monetarios.

## Comprobación

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd run test:workspace
npm.cmd run test:local
```

`test:workspace` usa una base temporal separada y prueba persistencia tras reiniciar, importes, stock, rechazos, aislamiento por negocio, historial, aprendizaje y guía. Por defecto no necesita navegador. En esta sesión también se ejecutó el bloque opcional de Playwright/Chrome: navegación, propuesta, confirmación, perfil y móvil. Resultados y capturas en `evidencias/`.

## Modo local y seguridad de alcance
Es una sesión de desarrollo de **un usuario local**, no un sistema de autenticación. El selector separa datos de varios negocios del mismo usuario; todavía no prueba aislamiento entre cuentas reales. Las rutas locales requieren APP_MODE=local (lo configura el lanzador), acceso loopback y origen coincidente para escrituras. Se rechazan entradas inválidas y referencias a productos de otro negocio. No publicar esta sesión como servicio multiusuario; se implementará identidad y autorización real antes de esa etapa.

## Azure y fases siguientes
La demo anterior permanece en `/comprobantes` y `/estado`; requiere Azure y su token, y no se usa para trabajar en local. `docs/despliegue.md` conserva la guía de la fase cloud, aún no ejecutada. Lizardo reportó creación de Blob Storage, identidad administrada y Key Vault. La conexión del backend a esos recursos aún necesita una prueba real autenticada; no hay siete servicios integrados.

Siguientes fases: proveedor real de IA, autenticación y roles reales, historial/auditoría más completo, pruebas de concurrencia y migraciones, proyecciones explicables con datos suficientes, mejoras del dashboard por arquetipo, controles de inventario/contabilidad más amplios y migración a PostgreSQL/Azure. Las finanzas personales y pagos recurrentes quedan como una línea futura separada del negocio.

Los documentos M2 fechados 16/10 reflejan el avance anterior. Para el estado actual consultar `docs/avance-local-2026-10-17.md`.

## Comprobantes de operaciones con Azure

La app local permite respaldar los adjuntos de ventas, gastos y compras en el contenedor privado existente, con estado visible y reintento manual. Las operaciones siguen en SQLite. Ver [configuración y alcance](docs/comprobantes-azure.md).

## Inicio de sesión y acceso por usuario

Flujo Microsoft Entra preparado con sesiones y separación por negocio. **Activación real pendiente del registro autorizado por el administrador del directorio universitario.** El modo local sigue disponible. Ver [estado, configuración y pruebas](docs/inicio-sesion-entra.md) y [solicitud para el administrador](docs/solicitud-registro-entra.md).
