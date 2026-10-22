type Group = "business" | "auth";
type Event = "application_started" | "request_completed" | "request_error";
const methods = new Set(["GET", "POST", "PATCH", "DELETE", "HEAD", "OPTIONS"]);
const businessRoutes = new Set([
 "bootstrap", "businesses", "businesses/:id", "businesses/:id/profile-export", "businesses/:id/products",
 "businesses/:id/proposals", "businesses/:id/proposals/:id/confirm", "businesses/:id/proposals/:id/reject",
 "businesses/:id/receipts/:id", "businesses/:id/profile", "businesses/:id/diagnostics",
 "businesses/:id/actions/:id", "businesses/:id/learning/:id/complete", "businesses/:id/conversation",
 "businesses/:id/movements/:id/attachments", "businesses/:id/movements/:id/attachments/:id",
 "businesses/:id/movements/:id/attachments/:id/sync"
]);
export function release(){return /^[a-f0-9]{40}$/.test(process.env.APP_RELEASE ?? "") ? process.env.APP_RELEASE! : "unknown";}
export function routeName(path: string, group: Group): string {
 const pathname = path.split("?")[0];
 if(group === "auth") {
  const action = pathname.split("/")[3];
  return ["login", "callback", "logout", "session"].includes(action) ? "/api/auth/"+action : "/api/auth/other";
 }
 if(!pathname.startsWith("/api/local/")) return "/api/local/other";
 const pieces = pathname.slice(11).split("/");
 // Los identificadores nunca se copian al registro.
 const normalized = pieces.map((part,i)=>[1,3,5].includes(i)?":id":part).join("/");
 return businessRoutes.has(normalized) ? "/api/local/"+normalized : "/api/local/other";
}
function emit(event: Event, level: "info" | "warning" | "error", values: {route?:string;method?:string;status?:number;duration_ms?:number;request_id?:string} = {}) {
 if(process.env.OBSERVABILITY_ENABLED !== "1") return;
 // Campos cerrados: sin cuerpo, query, cookies, nombres, IP, tokens ni mensajes de excepción.
 const row={schema_version:1,service:"asistente-negocios",event,level,release:release(),...values};
 (level === "error" ? console.error : console.log)(JSON.stringify(row));
}
export function applicationStarted(){emit("application_started","info");}
export function requestError(method: string, path: string){
 const group:Group=path.startsWith("/api/auth/")?"auth":"business";
 emit("request_error","error",{route:path.startsWith("/api/")?routeName(path,group):"page",method:methods.has(method)?method:"OTHER",status:500});
}
export async function observeRequest(request: Request, action:()=>Promise<Response>, group:Group):Promise<Response>{
 if(process.env.OBSERVABILITY_ENABLED !== "1") return action();
 const begin=performance.now(), requestId=crypto.randomUUID();
 let status=500;
 try {
  const response=await action();status=response.status;
  response.headers.set("X-Request-ID",requestId);
  return response;
 } finally {
  emit("request_completed",status>=500?"error":status>=400?"warning":"info",{
   route:routeName(new URL(request.url).pathname,group),method:methods.has(request.method)?request.method:"OTHER",
   status,duration_ms:Math.max(0,Math.round(performance.now()-begin)),request_id:requestId
  });
 }
}
