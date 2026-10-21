import { createHash } from "node:crypto";
import { BlobServiceClient } from "@azure/storage-blob";
import { azureCredential } from "../azure-credential";
import { one, run } from "./db";
import { readAttachment, deleteAttachment } from "./attachments";
import { LocalError } from "./service";
type Cloud = {
    account: string;
    container: string;
    object_name: string;
    status: string;
};
const locks = new Map<string, Promise<unknown>>();
async function exclusive<T>(id: string, action: () => Promise<T>): Promise<T> {
    const previous = locks.get(id) ?? Promise.resolve();
    const current = previous.catch(() => { }).then(action);
    locks.set(id, current);
    try {
        return await current;
    }
    finally {
        if (locks.get(id) === current)
            locks.delete(id);
    }
}
export function cloudEnabled() { return process.env.ATTACHMENT_STORAGE === "azure"; }
async function location(id: string) { return await one<Cloud>("SELECT account,container,object_name,status FROM attachment_cloud WHERE attachment_id=?", id); }
function blob(target: Cloud) {
    return new BlobServiceClient(`https://${target.account}.blob.core.windows.net`, azureCredential(), { retryOptions: { maxTries: 1, tryTimeoutInMs: 20000 } }).getContainerClient(target.container).getBlockBlobClient(target.object_name);
}
/** No jobs ni consultas periódicas: solo se contacta Azure por una acción del usuario. */
export async function syncAttachment(businessId: string, movementId: string, id: string) {
    return exclusive(id, async () => {
        const item = await readAttachment(businessId, movementId, id);
        if (!cloudEnabled())
            throw new LocalError("El respaldo Azure no está activado en este equipo.", 409);
        let target = await location(id);
        if (target?.status === "uploaded")
            return { id, cloud_status: "uploaded" };
        if (!target) {
            const account = process.env.AZURE_STORAGE_ACCOUNT ?? "", container = process.env.AZURE_STORAGE_CONTAINER ?? "";
            if (!/^[a-z0-9]{3,24}$/.test(account) || !/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/.test(container))
                throw new LocalError("Configura la cuenta y el contenedor de Azure antes de respaldar.", 503);
            target = { account, container, object_name: `operaciones/${businessId}/${movementId}/${id}`, status: "pending" };
            await run("INSERT INTO attachment_cloud VALUES (?,?,?,?,?,?)", id, account, container, target.object_name, "pending", new Date().toISOString());
        }
        await run("UPDATE attachment_cloud SET status='pending',updated_at=? WHERE attachment_id=?", new Date().toISOString(), id);
        try {
            // Nombre estable y bytes inmutables: un reintento no genera otro objeto.
            await blob(target).uploadData(Buffer.from(item.content_base64, "base64"), { blobHTTPHeaders: { blobContentType: item.content_type, blobContentDisposition: "attachment" }, metadata: { sha256: item.sha256 }, abortSignal: AbortSignal.timeout(25000) });
            await run("UPDATE attachment_cloud SET status='uploaded',updated_at=? WHERE attachment_id=?", new Date().toISOString(), id);
            return { id, cloud_status: "uploaded" };
        }
        catch {
            await run("UPDATE attachment_cloud SET status='failed',updated_at=? WHERE attachment_id=?", new Date().toISOString(), id);
            return { id, cloud_status: "failed" };
        }
    });
}
export async function attachmentBytes(businessId: string, movementId: string, id: string) {
    const item = await readAttachment(businessId, movementId, id), target = await location(id);
    if (target?.status !== "uploaded")
        return { item, bytes: Buffer.from(item.content_base64, "base64"), source: "local" };
    try {
        const bytes = await blob(target).downloadToBuffer(0, item.byte_size, { abortSignal: AbortSignal.timeout(25000), maxRetryRequestsPerBlock: 0 });
        if (bytes.length !== item.byte_size || createHash("sha256").update(bytes).digest("hex") !== item.sha256)
            throw new Error("Integridad");
        return { item, bytes, source: "azure" };
    }
    catch {
        throw new LocalError("No pudimos descargar el respaldo de Azure. El comprobante registrado se conserva; vuelve a intentar.", 503);
    }
}
export async function removeAttachment(businessId: string, movementId: string, id: string) {
    return exclusive(id, async () => {
        await readAttachment(businessId, movementId, id);
        const target = await location(id);
        if (target) {
            try {
                await blob(target).deleteIfExists({ deleteSnapshots: "include", abortSignal: AbortSignal.timeout(25000) });
            }
            catch {
                throw new LocalError("No pudimos quitar el respaldo de Azure. El archivo se conserva; vuelve a intentar.", 503);
            }
        }
        return await deleteAttachment(businessId, movementId, id);
    });
}
