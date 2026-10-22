import { AsyncLocalStorage } from "node:async_hooks";
export type Principal={id:string;name:string};
const context=new AsyncLocalStorage<Principal>();
export function authMode():"local"|"entra"|"google" {
 const mode=process.env.AUTH_MODE??"local";
 if(mode!=="local"&&mode!=="entra"&&mode!=="google")throw new Error("AUTH_MODE inválido");
 return mode;
}
export function withPrincipal<T>(principal:Principal,action:()=>T):T{return context.run(principal,action);}
export function currentPrincipal():Principal {
 const principal=context.getStore();if(principal)return principal;
 if(authMode()!=="local")throw new Error("Se requiere sesión autenticada");
 return {id:"usuario-local",name:"Emprendedor local"};
}
export function currentUserId(){return currentPrincipal().id;}

/** En cloud nunca habilitar usuario local ni almacenamiento efímero por accidente. */
export function workspaceEnabled(): boolean {
 if(process.env.APP_MODE === "local") return true;
 if(process.env.APP_MODE !== "cloud") return false;
 try {
  const base=new URL(process.env.AUTH_BASE_URL ?? "");
  return authMode() !== "local" && process.env.DATABASE_PROVIDER === "postgres"
   && !!process.env.DATABASE_URL_KEY_VAULT_SECRET && !!process.env.AZURE_KEY_VAULT_NAME
   && base.protocol === "https:" && !base.username && !base.password
   && base.pathname === "/" && !base.search && !base.hash
   && (authMode() !== "google" || !!process.env.GOOGLE_CLIENT_SECRET_KEY_VAULT_SECRET);
 } catch { return false; }
}
/** No confiar en Host/X-Forwarded-* para elegir el origen público permitido. */
export function workspaceOrigin(request: Request): string {
 if(!workspaceEnabled()) throw new Error("Aplicación no configurada");
 const host=request.headers.get("host") ?? "";
 if(process.env.APP_MODE === "cloud") {
  const base=new URL(process.env.AUTH_BASE_URL!);
  if(host !== base.host) throw new Error("Host no permitido");
  return base.origin;
 }
 const origin=new URL(`${new URL(request.url).protocol}//${host}`);
 if(!["localhost","127.0.0.1","[::1]"].includes(origin.hostname)) throw new Error("Host no permitido");
 return origin.origin;
}
