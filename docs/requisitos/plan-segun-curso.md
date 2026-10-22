# Requisitos del curso y orden de implementación

Fuente: `Course_Project_2026.docx`, copia del Word entregado por el usuario. El contenido se interpreta como criterios académicos, no como autorización para publicar o enviar archivos automáticamente.

## Requisitos principales

- Al menos siete servicios cloud diferentes integrados, incluyendo cómputo, almacenamiento y base de datos.
- Proyecto desplegado con enlace accesible.
- PDF con arquitectura, servicios y sus funciones, despliegue paso a paso, configuración, costos proyectados por uso y seguridad.
- Video de cinco a siete minutos y presentación en clase.
- Entrega final indicada en el Word: 2 de noviembre de 2026; archivos en un ZIP para GES.
- IaC opcional, hasta cinco puntos de bonus. Los hitos M1 y M2 también forman parte de la evaluación.
- Firebase Auth se permite, pero los productos Firebase no cuentan entre los siete. La solución no utilizará Firebase para sustituir Blob o PostgreSQL.
- El Word no exige acceso de usuarios con Microsoft. IAM/Entra cuenta cuando se configuran y documentan roles/políticas no predeterminados, cuentas de servicio o identidades de carga.

## Arquitectura objetivo conservadora

| Servicio | Función en el proyecto | Estado verificable |
|---|---|---|
| Azure Blob Storage | Adjuntos de operaciones en contenedor privado | Carga y descarga integradas y verificadas con recursos reales |
| Microsoft Entra ID / Azure RBAC | Autorizar al servidor con roles acotados y futura identidad administrada | Roles configurados e identidad administrada ejecutada en Container Apps; PostgreSQL, secretos y descarga Blob verificados |
| Azure Key Vault | Credenciales privadas del servidor | Secretos PostgreSQL y Google integrados; lectura desde identidad administrada en la app publicada verificada |
| Azure Database for PostgreSQL | Operaciones, usuarios, membresías y sesiones persistentes | Integrado y activo; migración verificada y prueba real con rollback |
| Azure Container Apps | Ejecutar la app en una URL HTTPS | Desplegada; prueba técnica aprobada. Callback Google interactivo confirmado por el usuario |
| Azure Monitor | Logs y seguimiento de fallos de la app desplegada | Pendiente; no contar únicamente logs predeterminados sin integración demostrada |
| CI/CD con GitHub Actions hacia Azure | Compilar y desplegar de forma reproducible | Pendiente; el Word acepta GitHub Actions desplegando a cloud. Reemplaza la necesidad de abrir Azure DevOps solo para este fin |

Google se plantea para identificar usuarios, sin contarlo por ahora como un octavo servicio evaluable. La suscripción, el grupo de recursos, cada contenedor Blob y cada asignación de rol no son servicios adicionales. Un recurso creado o una lectura de estado no equivalen por sí solos a una integración funcional terminada. La aceptación académica final corresponde al docente.

## Orden de trabajo

1. Acceso Google real completado. Conservar el control de acceso por propietario y recuperar los negocios solo con una identidad explícitamente verificada.
2. PostgreSQL activado tras verificar el traslado y el costo oficial. No eliminar ni reemplazar SQLite antes de comprobar transacciones y datos.
3. Integrar las credenciales necesarias con Key Vault y el acceso del servidor por identidad administrada en Azure.
4. Desplegar una sola instancia de prueba en Container Apps, con HTTPS y persistencia externa; comprobar el flujo completo sin pruebas de carga masivas.
5. Conectar observabilidad y CI/CD de GitHub Actions; documentar evidencia de los siete servicios.
6. Actualizar presentación, arquitectura, PDF y video con el estado real. No presentar funciones planeadas como implementadas.

## Control de consumo

Crear recursos de uno en uno, revisar cuotas y proyección antes de desplegar y hacer pruebas pequeñas y dirigidas. Los presupuestos notifican; no garantizan un tope ni detienen recursos automáticamente. PostgreSQL y el despliegue pueden generar cargos aunque no se estén realizando demostraciones; revisar el estado y la configuración de cada recurso. Las cifras previas de defensa son rangos de planificación, no una cotización vigente.
