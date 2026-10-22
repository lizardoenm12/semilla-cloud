import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {loadDomain} from './lib/load-domain.mjs';
process.loadEnvFile('.env.local');
process.env.APP_MODE='local';
if(process.platform==='win32'){process.env.Path=join(process.env.ProgramFiles??'C:/Program Files','Microsoft SDKs/Azure/CLI2/wbin')+';'+(process.env.Path??process.env.PATH??'');process.env.PATH=process.env.Path;}
let db,auth,token;
try{
 const content=await readFile('.env.local','utf8');
 assert(!/^DATABASE_URL=/m.test(content));assert(!/^GOOGLE_CLIENT_SECRET=/m.test(content));
 delete process.env.DATABASE_URL;delete process.env.GOOGLE_CLIENT_SECRET;
 assert(process.env.DATABASE_URL_KEY_VAULT_SECRET);assert(process.env.GOOGLE_CLIENT_SECRET_KEY_VAULT_SECRET);
 ({db,auth}=await loadDomain());
 assert.equal((await db.one('SELECT 1 AS ok')).ok,1);
 const principal=await db.one('SELECT id,name FROM users WHERE id=?','google:'+process.env.AUTH_LEGACY_GOOGLE_SUB);assert(principal);
 token=await auth.createSession(principal);
 const base='http://localhost:3010';
 const response=await fetch(base+'/api/local/bootstrap',{headers:{Cookie:'cloud_session='+token},signal:AbortSignal.timeout(45000)});
 assert.equal(response.status,200);const boot=await response.json();assert.equal(boot.databaseProvider,'postgres');
 assert.equal((await fetch(base+'/api/local/bootstrap')).status,401);
 const login=await fetch(base+'/api/auth/login',{redirect:'manual',signal:AbortSignal.timeout(45000)});
 assert([302,303,307].includes(login.status));const location=new URL(login.headers.get('location'));assert.equal(location.hostname,'accounts.google.com');
 const flowCookie=auth.cookieValue(login.headers.get('set-cookie'),auth.FLOW_COOKIE);
 assert(await auth.consumeFlow(location.searchParams.get('state'),flowCookie));
 const evidence={fechaUTC:new Date().toISOString(),resultado:'aprobado',vault:process.env.AZURE_KEY_VAULT_NAME,secretos:['asistente-postgresql-url','asistente-google-client-secret'],envSoloReferencias:true,postgresConsultaReal:true,httpAutenticado:response.status,httpSinSesion:401,googleInicioRedirige:true,alcanceGoogle:'Secreto leído y descubrimiento OIDC real; no simula un nuevo callback ni inicia sesión por el usuario',businesses:boot.businesses.length,credencialAzure:'Sesión CLI del desarrollador; identidad administrada pendiente de despliegue',nuevasOperaciones:0,nuevosBlobs:0};
 await mkdir('evidencias',{recursive:true});await writeFile('evidencias/keyvault-integracion-real.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence,null,2));
}catch{console.error('No se completó la verificación Key Vault. No se muestran errores internos ni credenciales.');process.exitCode=1;}
finally{if(token&&auth)await auth.revokeSession(token);if(db)await db.closeDatabase();}
