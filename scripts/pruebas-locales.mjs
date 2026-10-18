import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
const base = 'http://127.0.0.1:3211';
const token = 'local-test-only-81af7ae6a3a74b569a8d';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3211'],{
 env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',DEMO_TOKEN:token,AZURE_STORAGE_ACCOUNT:'',AZURE_STORAGE_CONTAINER:''},stdio:['ignore','pipe','pipe']
});
try {
 await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error('Servidor local no inició')),20000);
  server.once('error',reject);
  server.once('exit',()=>{clearTimeout(timer);reject(new Error('Servidor terminó antes de iniciar'));});
  server.stdout.on('data',chunk=>{if(chunk.toString().includes('Ready')){clearTimeout(timer);resolve();}});
 });
const cases = [
 ['health', '/api/health', 'GET', null, 200],
 ['crear sin token', '/api/comprobantes', 'POST', null, 401],
 ['listar sin token', '/api/comprobantes', 'GET', null, 401],
 ['estado sin token', '/api/estado', 'GET', null, 401],
 ['token incorrecto', '/api/comprobantes', 'POST', 'incorrecto', 401],
 ['ID inválido', '/api/comprobantes?id=invalido', 'GET', token, 400],
 ['ID de 36 guiones', '/api/comprobantes?id='+'-'.repeat(36), 'GET', token, 400],
 ['crear sin Azure configurado', '/api/comprobantes', 'POST', token, 500],
 ['leer sin Azure configurado', '/api/comprobantes?id=15666e80-0297-4f70-8890-073ea22c732e', 'GET', token, 500],
 ['inicio', '/', 'GET', null, 200],
 ['comprobantes', '/comprobantes', 'GET', null, 200],
 ['estado', '/estado', 'GET', null, 200],
];
const results=[];
for (const [name,path,method,auth,expected] of cases) {
 const res=await fetch(base+path,{method,headers:auth?{Authorization:`Bearer ${auth}`}:{}});
 assert.equal(res.status,expected,name);
 const body=await res.text();
 assert(!body.includes(token), 'No filtrar token');
 results.push({prueba:name,esperado:expected,obtenido:res.status,ok:true});
}
const res=await fetch(base+'/api/estado',{headers:{Authorization:`Bearer ${token}`}});
const state=await res.json();
assert.equal(state.compute.entornoDetectado,false);
assert.equal(state.storage.ok,false);
results.push({prueba:'estado no simula servicios desplegados',ok:true});
await writeFile('evidencias/pruebas-locales.json',JSON.stringify({fechaUTC:new Date().toISOString(),alcance:'HTTP local, sin Azure; no prueba escritura remota',resultados:results},null,2));
console.log(`${results.length} comprobaciones locales aprobadas`);

} finally {
 server.kill();
 await once(server,'exit').catch(()=>{});
}
