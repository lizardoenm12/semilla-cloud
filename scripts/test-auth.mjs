import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import ts from 'typescript';
const directory=resolve('tmp/tests','auth-'+randomUUID());await mkdir(directory,{recursive:true});
const tenant='a77a7a5a-e870-4855-82ff-f6c1037880a2',owner='39a3acc4-9da6-47a6-a384-df22ded75c37',second=randomUUID();
process.env.APP_MODE='local';process.env.AUTH_MODE='local';process.env.AUTH_TENANT_ID=tenant;process.env.AUTH_LEGACY_OWNER_OBJECT_ID=owner;process.env.LOCAL_DB_PATH=resolve(directory,'test.sqlite');
const load=name=>import(pathToFileURL(resolve(directory,name+'.mjs')));
for(const name of ['identity','db','contracts','parser','service','auth-store','attachments']){
 const source=(await readFile(`src/lib/local/${name}.ts`,'utf8')).replace(/from "\.\/([^".]+)"/g,'from "./$1.mjs"');
 await writeFile(resolve(directory,name+'.mjs'),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
}
const service=await load('service'),identity=await load('identity'),auth=await load('auth-store'),db=await load('db'),attachments=await load('attachments');
const results=[];async function check(name,action){await action();results.push({prueba:name,ok:true});console.log('OK '+name);}
const legacy=service.bootstrap().businesses[0].id,proposal=service.createProposal(legacy,{text:'Gasté Q3 de transporte'});service.confirmProposal(legacy,proposal.id,proposal.items);const movement=service.snapshot(legacy).movements[0].id;
const attached=attachments.createAttachment(legacy,movement,{filename:'original.pdf',contentType:'application/pdf',base64:Buffer.from('%PDF-1.4\nrespaldo\n%%EOF').toString('base64')});
const originalStats=service.snapshot(legacy).stats;
process.env.AUTH_MODE='entra';
await check('Modo Entra no permite principal local implícito',()=>assert.throws(()=>service.bootstrap()));
const bob=auth.provisionPrincipal({oid:second,tid:tenant,sub:'bob-sub',name:'Segundo usuario'});
await check('Primer visitante no hereda los negocios previos',()=>identity.withPrincipal(bob,()=>{assert.equal(service.bootstrap().businesses.length,0);assert.throws(()=>service.snapshot(legacy),e=>e.status===404);}));
const alice=auth.provisionPrincipal({oid:owner,tid:tenant,sub:'alice-sub',name:'Propietario'});
await check('Solo oid explícito recupera negocios y comprobantes sin cambiar importes',()=>identity.withPrincipal(alice,()=>{assert.equal(service.bootstrap().businesses[0].id,legacy);assert.deepEqual(service.snapshot(legacy).stats,originalStats);assert.equal(attachments.readAttachment(legacy,movement,attached.id).filename,'original.pdf');}));
await check('Otro directorio y email sin oid no autentican',()=>{assert.throws(()=>auth.provisionPrincipal({oid:owner,tid:randomUUID(),sub:'x'}));assert.throws(()=>auth.provisionPrincipal({sub:'correo@ejemplo.com',tid:tenant}));});
const bobsBusiness=identity.withPrincipal(bob,()=>service.createBusiness({name:'Negocio B',sector:'Comercio',stage:'idea'})).id;
await check('Contextos concurrentes aíslan usuarios y propietarios',async()=>{await Promise.all([identity.withPrincipal(alice,async()=>{await new Promise(r=>setTimeout(r,15));assert.equal(service.bootstrap().user.id,alice.id);assert.throws(()=>service.snapshot(bobsBusiness),e=>e.status===404);}),identity.withPrincipal(bob,async()=>{await new Promise(r=>setTimeout(r,5));assert.equal(service.bootstrap().user.id,bob.id);assert.throws(()=>attachments.readAttachment(legacy,movement,attached.id),e=>e.status===404);})]);});
const aToken=auth.createSession(alice),bToken=auth.createSession(bob);
await check('Sesión opaca: solo hash persistido, token alterado rechazado',()=>{assert.equal(auth.sessionPrincipal(aToken).id,alice.id);assert.equal(auth.sessionPrincipal(aToken+'x'),null);assert.equal(db.one('SELECT token_hash FROM auth_sessions WHERE user_id=?',alice.id).token_hash,auth.digest(aToken));});
await check('Estado y cookie de navegador, caducidad y uso único del retorno',()=>{const flow=auth.createFlow('verificador','nonce');assert.equal(auth.consumeFlow(flow.state,auth.randomToken()),null);assert.equal(auth.consumeFlow(flow.state,flow.browser).nonce,'nonce');assert.equal(auth.consumeFlow(flow.state,flow.browser),null);const expired=auth.createFlow('v','n');db.run('UPDATE auth_flows SET expires_at=0');assert.equal(auth.consumeFlow(expired.state,expired.browser),null);});
const base='http://localhost:3219';const env={...process.env,AUTH_CLIENT_ID:randomUUID(),AUTH_CLIENT_SECRET:'solo-valor-de-prueba-no-real',AUTH_BASE_URL:base,ATTACHMENT_STORAGE:'local',NEXT_TELEMETRY_DISABLED:'1'};
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3219'],{env,stdio:['ignore','pipe','pipe']});let logs='';server.stderr.on('data',b=>logs+=b);
async function request(path,token,body,method='POST',origin=base){const headers={};if(token)headers.Cookie='cloud_session='+token;if(body!==undefined){headers['Content-Type']='application/json';headers.Origin=origin;}return fetch(base+path,{headers,method:body===undefined?'GET':method,body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'});}
try{
 await new Promise((yes,no)=>{const timer=setTimeout(()=>no(Error('Servidor no inició')),30000);server.once('error',no);server.once('exit',()=>{clearTimeout(timer);no(Error('Servidor terminó'));});server.stdout.on('data',b=>{if(b.toString().includes('Ready')){clearTimeout(timer);yes();}});});
 await check('HTTP sin sesión no expone negocios ni archivos',async()=>{for(const path of ['/api/local/bootstrap',`/api/local/businesses/${legacy}`,`/api/local/businesses/${legacy}/movements/${movement}/attachments/${attached.id}`])assert.equal((await request(path)).status,401);const page=await request('/');assert((await page.text()).includes('Iniciar sesión con Microsoft'));});
 await check('HTTP sesión válida ve solo sus negocios y rechaza ajenos',async()=>{const a=await(await request('/api/local/bootstrap',aToken)).json(),b=await(await request('/api/local/bootstrap',bToken)).json();assert.equal(a.user.id,alice.id);assert.deepEqual(b.businesses.map(x=>x.id),[bobsBusiness]);for(const path of [`/api/local/businesses/${legacy}`,`/api/local/businesses/${legacy}/movements/${movement}/attachments/${attached.id}`])assert.equal((await request(path,bToken)).status,404);});
 await check('HTTP no acepta identidad inventada ni origen ajeno',async()=>{assert.equal((await request('/api/local/bootstrap','inventado')).status,401);assert.equal((await request('/api/local/businesses',bToken,{name:'Intruso',sector:'x',stage:'idea'},'POST','https://ajeno.invalid')).status,403);});
 await check('Callback sin estado o con cookie incorrecta se rechaza sin contactar Microsoft',async()=>{assert.equal((await request('/api/auth/callback?code=falso&state=falso')).status,400);});
 await check('Logout exige origen correcto y revoca solo la sesión elegida',async()=>{assert.equal((await request('/api/auth/logout',aToken,{},'POST','https://ajeno.invalid')).status,403);const response=await request('/api/auth/logout',aToken,{});assert.equal(response.status,303);assert((response.headers.get('set-cookie')??'').includes('HttpOnly'));assert.equal((await request('/api/local/bootstrap',aToken)).status,401);assert.equal((await request('/api/local/bootstrap',bToken)).status,200);});
 await check('Sesión caducada no permite acceso',async()=>{db.run('UPDATE auth_sessions SET expires_at=0 WHERE user_id=?',bob.id);assert.equal((await request('/api/local/bootstrap',bToken)).status,401);});
}catch(error){console.error(logs.slice(-1500));throw error;}finally{server.kill();if(server.exitCode===null)await once(server,'exit');}
await mkdir('evidencias',{recursive:true});await writeFile('evidencias/pruebas-identidad-locales.json',JSON.stringify({fechaUTC:new Date().toISOString(),alcance:'Identidades simuladas y SQLite aislado, sin Microsoft ni Azure. No constituye un inicio de sesión real.',resultados:results},null,2));console.log(results.length+' comprobaciones de identidad aprobadas. Sin Azure.');
