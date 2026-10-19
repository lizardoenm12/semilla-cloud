import assert from "node:assert/strict";
import { readFile, mkdir, writeFile, rm } from "node:fs/promises";
import ts from "typescript";
import { pathToFileURL } from "node:url";
await mkdir("tmp", { recursive: true });
const target = `tmp/keyvault-test-${process.pid}.mjs`;
const source = await readFile("src/lib/keyvault.ts", "utf8");
await writeFile(target, ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText);
const oldName = process.env.AZURE_KEY_VAULT_NAME;
const oldSecret = process.env.AZURE_KEY_VAULT_PROBE_SECRET;
try {
 const { checkKeyVault } = await import(pathToFileURL(`${process.cwd()}/${target}`));
 const credential = { async getToken(scope) { assert.equal(scope, "https://vault.azure.net/.default"); return { token: "mock-token" }; } };
 delete process.env.AZURE_KEY_VAULT_NAME;
 assert.equal((await checkKeyVault(credential)).configurado, false);
 process.env.AZURE_KEY_VAULT_NAME = "https://evil.invalid";
 assert.equal((await checkKeyVault(credential)).configurado, false);
 process.env.AZURE_KEY_VAULT_NAME = "kv-cloud-lizardo-dev";
 process.env.AZURE_KEY_VAULT_PROBE_SECRET = "../invalid";
 assert.equal((await checkKeyVault(credential)).configurado, false);
 process.env.AZURE_KEY_VAULT_PROBE_SECRET = "prueba-conexion";
 const success = await checkKeyVault(credential, async (url, options) => {
  assert.equal(url, "https://kv-cloud-lizardo-dev.vault.azure.net/secrets/prueba-conexion?api-version=2025-07-01");
  assert.equal(options.headers.Authorization, "Bearer mock-token");
  assert.equal(options.redirect, "error");
  return Response.json({ value: "mock-secret-do-not-expose" });
 });
 assert.equal(success.ok, true);
 assert(!JSON.stringify(success).includes("mock-secret-do-not-expose"));
 for (const status of [401, 403, 404, 429, 500]) {
  const result = await checkKeyVault(credential, async () => new Response(null, { status }));
  assert.equal(result.ok, false); assert.equal(result.codigo, `HTTP_${status}`);
 }
 assert.equal((await checkKeyVault(credential, async () => Response.json({ value: "" }))).ok, false);
 assert.equal((await checkKeyVault(credential, async () => { throw Error("mock-secret-do-not-expose"); })).codigo, "KeyVaultUnavailable");
 assert.equal((await checkKeyVault({ async getToken() { return null; } })).ok, false);
 console.log("Pruebas de Key Vault aprobadas: configuración, autenticación, errores y no exposición del secreto. Simuladas, sin Azure.");
} finally {
 if(oldName === undefined) delete process.env.AZURE_KEY_VAULT_NAME; else process.env.AZURE_KEY_VAULT_NAME = oldName;
 if(oldSecret === undefined) delete process.env.AZURE_KEY_VAULT_PROBE_SECRET; else process.env.AZURE_KEY_VAULT_PROBE_SECRET = oldSecret;
 await rm(target, { force: true });
}
