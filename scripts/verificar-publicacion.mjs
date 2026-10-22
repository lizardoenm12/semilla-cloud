import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {loadDomain} from './lib/load-domain.mjs';
process.loadEnvFile('.env.local');process.env.APP_MODE='local';
if(process.platform==='win32'){process.env.Path=join(process.env.ProgramFiles??'C:/Program Files','Microsoft SDKs/Azure/CLI2/wbin')+';'+(process.env.Path??process.env.PATH??'');process.env.PATH=process.env.Path;}
const config=JSON.parse(await readFile('infra/deployment.json','utf8')),base=config.baseUrl;
let db,auth,token;
try{
 ({db,auth}=await loadDomain());
 const principal=await db.one('SELECT id,name FROM users WHERE id=?','google:'+process.env.AUTH_LEGACY_GOOGLE_SUB);assert(principal);
 const health=await fetch(base+'/api/health',{signal:AbortSignal.timeout(120000)});assert.equal(health.status,200);
 assert.equal((await fetch(base+'/api/local/bootstrap')).status,401);
 token=await auth.createSession(principal);const headers={Cookie:'cloud_session='+token};
 const response=await fetch(base+'/api/local/bootstrap',{headers,signal:AbortSignal.timeout(90000)});assert.equal(response.status,200);const boot=await response.json();assert.equal(boot.databaseProvider,'postgres');assert.equal(boot.mode,'cloud');
 const rejected=await fetch(base+'/api/local/businesses',{method:'POST',headers:{...headers,Origin:'https://otro.invalid','Content-Type':'application/json'},body:'{}'});assert.equal(rejected.status,403);
 const item=await db.one('SELECT a.id,a.business_id,a.movement_id,a.sha256 FROM movement_attachments a JOIN attachment_cloud c ON c.attachment_id=a.id JOIN memberships m ON m.business_id=a.business_id WHERE c.status=? AND m.user_id=? AND m.active=1 LIMIT 1','uploaded',principal.id);
 let blobVerified=false;
 if(item){const file=await fetch(base+`/api/local/businesses/${item.business_id}/movements/${item.movement_id}/attachments/${item.id}`,{headers,signal:AbortSignal.timeout(90000)});assert.equal(file.status,200);assert.equal(file.headers.get('x-attachment-source'),'azure');assert.equal(createHash('sha256').update(Buffer.from(await file.arrayBuffer())).digest('hex'),item.sha256);blobVerified=true;}
 const login=await fetch(base+'/api/auth/login',{redirect:'manual',signal:AbortSignal.timeout(60000)});assert.equal(login.status,307);const target=new URL(login.headers.get('location'));assert.equal(target.hostname,'accounts.google.com');assert.equal(target.searchParams.get('redirect_uri'),base+'/api/auth/callback');
 const cookie=auth.cookieValue(login.headers.get('set-cookie'),auth.FLOW_COOKIE);assert(await auth.consumeFlow(target.searchParams.get('state'),cookie));
 const evidence={fechaUTC:new Date().toISOString(),url:base,health:200,sinSesion:401,sesionTemporalPropietario:200,origenAjeno:403,databaseProvider:boot.databaseProvider,mode:boot.mode,businesses:boot.businesses.length,blobDescargaIntegridad:blobVerified,googleRedireccionPreparada:true,googleCallbackReal:'Pendiente de prueba interactiva del usuario',azureCredential:'Identidad administrada id-cloud-app-dev; no hay Azure CLI en la imagen',nuevosBlobs:0,nuevasOperaciones:0};
 await writeFile('evidencias/publicacion-real.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence,null,2));
}catch(error){console.error('Verificación pública no completada:',error instanceof assert.AssertionError?'HTTP o dato inesperado: '+error.message:'Error de conexión o configuración; sin detalles privados');process.exitCode=1;}
finally{if(token&&auth)await auth.revokeSession(token);if(db)await db.closeDatabase();}
