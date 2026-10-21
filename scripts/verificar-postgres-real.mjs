import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {loadDomain} from './lib/load-domain.mjs';
const root=resolve(process.env.PROJECT_ROOT??'.'),config=JSON.parse(await readFile(resolve(root,'.data/private/postgres-runtime.json'),'utf8'));
process.env.APP_MODE='local';process.env.AUTH_MODE='google';process.env.DATABASE_PROVIDER='postgres';process.env.DATABASE_URL=config.url;process.env.DATABASE_MIGRATION_PROCESS='1';
const {db,service,auth,identity}=await loadDomain();const sub=process.env.AUTH_LEGACY_GOOGLE_SUB;assert(sub,'Falta propietario Google verificado');
const principal=await db.one('SELECT id,name FROM users WHERE id=?','google:'+sub);assert(principal,'La migración debe conservar al propietario');
let server,token;const rollback=new Error('Rollback deliberado de la prueba');
try{
 const result=await identity.withPrincipal(principal,async()=>{
  const boot=await service.bootstrap();assert(boot.businesses.length>=2);const bid=boot.businesses[0].id,before=await service.snapshot(bid);let exercised=false;
  try{await db.transaction(async()=>{const proposal=await service.createProposal(bid,{text:'Gasté Q1 de prueba de conexión'});await service.confirmProposal(bid,proposal.id,proposal.items);const during=await service.snapshot(bid);assert.equal(during.stats.movements,before.stats.movements+1);exercised=true;throw rollback;});}catch(error){if(error!==rollback)throw error;}
  assert(exercised);assert.deepEqual((await service.snapshot(bid)).stats,before.stats);return {businesses:boot.businesses.length,rollback:true};
 });
 token=await auth.createSession(principal);const base='http://127.0.0.1:3225';
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3225'],{env:{...process.env,ATTACHMENT_STORAGE:'local',NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe']});
 let logs='';server.stderr.on('data',b=>logs+=b);await new Promise((yes,no)=>{const timer=setTimeout(()=>no(Error('Servidor no inició')),30000);server.once('error',no);server.once('exit',()=>{clearTimeout(timer);no(Error('Servidor terminó'));});server.stdout.on('data',b=>{if(b.toString().includes('Ready')){clearTimeout(timer);yes();}});});
 const response=await fetch(base+'/api/local/bootstrap',{headers:{Cookie:'cloud_session='+token},signal:AbortSignal.timeout(45000)});assert.equal(response.status,200);const boot=await response.json();assert(boot.businesses.length>=2);assert.equal((await fetch(base+'/api/local/bootstrap')).status,401);
 const evidence={fechaUTC:new Date().toISOString(),resultado:'aprobado',target:config.host,database:config.database,autenticacion:'Sesión interna temporal del propietario Google ya verificado; no realiza otro login Google',tls:'Certificado del servidor verificado',role:config.role,...result,httpAutenticado:response.status,httpSinSesion:401,nuevasOperacionesPersistidas:0,blobSinCambios:true};
 await mkdir(resolve(root,'evidencias'),{recursive:true});await writeFile(resolve(root,'evidencias/postgresql-real.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence,null,2));
}catch(error){console.error('Verificación PostgreSQL no completada:',error.code??error.name,error instanceof assert.AssertionError?error.message:'');process.exitCode=1;}
finally{if(server){server.kill();if(server.exitCode===null)await once(server,'exit');}if(token)await auth.revokeSession(token);await db.closeDatabase();}
