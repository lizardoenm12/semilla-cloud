// Prueba real acotada: un PNG de 68 bytes, una carga y una descarga. Sin crear servicios.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
const runId=process.env.AZURE_RECEIPT_TEST_RUN??randomUUID(),directory=resolve('tmp/tests','azure-real-'+runId);await mkdir(directory,{recursive:true});
const base='http://127.0.0.1:3217',cli='C:/Program Files/Microsoft SDKs/Azure/CLI2/wbin';
const env={...process.env,APP_MODE:'local',ATTACHMENT_STORAGE:'azure',LOCAL_DB_PATH:resolve(directory,'demo.sqlite'),NEXT_TELEMETRY_DISABLED:'1',AZURE_STORAGE_ACCOUNT:'stclouddevlizardo01',AZURE_STORAGE_CONTAINER:'comprobantes'};
env.PATH=cli+';'+(env.PATH??env.Path??'');env.Path=env.PATH;delete env.AZURE_CLIENT_ID;
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3217'],{env,stdio:['ignore','pipe','pipe']});let logs='';server.stdout.on('data',b=>logs+=b);server.stderr.on('data',b=>logs+=b);
async function request(path,body){const response=await fetch(base+'/api/local/'+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});const value=await response.json();assert(response.ok,JSON.stringify(value));return value;}
try{
 await new Promise((yes,no)=>{const timer=setTimeout(()=>no(Error('Servidor no inició')),30000);server.once('error',no);server.once('exit',()=>{clearTimeout(timer);no(Error('Servidor terminó'));});server.stdout.on('data',b=>{if(b.toString().includes('Ready')){clearTimeout(timer);yes();}});});
 const boot=await request('bootstrap'),bid=boot.businesses[0].id,path='businesses/'+bid;
 let state=await request(path);if(!state.movements.length){const proposal=await request(path+'/proposals',{text:'Gasté Q1 de transporte'});await request(path+'/proposals/'+proposal.id+'/confirm',{items:proposal.items});state=await request(path);}const movement=state.movements[0];
 const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
 const route=path+'/movements/'+movement.id+'/attachments';const existing=(await request(route)).items;const saved=existing[0]??await request(route,{filename:'prueba-operacion.png',contentType:'image/png',base64:bytes.toString('base64')});assert.equal(saved.cloud_status,'uploaded','Azure debe confirmar escritura');
 const listed=await request(route);assert.equal(listed.items[0].cloud_status,'uploaded');
 const response=await fetch(base+'/api/local/'+route+'/'+saved.id,{signal:AbortSignal.timeout(45000)});assert.equal(response.status,200);assert.equal(response.headers.get('x-attachment-source'),'azure');assert(Buffer.from(await response.arrayBuffer()).equals(bytes));assert.deepEqual((await request(path)).stats,state.stats);
 const evidence={fechaUTC:new Date().toISOString(),resultado:'aprobado',alcance:'Operación confirmada en SQLite aislado y comprobante PNG real en Azure privado. No usa ni modifica los negocios del usuario.',businessId:bid,movementId:movement.id,attachmentId:saved.id,objectName:`operaciones/${bid}/${movement.id}/${saved.id}`,account:env.AZURE_STORAGE_ACCOUNT,container:env.AZURE_STORAGE_CONTAINER,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),source:'azure',operacionSinCambios:true,operacionesAzure:{cargas:existing.length?0:1,descargas:1},notaPrueba:"Una carga inicial y dos intentos de descarga en total: se corrigió el rango solicitado al SDK tras el primer intento.",archivoPrueba:'Conservado para demostración; puede quitarse desde la app con LOCAL_DB_PATH apuntando al SQLite aislado.',baseLocalRelativa:'tmp/tests/azure-real-'+runId+'/demo.sqlite'};
 await mkdir('evidencias',{recursive:true});await writeFile('evidencias/operacion-azure-2026-10-20.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence,null,2));
}catch(error){console.error(error.message);console.error(logs.slice(-1200));process.exitCode=1;}finally{server.kill();if(server.exitCode===null)await once(server,'exit');}
