Comprobantes reales integrados al negocio, sin Azure: [comprobantes-locales.md](comprobantes-locales.md).

## Conexiones reales verificadas el 19/10/2026

El backend Next.js se ejecutó en el equipo local autenticado con la sesión Azure CLI. Listó Blob Storage, escribió un comprobante sintético y lo recuperó mediante la API. También leyó el secreto prueba-conexion de Key Vault sin exponer su valor. Una consulta sin token de demo devolvió 401. Evidencia: [conexion-azure-real-2026-10-19.json](../evidencias/conexion-azure-real-2026-10-19.json).

Dos servicios conectados y verificados desde el programa: Blob Storage y Key Vault. Microsoft Entra ID autentica la sesión de desarrollo. El uso de id-cloud-app-dev desde Container Apps aún no se ha probado. No hay una URL pública ni PostgreSQL integrado. La prueba cloud sigue separada del flujo del negocio con SQLite.

Para repetir: configura .env.local según .env.example, inicia sesión con Azure CLI y ejecuta npm run dev:cloud. Para la prueba automatizada del equipo de Lizardo: node scripts/verificar-azure-real.mjs. Este script usa los nombres de recursos del proyecto, crea un comprobante sintético real en cada ejecución y necesita la sesión Azure CLI con permisos. No ejecutarlo en CI sin configurar identidad y recursos de prueba.


## Registro anterior y guía de configuración

Guía de ejecución y presentación actualizada al 19/10: [GUIA-JESSEL.md](GUIA-JESSEL.md). Incluye prueba de conexiones Azure desde una sesión CLI; falta verificarla contra la suscripción.

# Documentación vigente del repositorio

Versión local 0.2.0, actualizada el 17/10/2026.

| Archivo o carpeta | Uso |
|---|---|
| `../README.md` | Instalar y ejecutar la aplicación local. |
| `../CONTRIBUTING.md` | Colaboración GitHub entre Lizardo y Jessel mediante ramas y pull requests. |
| `servicios-azure.md` | Lista vigente de siete servicios y ruta de integración. |
| `../azure-pipelines.yml` | CI preparado; sin despliegue ni ejecución remota verificados. |
| `avance-local-2026-10-17.md` | Avance real, pruebas y pendientes actuales. |
| `modelo-ampliado.md` | Correspondencia entre el producto, el modelo Chen y SQLite. |
| `modelo-chen/modelo-chen-completo.svg` | E/R conceptual vigente, reúne las nueve láminas del proyecto. |
| `modelo-chen/01-*.svg` a `04-*.svg` | Acceso, movimientos, propuestas y detalle/inventario. |
| `modelo-chen/06-*.svg` a `09-*.svg` | Arquetipos, diagnósticos, planes, aprendizaje y conversaciones. |
| `modelo-chen/10-proyecciones-futuro.svg` | Proyecciones diseñadas para una fase posterior; no implementadas. |
| `modelo-chen/05-ejemplo-foto-corregido.svg` | Ejemplo académico de Cliente/Pedido/Artículo; no agrega esas entidades al producto. |
| `schema-local.sql` | DDL real de SQLite de esta versión; no ejecutar en PostgreSQL. |
| `../evidencias/*.json` | Resultados de las pruebas locales verificadas. |

El E/R ya fue actualizado para la aplicación local: una propuesta puede generar varios movimientos; se incorporaron perfiles, arquetipos, diagnósticos, planes, aprendizaje y conversaciones. Se conserva la notación Chen: rectángulos, rombos, óvalos, claves subrayadas, detalle débil y participación total en trazo grueso.

## SVG y exportaciones PNG

Las fuentes vectoriales SVG están incluidas y pueden verse o editarse sin generar imágenes. Para exportarlas a PNG, después de instalar las dependencias:

```powershell
npm.cmd run diagrams:png
```

En esta carpeta OneDrive, la copia automatizada de archivos binarios fue rechazada por Windows. Por eso las fuentes SVG están guardadas en el repositorio; las exportaciones PNG y capturas originales siguen disponibles en el ZIP entregado. El script permite regenerar las exportaciones de los diagramas; las capturas del navegador se producen al ejecutar las pruebas con Playwright.

## Documentación histórica

`modelo-datos/` conserva el primer modelo lógico, anterior a Chen. `avance-M2.md`, `despliegue.md` y `arquitectura-provisional.*` corresponden a la etapa de preparación cloud; no demuestran recursos desplegados. Para presentar el producto actual, usar el modelo ampliado y el avance local.
