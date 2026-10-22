type Credential = { getToken(scope: string): Promise<{ token: string } | null> };
/** Lee un secreto real, valida su presencia y descarta el valor sin exponerlo. */
export async function checkKeyVault(credential: Credential, request: typeof fetch = fetch) {
  const name = process.env.AZURE_KEY_VAULT_NAME;
  const secret = process.env.AZURE_KEY_VAULT_PROBE_SECRET ?? "prueba-conexion";
  if (!name || !/^[a-zA-Z][a-zA-Z0-9-]{1,22}[a-zA-Z0-9]$/.test(name) || !/^[a-zA-Z0-9-]{1,127}$/.test(secret)) {
    return { ok: false, configurado: false, codigo: "ConfigurationMissing" };
  }
  try {
    const access = await credential.getToken("https://vault.azure.net/.default");
    if (!access) throw new Error("MissingToken");
    const response = await request(`https://${name}.vault.azure.net/secrets/${secret}?api-version=2025-07-01`, {
      headers: { Authorization: `Bearer ${access.token}` },
      signal: AbortSignal.timeout(10000), cache: "no-store", redirect: "error",
    });
    if (!response.ok) return { ok: false, configurado: true, codigo: `HTTP_${response.status}` };
    const body = await response.json();
    const ok = typeof body.value === "string" && body.value.length > 0;
    return { ok, configurado: true, codigo: ok ? "SecretRead" : "EmptySecret" };
  } catch {
    return { ok: false, configurado: true, codigo: "KeyVaultUnavailable" };
  }
}

/** Caché privada por proceso; una lectura concurrente por secreto, sin valores en errores. */
export function secretReader(credential: Credential, request: typeof fetch = fetch) {
  const cache = new Map<string, { expires: number; value: Promise<string> }>();
  return async (vault: string, secret: string): Promise<string> => {
    if (!/^[a-zA-Z][a-zA-Z0-9-]{1,22}[a-zA-Z0-9]$/.test(vault) || !/^[a-zA-Z0-9-]{1,127}$/.test(secret)) throw new Error("Referencia Key Vault inválida");
    const key = vault + "/" + secret, previous = cache.get(key);
    if (previous && previous.expires > Date.now()) return previous.value;
    const value = (async () => {
      try {
        const access = await credential.getToken("https://vault.azure.net/.default");
        if (!access) throw new Error();
        const response = await request(`https://${vault}.vault.azure.net/secrets/${secret}?api-version=2025-07-01`, {
          headers: { Authorization: `Bearer ${access.token}` },
          signal: AbortSignal.timeout(10000), cache: "no-store", redirect: "error",
        });
        if (!response.ok) throw new Error();
        const body = await response.json();
        if (typeof body.value !== "string" || !body.value.length || body.attributes?.enabled === false) throw new Error();
        return body.value as string;
      } catch { throw new Error("No se pudo obtener la credencial desde Key Vault"); }
    })();
    cache.set(key, { expires: Date.now() + 8 * 60 * 60 * 1000, value });
    try { return await value; } catch (error) { if (cache.get(key)?.value === value) cache.delete(key); throw error; }
  };
}
