import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawn,spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import ts from 'typescript';
const directory=resolve('tmp/tests','google-'+randomUUID());await mkdir(directory,{recursive:true});
process.env.APP_MODE='local';process.env.AUTH_MODE='local';process.env.LOCAL_DB_PATH=resolve(directory,'test.sqlite');
for(const name of ['identity','db','contracts','parser','service','auth-store','attachments']){
 const source=(await readFile(`src/lib/local/${name}.ts`,'utf8')).replace(/from "\.\/([^".]+)"/g,'from "./$1.mjs"');await writeFile(resolve(directory,name+'.mjs'),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
}
const load=name=>import(pathToFileURL(resolve(directory,name+'.mjs')));
const service=await load('service'),identity=await load('identity'),auth=await load('auth-store'),db=await load('db'),attachments=await load('attachments');
const results=[];async function check(name,fn){await fn();results.push({prueba:name,ok:true});console.log('OK '+name);}
const legacy=service.bootstrap().businesses[0].id,proposal=service.createProposal(legacy,{text:'Gasté Q2 de transporte'});service.confirmProposal(legacy,proposal.id,proposal.items);const mid=service.snapshot(legacy).movements[0].id;const attached=attachments.createAttachment(legacy,mid,{filename:'prueba.pdf',contentType:'application/pdf',base64:Buffer.from('%PDF-1.4\nlocal\n%%EOF').toString('base64')});const stats=service.snapshot(legacy).stats;
process.env.AUTH_MODE='google';
const alice=auth.provisionPrincipal({iss:'https://accounts.google.com',sub:'100000000001',name:'Propietario'}),bob=auth.provisionPrincipal({iss:'https://accounts.google.com',sub:'100000000002',name:'Propietario'});
await check('Google usa sub y no nombre/correo; no hereda negocios por llegar primero',()=>{assert.notEqual(alice.id,bob.id);for(const user of [alice,bob])identity.withPrincipal(user,()=>{assert.equal(service.bootstrap().businesses.length,0);assert.throws(()=>service.snapshot(legacy),e=>e.status===404);});});
await check('Google rechaza issuer ajeno y sub inválido',()=>{assert.throws(()=>auth.provisionPrincipal({iss:'https://otro.invalid',sub:'123'}));assert.throws(()=>auth.provisionPrincipal({iss:'https://accounts.google.com',sub:'a/b'}));assert.throws(()=>auth.provisionPrincipal({iss:'https://accounts.google.com'}));});
process.env.AUTH_LEGACY_GOOGLE_SUB='100000000001';auth.provisionPrincipal({iss:'https://accounts.google.com',sub:'100000000001',name:'Propietario'});
await check('Vinculación explícita conserva operaciones y archivos; otro usuario no accede',()=>{identity.withPrincipal(alice,()=>{assert.deepEqual(service.snapshot(legacy).stats,stats);assert.equal(attachments.readAttachment(legacy,mid,attached.id).filename,'prueba.pdf');});identity.withPrincipal(bob,()=>assert.throws(()=>attachments.readAttachment(legacy,mid,attached.id),e=>e.status===404));});
const aToken=auth.createSession(alice),bToken=auth.createSession(bob);process.env.AUTH_MODE='entra';assert.equal(auth.sessionPrincipal(aToken),null);process.env.AUTH_MODE='google';
await check('Cambiar proveedor no acepta una sesión del proveedor anterior',()=>{assert.equal(auth.sessionPrincipal(aToken).id,alice.id);db.run('INSERT INTO users VALUES (?,?)','entra:test:otro','Usuario anterior');const previous=auth.createSession({id:'entra:test:otro',name:'Usuario anterior'});assert.equal(auth.sessionPrincipal(previous),null);});
const base='http://localhost:3221',env={...process.env,AUTH_MODE:'google',AUTH_BASE_URL:base,GOOGLE_CLIENT_ID:'1234567890-test.apps.googleusercontent.com',GOOGLE_CLIENT_SECRET:'solo-secreto-de-prueba-no-real',ATTACHMENT_STORAGE:'local',NEXT_TELEMETRY_DISABLED:'1'};
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3221'],{env,stdio:['ignore','pipe','pipe']});let logs='';server.stderr.on('data',b=>logs+=b);
const request=(path,token,body)=>fetch(base+path,{method:body===undefined?'GET':'POST',headers:{...(token?{Cookie:'cloud_session='+token}:{}),...(body===undefined?{}:{Origin:base,'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'});
try{
 await new Promise((yes,no)=>{const timer=setTimeout(()=>no(Error('Servidor no inició')),30000);server.once('error',no);server.once('exit',()=>{clearTimeout(timer);no(Error('Servidor terminó'));});server.stdout.on('data',b=>{if(b.toString().includes('Ready')){clearTimeout(timer);yes();}});});
 await check('Pantalla de Google y API sin sesión protegida, sin contactar Google',async()=>{const page=await request('/');assert((await page.text()).replace(/<!--.*?-->/g,'').includes('Iniciar sesión con Google'));assert.equal((await request('/api/local/bootstrap')).status,401);});
 await check('HTTP sesión Google separa negocios y descargas',async()=>{const response=await request('/api/local/bootstrap',aToken),data=await response.json();assert.equal(response.status,200);assert.equal(data.authMode,'google');assert.equal(data.businesses[0].id,legacy);assert.equal((await request('/api/local/businesses/'+legacy,bToken)).status,404);assert.equal((await request(`/api/local/businesses/${legacy}/movements/${mid}/attachments/${attached.id}`,bToken)).status,404);});
 await check('Logout Google revoca la sesión',async()=>{assert.equal((await request('/api/auth/logout',aToken,{})).status,303);assert.equal((await request('/api/local/bootstrap',aToken)).status,401);});
}catch(error){console.error(logs.slice(-1500));throw error;}finally{server.kill();if(server.exitCode===null)await once(server,'exit');}
await check('Configurador privado valida el retorno y conserva las variables Azure',async()=>{
 const configDirectory=resolve(directory,'config');await mkdir(configDirectory);const client=resolve(configDirectory,'client_secret_test.json'),envFile=resolve(configDirectory,'.env.local');const source=resolve('scripts/configurar-google.mjs');
 await writeFile(envFile,'AUTH_MODE=local\nAZURE_STORAGE_ACCOUNT=conservar\nDEMO_TOKEN=valor-privado-de-prueba\n');
 const credentials={web:{client_id:env.GOOGLE_CLIENT_ID,client_secret:env.GOOGLE_CLIENT_SECRET,redirect_uris:['http://localhost:3010/api/auth/callback']}};await writeFile(client,JSON.stringify(credentials));
 for(let i=0;i<2;i++){const run=spawnSync(process.execPath,[source,client],{cwd:configDirectory,encoding:'utf8'});assert.equal(run.status,0,run.stderr);assert(!run.stdout.includes(env.GOOGLE_CLIENT_SECRET));}
 const content=await readFile(envFile,'utf8');assert.equal(content.match(/^AUTH_MODE=/gm).length,1);assert(content.includes('AZURE_STORAGE_ACCOUNT=conservar'));assert(content.includes('DEMO_TOKEN=valor-privado-de-prueba'));
 credentials.web.redirect_uris=['http://localhost:9999/mal'];await writeFile(client,JSON.stringify(credentials));const invalid=spawnSync(process.execPath,[source,client],{cwd:configDirectory,encoding:'utf8'});assert.equal(invalid.status,1);assert.equal(await readFile(envFile,'utf8'),content);
});
await mkdir('evidencias',{recursive:true});await writeFile('evidencias/pruebas-google-locales.json',JSON.stringify({fechaUTC:new Date().toISOString(),alcance:'Identidades Google simuladas y SQLite aislado. Sin llamadas a Google o Azure. El acceso Google real sigue pendiente de credenciales OAuth.',resultados:results},null,2));console.log(results.length+' comprobaciones Google aprobadas, sin servicios remotos.');
