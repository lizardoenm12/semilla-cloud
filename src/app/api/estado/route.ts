import { databaseProvider,one } from "@/lib/local/db";
import { isAuthorized } from "@/lib/auth";
import { container, PREFIX, storageErrorCode } from "@/lib/storage";

import { azureCredential } from "@/lib/azure-credential";
import { checkKeyVault } from "@/lib/keyvault";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isAuthorized(req)) return Response.json({ error: "No autorizado" }, { status: 401 });
  let storageOk = false;
  try {
    // Una página vacía también prueba acceso; no descarga los comprobantes.
    await container().listBlobsFlat({ prefix: PREFIX }).byPage({ maxPageSize: 1 }).next();
    storageOk = true;
  } catch (err) {
    console.error(JSON.stringify({ severity: "WARNING", message: "estado: almacenamiento inaccesible", codigo: storageErrorCode(err) }));
  }
  const keyVault = await checkKeyVault(azureCredential());
  const database={configurado:databaseProvider()==="postgres",ok:false};
  if(database.configurado){try{database.ok=(await one<{ok:number}>("SELECT 1 AS ok"))?.ok===1;}catch{}}
  return Response.json({
    keyVault,database,
    identity: { modo: process.env.CONTAINER_APP_NAME ? "managed-identity" : "developer-session", accesoVerificado: storageOk || keyVault.ok },
    compute: {
      entornoDetectado: Boolean(process.env.CONTAINER_APP_NAME),
      servicio: process.env.CONTAINER_APP_NAME ?? null,
      revision: process.env.CONTAINER_APP_REVISION ?? null,
    },
    storage: {
      ok: storageOk,
      account: process.env.AZURE_STORAGE_ACCOUNT ?? null,
      container: process.env.AZURE_STORAGE_CONTAINER ?? null,
      prueba: "listado; escritura y lectura requieren crear y recuperar un comprobante",
    },
    consultado: new Date().toISOString(),
  }, { headers: { "Cache-Control": "no-store" } });
}
