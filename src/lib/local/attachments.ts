import { createHash, randomUUID } from "node:crypto";
import { one, rows, run, transaction } from "./db";
import { business, LocalError } from "./service";
export const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;
export type Attachment = {
    id: string;
    filename: string;
    content_type: string;
    byte_size: number;
    sha256: string;
    created_at: string;
    cloud_status?: "pending" | "uploaded" | "failed" | null;
};
async function movement(businessId: string, movementId: string) {
    await business(businessId);
    if (!await one("SELECT 1 FROM movements WHERE business_id=? AND id=?", businessId, movementId))
        throw new LocalError("Movimiento no encontrado en este negocio.", 404);
}
export async function listAttachments(businessId: string, movementId: string) {
    await movement(businessId, movementId);
    return await rows<Attachment>("SELECT a.id,a.filename,a.content_type,a.byte_size,a.sha256,a.created_at,c.status AS cloud_status FROM movement_attachments a LEFT JOIN attachment_cloud c ON c.attachment_id=a.id WHERE a.business_id=? AND a.movement_id=? ORDER BY a.created_at,a.id", businessId, movementId);
}
export async function createAttachment(businessId: string, movementId: string, body: Record<string, unknown>) {
    await movement(businessId, movementId);
    const filename = body.filename, encoded = body.base64, declared = body.contentType;
    if (typeof filename !== "string" || !filename.trim() || filename.length > 150 || /[\\/\x00-\x1f\x7f]/.test(filename))
        throw new LocalError("Nombre de archivo inválido.", 422);
    if (typeof encoded !== "string" || !encoded.length || encoded.length > Math.ceil(MAX_ATTACHMENT_BYTES / 3) * 4)
        throw new LocalError("El archivo debe pesar entre 1 byte y 2 MiB.", 413);
    if (/[^A-Za-z0-9+/=]/.test(encoded))
        throw new LocalError("Archivo codificado inválido.", 422);
    const bytes = Buffer.from(encoded, "base64");
    if (!bytes.length || bytes.length > MAX_ATTACHMENT_BYTES)
        throw new LocalError("El archivo supera 2 MiB.", 413);
    if (bytes.toString("base64") !== encoded)
        throw new LocalError("Archivo codificado inválido.", 422);
    let mime: string | undefined;
    if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
        mime = "image/png";
    else if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
        mime = "image/jpeg";
    else if (bytes.length >= 8 && bytes.subarray(0, 5).toString("ascii") === "%PDF-")
        mime = "application/pdf";
    if (!mime || declared !== mime)
        throw new LocalError("Adjunta un PNG, JPG o PDF cuyo contenido coincida con el tipo de archivo.", 415);
    const ext = mime === "image/png" ? /\.png$/i : mime === "image/jpeg" ? /\.jpe?g$/i : /\.pdf$/i;
    if (!ext.test(filename))
        throw new LocalError("La extensión no corresponde al contenido del archivo.", 415);
    const digest = createHash("sha256").update(bytes).digest("hex");
    return await transaction(async () => {
        const count = (await one<{
            count: number;
        }>("SELECT COUNT(*) AS count FROM movement_attachments WHERE business_id=? AND movement_id=?", businessId, movementId))!.count;
        if (count >= 5)
            throw new LocalError("Puedes adjuntar hasta 5 archivos por movimiento.", 409);
        const used = (await one<{
            total: number;
        }>("SELECT COALESCE(SUM(byte_size),0) AS total FROM movement_attachments WHERE business_id=?", businessId))!.total;
        if (used + bytes.length > 25 * 1024 * 1024)
            throw new LocalError("Este negocio alcanzó el límite de 25 MiB de adjuntos.", 409);
        if (await one("SELECT 1 FROM movement_attachments WHERE business_id=? AND movement_id=? AND sha256=?", businessId, movementId, digest))
            throw new LocalError("Ese archivo ya está adjunto a este movimiento.", 409);
        const id = randomUUID();
        await run("INSERT INTO movement_attachments VALUES (?,?,?,?,?,?,?,?,?)", id, businessId, movementId, filename.trim(), mime!, bytes.length, digest, encoded, new Date().toISOString());
        return { id };
    });
}
export async function readAttachment(businessId: string, movementId: string, id: string) {
    await movement(businessId, movementId);
    const item = await one<Attachment & {
        content_base64: string;
    }>("SELECT id,filename,content_type,byte_size,sha256,created_at,content_base64 FROM movement_attachments WHERE business_id=? AND movement_id=? AND id=?", businessId, movementId, id);
    if (!item)
        throw new LocalError("Archivo no encontrado.", 404);
    return item;
}
export async function deleteAttachment(businessId: string, movementId: string, id: string) {
    await movement(businessId, movementId);
    const result = await run("DELETE FROM movement_attachments WHERE business_id=? AND movement_id=? AND id=?", businessId, movementId, id);
    if (!result.changes)
        throw new LocalError("Archivo no encontrado.", 404);
    return { ok: true };
}
