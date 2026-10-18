import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";

export const PREFIX = "comprobantes-demo/";
const ID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
let client: ContainerClient | undefined;

/** Azure usa identidad administrada; en desarrollo, la sesión de Azure CLI. */
export function container(): ContainerClient {
  if (client) return client;
  const account = process.env.AZURE_STORAGE_ACCOUNT;
  const name = process.env.AZURE_STORAGE_CONTAINER;
  if (!account || !/^[a-z0-9]{3,24}$/.test(account) || !name) {
    throw new Error("Configura AZURE_STORAGE_ACCOUNT y AZURE_STORAGE_CONTAINER");
  }
  const credential = new DefaultAzureCredential({
    managedIdentityClientId: process.env.AZURE_CLIENT_ID,
  });
  client = new BlobServiceClient(`https://${account}.blob.core.windows.net`, credential)
    .getContainerClient(name);
  return client;
}

export function isValidId(id: string): boolean { return ID_RE.test(id); }
export function objectName(id: string): string { return `${PREFIX}${id}.json`; }

/** Devuelve solo código, nunca mensajes del SDK que puedan incluir datos sensibles. */
export function storageErrorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = String(error.code);
    if (/^[a-zA-Z0-9_]{1,80}$/.test(code)) return code;
  }
  return "StorageError";
}
