# Trabajo de Lizardo y Jessel

Repositorio privado: https://github.com/lizardoenm12/semilla-cloud. El propietario invita a la otra integrante como colaboradora usando su usuario GitHub; cada uno inicia sesión con su propia cuenta.

## Primer uso

Clonar la URL real, instalar Node.js 24 LTS y ejecutar desde la carpeta del repositorio:

```powershell
npm.cmd ci
npm.cmd run dev:local
```

Abrir http://127.0.0.1:3000. Cada persona tiene una base SQLite local independiente con la misma semilla. Git comparte código y documentación; no sincroniza datos de la aplicación ni publica una web ejecutable.

## Cada avance

1. Actualizar la rama principal con los últimos cambios. Si hay trabajo sin guardar, conservarlo antes de cambiar de rama.
2. Crear una rama por cambio, por ejemplo `codex/perfil-productivo` o `codex/integracion-postgresql`.
3. Implementar una parte concreta y actualizar su documentación y estado real.
4. Ejecutar `npm run typecheck`, `npm run build`, `npm run test:workspace` y `npm run test:local` cuando corresponda al cambio.
5. Publicar la rama y abrir un pull request. Explicar comportamiento, pruebas y pendientes. La otra persona revisa e integra el cambio.

## Fronteras para integrar Azure

- `src/lib/local/contracts.ts`: tipos compartidos de la versión local.
- `src/lib/local/db.ts`: SQLite y semilla; sustituir mediante migraciones y una capa de persistencia PostgreSQL, no pegando este DDL directamente al servidor.
- `src/lib/local/service.ts`: reglas que deben conservarse: confirmación única, transacción, stock y referencias del mismo negocio. Habrá que adaptar sus consultas a PostgreSQL y hacerlas asíncronas según el driver elegido.
- `src/lib/local/parser.ts`: analizador de demostración; el futuro proveedor IA debe devolver datos revisables y nunca escribir movimientos por su cuenta.
- `src/app/api/local/`: solo desarrollo de un usuario local. No basta quitar la validación de loopback para publicar el producto; las rutas compartidas deben verificar identidad y membresía reales.
- `src/lib/storage.ts`: adaptador Blob Storage de la demo anterior, ya separado del flujo SQLite.
- `azure-pipelines.yml`: CI preparado. El despliegue se añadirá después de implementar y comprobar la configuración compartida.

Mantener el ejemplo de venta y gasto de una misma frase: una propuesta puede generar varios movimientos y se confirma una sola vez. Los fallos deben revertir todo el lote.

## Archivos que se comparten

Compartir código, lockfile, SVG Chen, DDL, guías y evidencias depuradas. Los `.env` reales, bases SQLite, tokens, claves, `node_modules`, `.next` y cachés están excluidos. El token sintético del test anterior es una constante de pruebas, no una credencial de Azure.

El acceso de Jessel al repositorio se configura en GitHub. Su acceso a Azure DevOps y Azure se otorga por separado según lo que vaya a realizar. No hay que compartir contraseñas ni pegar secretos en issues o pull requests.
