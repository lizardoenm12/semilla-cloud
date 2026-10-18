import { bootstrap,business,snapshot,createBusiness,createProduct,createProposal,confirmProposal,rejectProposal,saveProfile,diagnose,updateAction,completeLesson,converse,updateBusiness,LocalError } from "@/lib/local/service";
import { one } from "@/lib/local/db";
export const runtime="nodejs";
export const dynamic="force-dynamic";
type Context={params:Promise<{path:string[]}>};
async function handle(request:Request,context:Context){
 const headers={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
 if(process.env.APP_MODE!=="local")return Response.json({error:"Modo local deshabilitado"},{status:404,headers});
 try{
  const url=new URL(request.url);
  const host=request.headers.get("host")??"";
  const localOrigin=new URL(`${url.protocol}//${host}`);
  if(!["localhost","127.0.0.1","[::1]"].includes(localOrigin.hostname))throw new LocalError("La versión local solo admite acceso desde este equipo.",403);
  const method=request.method,path=(await context.params).path;
  let body:Record<string,unknown>={};
  if(method!=="GET"){
   if(request.headers.get("origin")!==localOrigin.origin)throw new LocalError("Origen de solicitud no permitido.",403);
   if(!request.headers.get("content-type")?.startsWith("application/json"))throw new LocalError("Envía contenido JSON.",415);
   if(Number(request.headers.get("content-length")??0)>20000)throw new LocalError("Solicitud demasiado grande.",413);
   const raw=await request.text();if(Buffer.byteLength(raw)>20000)throw new LocalError("Solicitud demasiado grande.",413);
   try{const parsed=JSON.parse(raw);if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))throw new Error();body=parsed;}catch{throw new LocalError("JSON inválido.",400);}
  }
  let result:unknown;
  if(method==="GET"&&path.length===1&&path[0]==="bootstrap")result=bootstrap();
  else if(method==="POST"&&path.length===1&&path[0]==="businesses")result=createBusiness(body);
  else if(path[0]==="businesses"&&path[1]){
   const id=path[1];business(id);
   if(method==="GET"&&path.length===2)result=snapshot(id);
   else if(method==="PATCH"&&path.length===2)result=updateBusiness(id,body);
   else if(method==="GET"&&path[2]==="profile-export"&&path.length===3){const s=snapshot(id);return Response.json({version:1,exportedAt:new Date().toISOString(),mode:"local",user:bootstrap().user,...s},{headers:{...headers,"Content-Disposition":'attachment; filename="perfil-productivo.json"'}});}
   else if(method==="GET"&&path[2]==="receipts"&&path[3]&&path.length===4){const receipt=one<{payload:string}>("SELECT payload FROM receipts WHERE business_id=? AND id=?",id,path[3]);if(!receipt)throw new LocalError("Comprobante no encontrado.",404);result=JSON.parse(receipt.payload);}
   else if(method==="POST"&&path.length===3&&path[2]==="products")result=createProduct(id,body);
   else if(method==="POST"&&path.length===3&&path[2]==="proposals")result=createProposal(id,body);
   else if(method==="POST"&&path.length===5&&path[2]==="proposals"&&path[4]==="confirm")result=confirmProposal(id,path[3],body.items);
   else if(method==="POST"&&path.length===5&&path[2]==="proposals"&&path[4]==="reject")result=rejectProposal(id,path[3]);
   else if(method==="POST"&&path.length===3&&path[2]==="profile")result=saveProfile(id,body);
   else if(method==="POST"&&path.length===3&&path[2]==="diagnostics")result=diagnose(id,body);
   else if(method==="PATCH"&&path.length===4&&path[2]==="actions")result=updateAction(id,path[3],body);
   else if(method==="POST"&&path.length===5&&path[2]==="learning"&&path[4]==="complete")result=completeLesson(id,path[3]);
   else if(method==="POST"&&path.length===3&&path[2]==="conversation")result=converse(id,body);
   else throw new LocalError("Ruta no encontrada.",404);
  }else throw new LocalError("Ruta no encontrada.",404);
  return Response.json(result,{status:method==="POST"?201:200,headers});
 }catch(error){if(error instanceof LocalError)return Response.json({error:error.message},{status:error.status,headers});console.error("local_api_error",error instanceof Error?error.name:"Error");return Response.json({error:"No se pudo completar la operación local."},{status:500,headers});}
}
export const GET=handle;export const POST=handle;export const PATCH=handle;
