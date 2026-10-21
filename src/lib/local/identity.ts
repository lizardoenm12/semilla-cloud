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
