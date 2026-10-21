import { createHash,randomBytes } from "node:crypto";
import { one,run,transaction } from "./db";
import { authMode,type Principal } from "./identity";
export const SESSION_COOKIE="cloud_session",FLOW_COOKIE="cloud_login";
export const SESSION_SECONDS=8*60*60;
const guid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const tokenPattern=/^[A-Za-z0-9_-]{43}$/;
export const digest=(value:string)=>createHash("sha256").update(value).digest("hex");
export const randomToken=()=>randomBytes(32).toString("base64url");
export function cookieValue(raw:string|null,name:string){return raw?.split(";").map(v=>v.trim()).find(v=>v.startsWith(name+"="))?.slice(name.length+1);}
export function sessionPrincipal(token:string|undefined):Principal|null {
 if(!token||!tokenPattern.test(token))return null;
 const user=one<Principal>("SELECT u.id,u.name FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?",digest(token),Date.now())??null;
 if(user&&authMode()!=="local"&&!user.id.startsWith(authMode()+":"))return null;
 return user;
}
export function revokeSession(token:string|undefined){if(token&&tokenPattern.test(token))run("DELETE FROM auth_sessions WHERE token_hash=?",digest(token));}
export function createFlow(verifier:string,nonce:string){
 const state=randomToken(),browser=randomToken(),now=Date.now();
 run("DELETE FROM auth_flows WHERE expires_at<=?",now);
 run("INSERT INTO auth_flows VALUES (?,?,?,?,?)",digest(state),digest(browser),verifier,nonce,now+10*60*1000);
 return {state,browser};
}
export function consumeFlow(state:string|null,browser:string|undefined){
 if(!state||!browser||!tokenPattern.test(state)||!tokenPattern.test(browser))return null;
 return transaction(()=>{
  const row=one<{verifier:string;nonce:string}>("SELECT verifier,nonce FROM auth_flows WHERE state_hash=? AND browser_hash=? AND expires_at>?",digest(state),digest(browser),Date.now());
  if(row)run("DELETE FROM auth_flows WHERE state_hash=?",digest(state));
  return row??null;
 });
}
/** Solo llamar tras verificar el ID token OIDC. Nunca se vincula por email ni por primer visitante. */
export function provisionPrincipal(claims:{oid?:unknown;tid?:unknown;name?:unknown;sub?:unknown;iss?:unknown}){
 const tenant=process.env.AUTH_TENANT_ID?.toLowerCase(),oid=String(claims.oid??"").toLowerCase(),tid=String(claims.tid??"").toLowerCase();
 const google=authMode()==="google";
 if(google){if(claims.iss!=="https://accounts.google.com"||typeof claims.sub!=="string"||!/^[A-Za-z0-9_-]{1,255}$/.test(claims.sub))throw new Error("Identidad Google no permitida");}
 else if(!tenant||!guid.test(tenant)||!guid.test(oid)||tid!==tenant||typeof claims.sub!=="string"||!claims.sub)throw new Error("Identidad no permitida");
 const principal={id:google?`google:${claims.sub}`:`entra:${tid}:${oid}`,name:typeof claims.name==="string"?claims.name.slice(0,150):google?"Usuario de Google":"Usuario de Microsoft"};
 const owner=google?!!process.env.AUTH_LEGACY_GOOGLE_SUB&&claims.sub===process.env.AUTH_LEGACY_GOOGLE_SUB:oid===process.env.AUTH_LEGACY_OWNER_OBJECT_ID?.toLowerCase();
 transaction(()=>{
  run("INSERT INTO users VALUES (?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name",principal.id,principal.name);
  if(owner){
   const existing=one<{owner_user:string}>("SELECT owner_user FROM legacy_claims WHERE legacy_user='usuario-local'");
   if(existing&&existing.owner_user!==principal.id)throw new Error("El propietario anterior ya fue vinculado");
   if(!existing){
    run("INSERT INTO memberships SELECT business_id,?,role,active FROM memberships WHERE user_id='usuario-local'",principal.id);
    run("INSERT OR IGNORE INTO entrepreneur_profiles SELECT ?,archetype_id,updated_at FROM entrepreneur_profiles WHERE user_id='usuario-local'",principal.id);
    run("INSERT OR IGNORE INTO learning_progress SELECT ?,lesson_id,completed_at FROM learning_progress WHERE user_id='usuario-local'",principal.id);
    run("UPDATE archetype_evaluations SET user_id=? WHERE user_id='usuario-local'",principal.id);
    run("UPDATE conversations SET user_id=? WHERE user_id='usuario-local'",principal.id);
    run("INSERT INTO legacy_claims VALUES ('usuario-local',?,?)",principal.id,new Date().toISOString());
   }
  }
 });
 return principal;
}
export function createSession(principal:Principal){
 const token=randomToken();run("DELETE FROM auth_sessions WHERE expires_at<=?",Date.now());
 run("INSERT INTO auth_sessions VALUES (?,?,?)",digest(token),principal.id,Date.now()+SESSION_SECONDS*1000);
 return token;
}
