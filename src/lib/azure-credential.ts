import { DefaultAzureCredential, ManagedIdentityCredential } from "@azure/identity";
let credential: DefaultAzureCredential | ManagedIdentityCredential | undefined;
/** En Container Apps se exige identidad administrada; en local se usa la sesión CLI. */
export function azureCredential() {
  if (!credential) credential = process.env.CONTAINER_APP_NAME
    ? (process.env.AZURE_CLIENT_ID ? new ManagedIdentityCredential({ clientId: process.env.AZURE_CLIENT_ID }) : new ManagedIdentityCredential())
    : new DefaultAzureCredential({ managedIdentityClientId: process.env.AZURE_CLIENT_ID });
  return credential;
}
