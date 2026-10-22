import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import ts from 'typescript';
const dir=resolve('tmp/tests/monitor-'+randomUUID());await mkdir(dir,{recursive:true});
await writeFile(resolve(dir,'observability.mjs'),ts.transpileModule(await readFile('src/lib/observability.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
const {observeRequest,routeName,release,applicationStarted,requestError}=await import(pathToFileURL(resolve(dir,'observability.mjs')));
const lines=[],original={log:console.log,error:console.error};console.log=console.error=line=>lines.push(JSON.parse(line));
try{
 process.env.OBSERVABILITY_ENABLED='1';process.env.APP_RELEASE='a'.repeat(40);
 assert.equal(routeName('/api/auth/callback?code=secret&state=private','auth'),'/api/auth/callback');
 assert.equal(routeName('/api/local/businesses/owner-name/proposals/private-id/confirm','business'),'/api/local/businesses/:id/proposals/:id/confirm');
 assert.equal(routeName('/api/local/businesses/name/anything-secret','business'),'/api/local/other');
 applicationStarted();
 const req=new Request('https://example.test/api/local/businesses/private-business?secret=secret-query',{headers:{cookie:'private-cookie','X-Request-ID':'private-client-id'}});
 const result=await observeRequest(req,async()=>Response.json({private:'business-data'}),'business');
 assert.equal(result.status,200);assert.match(result.headers.get('X-Request-ID'),/^[a-f0-9-]{36}$/);assert.equal(lines.at(-1).route,'/api/local/businesses/:id');assert.equal(lines.at(-1).status,200);assert.equal(lines.at(-1).level,'info');
 await observeRequest(req,async()=>Response.json({error:'secret-error'},{status:503}),'business');assert.equal(lines.at(-1).level,'error');assert.equal(lines.at(-1).status,503);
 await assert.rejects(observeRequest(req,async()=>{throw Error('private-exception')},'business'));assert.equal(lines.at(-1).status,500);
 requestError('GET','/api/auth/callback?code=secret-code');assert.equal(lines.at(-1).route,'/api/auth/callback');
 const all=JSON.stringify(lines);for(const forbidden of ['private-business','secret-query','private-cookie','private-client-id','business-data','secret-error','private-exception','secret-code'])assert(!all.includes(forbidden),forbidden);
 for(const row of lines){assert.equal(row.release,'a'.repeat(40));assert(!('headers' in row));assert(!('body' in row));}
 process.env.APP_RELEASE='secret-value';assert.equal(release(),'unknown');
 const count=lines.length;process.env.OBSERVABILITY_ENABLED='0';await observeRequest(req,async()=>new Response('ok'),'business');applicationStarted();assert.equal(lines.length,count);
}finally{console.log=original.log;console.error=original.error;}
console.log('Monitor: rutas anónimas, nivel de error, duración, correlación, ausencia de secretos y modo desactivado verificados.');
