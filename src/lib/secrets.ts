import { azureCredential } from "./azure-credential";
import { secretReader } from "./keyvault";
let reader: ReturnType<typeof secretReader> | undefined;
/** Una referencia configurada exige Key Vault: no retrocede al secreto de entorno. */
export async function runtimeSecret(name: "DATABASE_URL" | "GOOGLE_CLIENT_SECRET"): Promise<string> {
  const reference = process.env[name + "_KEY_VAULT_SECRET"];
  if (!reference) {
    const value = process.env[name];
    if (!value) throw new Error("Falta credencial de aplicación");
    return value;
  }
  const vault = process.env.AZURE_KEY_VAULT_NAME;
  if (!vault) throw new Error("Falta el almacén de credenciales");
  reader ??= secretReader(azureCredential());
  return reader(vault, reference);
}
