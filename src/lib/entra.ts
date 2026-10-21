import * as oidc from "openid-client";
export function entraSettings(){
 const tenant=process.env.AUTH_TENANT_ID??"",clientId=process.env.AUTH_CLIENT_ID??"",secret=process.env.AUTH_CLIENT_SECRET??"";
 const guid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 const base=new URL(process.env.AUTH_BASE_URL??"http://localhost:3010");
 if(!guid.test(tenant)||!guid.test(clientId)||!secret||base.username||base.password||base.pathname!=="/"||base.search||base.hash||!(base.protocol==="https:"||(base.protocol==="http:"&&base.hostname==="localhost")))throw new Error("Configuración Entra incompleta o insegura");
 return {tenant,clientId,secret,base:base.origin,callback:base.origin+"/api/auth/callback",secure:base.protocol==="https:"};
}
let configuration:Promise<oidc.Configuration>|undefined;
export async function entraConfiguration(){
 const settings=entraSettings();
 configuration??=oidc.discovery(new URL(`https://login.microsoftonline.com/${settings.tenant}/v2.0`),settings.clientId,settings.secret,undefined,{timeout:15,execute:[oidc.enableNonRepudiationChecks]}).catch(error=>{configuration=undefined;throw error;});
 return configuration;
}
export { oidc };
