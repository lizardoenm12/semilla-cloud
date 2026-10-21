import { authMode,withPrincipal } from "@/lib/local/identity";
import { SESSION_COOKIE,cookieValue,sessionPrincipal } from "@/lib/local/auth-store";
import { cloudEnabled,syncAttachment,attachmentBytes,removeAttachment } from "@/lib/local/attachment-cloud";
import { listAttachments,createAttachment } from "@/lib/local/attachments";
import { bootstrap,business,snapshot,createBusiness,createProduct,createProposal,confirmProposal,rejectProposal,saveProfile,diagnose,updateAction,completeLesson,converse,updateBusiness,LocalError } from "@/lib/local/service";
import { one } from "@/lib/local/db";
export const runtime="nodejs";
export const dynamic="force-dynamic";
type Context={params:Promise<{path:string[]}>};
async function dispatch(request:Request,context:Context){
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
   const upload=method==="POST"&&path.length===5&&path[0]==="businesses"&&path[2]==="movements"&&path[4]==="attachments";
   const limit=upload?3*1024*1024:20000;
   if(Number(request.headers.get("content-length")??0)>limit)throw new LocalError("Solicitud demasiado grande.",413);
   const reader=request.body?.getReader();const chunks:Uint8Array[]=[];let size=0;
   if(reader){while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>limit){await reader.cancel();throw new LocalError("Solicitud demasiado grande.",413);}chunks.push(part.value);}}
   const raw=Buffer.concat(chunks).toString("utf8");
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
   else if(path[2]==="movements"&&path[3]&&path[4]==="attachments"){
    const movementId=path[3];
    if(method==="GET"&&path.length===5)result={items:listAttachments(id,movementId),cloudEnabled:cloudEnabled()};
    else if(method==="POST"&&path.length===5){const made=createAttachment(id,movementId,body); if(cloudEnabled()){try{result=await syncAttachment(id,movementId,made.id);}catch{result={...made,cloud_status:"failed"};}}else result=made;}
    else if(method==="DELETE"&&path.length===6)result=await removeAttachment(id,movementId,path[5]);
    else if(method==="POST"&&path.length===7&&path[6]==="sync")result=await syncAttachment(id,movementId,path[5]);
    else if(method==="GET"&&path.length===6){
     const downloaded=await attachmentBytes(id,movementId,path[5]);
     const item=downloaded.item,bytes=Uint8Array.from(downloaded.bytes);
     return new Response(bytes,{headers:{...headers,"X-Attachment-Source":downloaded.source,"Content-Type":item.content_type,"Content-Length":String(bytes.length),"Content-Security-Policy":"sandbox; default-src 'none'","Content-Disposition":`attachment; filename="comprobante"; filename*=UTF-8''${encodeURIComponent(item.filename)}`}});
    }else throw new LocalError("Ruta no encontrada.",404);
   }
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
async function handle(request:Request,context:Context){
 const headers={"Cache-Control":"no-store"};
 if(process.env.APP_MODE!=="local")return Response.json({error:"Modo local deshabilitado"},{status:404,headers});
 try{
  if(authMode()==="local")return dispatch(request,context);
  const user=sessionPrincipal(cookieValue(request.headers.get("cookie"),SESSION_COOKIE));
  if(!user)return Response.json({error:"Inicia sesión para acceder a tu negocio."},{status:401,headers});
  return await withPrincipal(user,()=>dispatch(request,context));
 }catch{return Response.json({error:"No se pudo verificar la sesión."},{status:503,headers});}
}
export const GET=handle;export const POST=handle;export const PATCH=handle;export const DELETE=handle;
