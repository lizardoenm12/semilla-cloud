import { randomUUID } from "crypto";
import { isAuthorized } from "@/lib/auth";
import { container, isValidId, objectName, PREFIX, storageErrorCode } from "@/lib/storage";

export const dynamic = "force-dynamic";

const unauthorized = () => Response.json({ error: "No autorizado" }, { status: 401 });

/** POST: crea un comprobante sintético en Azure Blob Storage y lo relee desde el contenedor. */
export async function POST(req: Request) {
  if (!isAuthorized(req)) return unauthorized();
  try {
    const id = randomUUID();
    const name = objectName(id);
    const comprobante = {
      id,
      etiqueta: "Datos de demostración",
      descripcion: "Venta de 10 aguas a Q5 (comprobante sintético)",
      total_gtq: 50,
      creado: new Date().toISOString(),
    };
    const file = container().getBlockBlobClient(name);
    await file.uploadData(Buffer.from(JSON.stringify(comprobante)), {
      blobHTTPHeaders: { blobContentType: "application/json" },
      conditions: { ifNoneMatch: "*" },
    });
    const contenido = await file.downloadToBuffer(); // lectura real desde Azure
    console.log(JSON.stringify({ severity: "INFO", message: "comprobante creado", objeto: name }));
    return Response.json({ ok: true, objeto: name, comprobante: JSON.parse(contenido.toString()) }, { status: 201 });
  } catch (err) {
    console.error(JSON.stringify({ severity: "ERROR", message: "fallo al crear comprobante", codigo: storageErrorCode(err) }));
    return Response.json({ ok: false, error: "No se pudo escribir en Azure Blob Storage" }, { status: 500 });
  }
}

/**
 * GET sin parámetros: lista los comprobantes del contenedor (hasta 20 de una muestra de 100 objetos).
 * GET ?id=<uuid>: recupera un comprobante a través del backend.
 */
export async function GET(req: Request) {
  if (!isAuthorized(req)) return unauthorized();
  const parametro = new URL(req.url).searchParams.get("id");
  if (parametro === null) return listar();
  const id = parametro;
  if (!isValidId(id)) return Response.json({ error: "Identificador inválido" }, { status: 400 });
  try {
    const file = container().getBlobClient(objectName(id));
    const existe = await file.exists();
    if (!existe) return Response.json({ error: "No encontrado" }, { status: 404 });
    const contenido = await file.downloadToBuffer();
    return Response.json({ ok: true, objeto: objectName(id), comprobante: JSON.parse(contenido.toString()) });
  } catch (err) {
    console.error(JSON.stringify({ severity: "ERROR", message: "fallo al leer comprobante", codigo: storageErrorCode(err) }));
    return Response.json({ ok: false, error: "No se pudo leer de Azure Blob Storage" }, { status: 500 });
  }
}

// Límite de la demo: se leen hasta 100 objetos y se muestran los 20 más recientes.
async function listar() {
  try {
    const items = [];
    let scanned = 0;
    for await (const blob of container().listBlobsFlat({ prefix: PREFIX })) {
      if (blob.name.endsWith(".json")) {
        const id = blob.name.slice(PREFIX.length, -".json".length);
        if (isValidId(id)) items.push({
          id,
          objeto: blob.name,
          creado: blob.properties.createdOn?.toISOString() ?? "",
          bytes: blob.properties.contentLength ?? 0,
        });
      }
      if (++scanned >= 100) break;
    }
    items.sort((a, b) => b.creado.localeCompare(a.creado));
    items.splice(20);
    return Response.json({ ok: true, items });
  } catch (err) {
    console.error(JSON.stringify({ severity: "ERROR", message: "fallo al listar comprobantes", codigo: storageErrorCode(err) }));
    return Response.json({ ok: false, error: "No se pudo listar Azure Blob Storage" }, { status: 500 });
  }
}
