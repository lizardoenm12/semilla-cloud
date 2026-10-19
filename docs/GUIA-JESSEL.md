# Cloud: guía para ejecutar y presentar

Actualizado el 19/10/2026. El nombre del producto es provisional.
Repositorio privado: https://github.com/lizardoenm12/semilla-cloud

## Demo del negocio sin Azure

Acepta la invitación de Lizardo a GitHub. Instala Node.js 24 LTS, descarga Code → Download ZIP y descomprime. Abre INICIAR_LOCAL.cmd y luego http://127.0.0.1:3000. Mantén abierta la terminal. La primera instalación requiere Internet.

Alternativa en PowerShell, desde la carpeta que contiene package.json:

```powershell
npm.cmd ci
npm.cmd run dev:local
```

Selecciona Tienda La Ceiba y escribe en Contar mi día: `Vendí diez aguas a Q5 cada una y gasté Q20 de transporte`. Muestra la propuesta antes de confirmar. Confirma una sola vez: venta Q50, gasto Q20 y diferencia registrada Q30. Con la base inicial las aguas pasan de 24 a 14. Muestra arquetipos, autoevaluación, planes y aprendizaje.

SQLite conserva los datos en cada computadora; GitHub no sincroniza la base. Interpretación y guía usan reglas, no IA generativa. No hay autenticación multiusuario ni contabilidad completa.

## Demo del backend conectado a Azure desde el equipo

Esta es una demo separada de infraestructura. No conecta todavía las ventas SQLite con Blob ni sustituye SQLite por PostgreSQL. Tampoco es una web publicada. Para correrla:

1. Instala Azure CLI desde https://learn.microsoft.com/en-us/cli/azure/install-azure-cli-windows y abre una terminal nueva.
2. Ejecuta `az login` e inicia sesión con tu propia cuenta. Lizardo debe concederte acceso al recurso si usas otra cuenta. Para esta demo necesitas lectura del recurso, Colaborador de datos de Storage Blob sobre almacenamiento y Usuario de secretos de Key Vault sobre el vault. No compartir la cuenta de Lizardo.
3. Ejecuta `az account show --query "{nombre:name,estado:state}" -o table` y verifica la suscripción correcta. Si tienes varias, usa `az account set --subscription "ID de la suscripción del proyecto"`.
4. Copia .env.example a .env.local. Los nombres de recursos ya están rellenados con lo reportado; corrígelos si cambiaron.
5. Genera un token en tu terminal: `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Guarda ese valor solo en DEMO_TOKEN de .env.local y úsalo en el campo Token de la demo del navegador. No es un token Azure. No lo subas a GitHub ni lo muestres en la presentación.
6. Detén la otra demo con Ctrl+C. Ejecuta `npm.cmd ci` si aún no instalaste dependencias y luego `npm.cmd run dev:cloud`.
7. Abre http://127.0.0.1:3000/estado, introduce tu token y pulsa Consultar estado.
8. Si Blob y Key Vault están accesibles, verás listado correcto y lectura del secreto verificada sin revelar su valor. La identidad local es tu sesión Azure CLI; no es la identidad administrada del backend.
9. Abre /comprobantes y pulsa el botón para crear el comprobante sintético. El backend escribe JSON en Azure Blob y lo vuelve a descargar. Usa la lista para recuperarlo otra vez; verifica el objeto en Azure Portal → comprobantes → comprobantes-demo/.
10. Vuelve a /estado para mostrar los resultados. Si un servicio falla no presentarlo como integrado. El código muestra el resultado real.

Errores: 401 en la demo indica DEMO_TOKEN ausente/incorrecto. HTTP_403 de Key Vault o AuthorizationPermissionMismatch de Blob indica revisar la cuenta, roles, propagación y reglas de red. HTTP_404 de Key Vault indica revisar el vault y el secreto prueba-conexion. Espera unos minutos tras asignar roles y vuelve a consultar. Si la terminal no encuentra az, vuelve a abrirla tras instalar Azure CLI.

## Qué tenemos y cómo contarlo

Tres componentes preparados según la configuración reportada por Lizardo: Blob Storage (stclouddevlizardo01, contenedores privados comprobantes y productos), identidad id-cloud-app-dev con roles y Key Vault kv-cloud-lizardo-dev con el secreto de prueba. Crear dos contenedores no equivale a dos servicios. Los presupuestos y el grupo rg-cloud-dev tampoco suman servicios distintos.

El backend incluye conexiones reales de Blob y Key Vault; falta ejecutarlas contra esta suscripción y guardar evidencia. No afirmar que la lectura de Key Vault desde la aplicación funciona hasta probarla. La lectura del secreto es una prueba de conectividad; aún no configura credenciales funcionales del negocio. El contenedor productos está preparado pero esta demo no implementa carga de imágenes de productos.

Container Apps, PostgreSQL, Monitor y la ejecución de Azure Pipelines siguen pendientes. El YAML de Pipelines está en el repo, sin ejecución remota verificada. No hay URL pública del producto. Las alertas de presupuesto no equivalen a Monitor configurado para la aplicación.

Guion: “Tenemos un MVP local funcional y una demo de conexiones Azure. Primero mostramos una venta revisada y confirmada. Después mostramos los resultados reales de acceso a Blob y Key Vault, y un comprobante escrito y recuperado por el backend. La identidad administrada está preparada; su uso se comprobará cuando despleguemos en Container Apps. Los demás servicios siguen en integración.” Si todavía no se ejecutó la demo Azure, decir que está preparada, sin afirmar resultados.

## Después: ejecutar con la identidad administrada

Al desplegar en Container Apps, vincula id-cloud-app-dev a la aplicación, configura AZURE_CLIENT_ID con su clientId y las variables de .env.example. Guarda DEMO_TOKEN como secreto de Container Apps, nunca como texto en el repo. En ese entorno el código exige ManagedIdentityCredential para Blob y Key Vault. Probar /estado y crear/recuperar un comprobante es necesario para verificar esos permisos. Mantener APP_MODE distinto de local; las rutas SQLite locales no se publican.

E/R vigente: docs/modelo-chen/modelo-chen-completo.svg. Infraestructura y conexiones no cambian por sí solas las entidades del dominio.
