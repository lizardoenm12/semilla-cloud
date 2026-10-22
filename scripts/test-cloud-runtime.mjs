import {request as httpRequest} from 'node:http';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import ts from 'typescript';
const dir=resolve('tmp/tests','cloud-origin-'+randomUUID());await mkdir(dir,{recursive:true});
await writeFile(resolve(dir,'identity.mjs'),ts.transpileModule(await readFile('src/lib/local/identity.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
const {workspaceEnabled,workspaceOrigin}=await import(pathToFileURL(resolve(dir,'identity.mjs')));
Object.assign(process.env,{APP_MODE:'cloud',AUTH_MODE:'google',DATABASE_PROVIDER:'postgres',DATABASE_URL_KEY_VAULT_SECRET:'test-db',GOOGLE_CLIENT_SECRET_KEY_VAULT_SECRET:'test-google',AZURE_KEY_VAULT_NAME:'vault-test',AUTH_BASE_URL:'https://app.example.test'});
assert(workspaceEnabled());assert.equal(workspaceOrigin(new Request('http://internal:8080/api/local/bootstrap',{headers:{host:'app.example.test'}})),'https://app.example.test');
assert.throws(()=>workspaceOrigin(new Request('http://internal/',{headers:{host:'evil.invalid','x-forwarded-host':'app.example.test'}})));
for(const [key,bad] of [['AUTH_MODE','local'],['DATABASE_PROVIDER','sqlite'],['DATABASE_URL_KEY_VAULT_SECRET',''],['GOOGLE_CLIENT_SECRET_KEY_VAULT_SECRET',''],['AUTH_BASE_URL','http://app.example.test'],['AUTH_BASE_URL','https://user:password@app.example.test']]){const previous=process.env[key];process.env[key]=bad;assert.equal(workspaceEnabled(),false,key);process.env[key]=previous;}
const base='http://127.0.0.1:3227';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3227'],{env:{...process.env,GOOGLE_CLIENT_ID:'123456789-test.apps.googleusercontent.com',GOOGLE_CLIENT_SECRET:'',DATABASE_URL:'',NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe']});
try{
 await new Promise((yes,no)=>{const timer=setTimeout(()=>no(Error('No inició')),30000);server.once('error',no);server.once('exit',()=>{clearTimeout(timer);no(Error('Terminó'));});server.stdout.on('data',b=>{if(b.toString().includes('Ready')){clearTimeout(timer);yes();}});});
 const request=(path,host='app.example.test')=>new Promise((yes,no)=>{const req=httpRequest(base+path,{headers:{host}},res=>{let body='';res.on('data',b=>body+=b);res.on('end',()=>yes({status:res.statusCode,body}));});req.on('error',no);req.end();});
 assert.equal((await fetch(base+'/api/health')).status,200);
 assert.equal((await request('/api/local/bootstrap')).status,401);
 assert.equal((await request('/api/local/bootstrap','otro.example.test')).status,403);
 assert.equal((await request('/api/auth/session','otro.example.test')).status,400);
 const response=await request('/');assert.equal(response.status,200);assert(response.body.includes('Iniciar sesión con'));
 console.log('Protecciones cloud aprobadas: sesión obligatoria, HTTPS canónico, Host estricto, sin usuario local ni SQLite; sin llamadas Azure ni Google.');
}finally{server.kill();if(server.exitCode===null)await once(server,'exit');}
