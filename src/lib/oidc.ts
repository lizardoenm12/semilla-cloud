import { entraSettings,entraConfiguration,oidc } from "./entra";
import { authMode } from "./local/identity";
export function loginSettings(){
 if(authMode()==="entra")return {...entraSettings(),provider:"entra" as const,label:"Microsoft"};
 if(authMode()!=="google")throw new Error("Inicio de sesión externo desactivado");
 const clientId=process.env.GOOGLE_CLIENT_ID??"",secret=process.env.GOOGLE_CLIENT_SECRET??"";
 const base=new URL(process.env.AUTH_BASE_URL??"http://localhost:3010");
 if(!/^\d+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(clientId)||secret.length<16||base.username||base.password||base.pathname!=="/"||base.search||base.hash||!(base.protocol==="https:"||(base.protocol==="http:"&&base.hostname==="localhost")))throw new Error("Configuración Google incompleta o insegura");
 return {clientId,secret,base:base.origin,callback:base.origin+"/api/auth/callback",secure:base.protocol==="https:",provider:"google" as const,label:"Google"};
}
let googleConfiguration:Promise<oidc.Configuration>|undefined;
export async function loginConfiguration(){
 const settings=loginSettings();if(settings.provider==="entra")return entraConfiguration();
 googleConfiguration??=oidc.discovery(new URL("https://accounts.google.com"),settings.clientId,settings.secret,undefined,{timeout:15,execute:[oidc.enableNonRepudiationChecks]}).catch(error=>{googleConfiguration=undefined;throw error;});
 return googleConfiguration;
}
export { oidc };
