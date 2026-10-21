import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import ts from 'typescript';
import {DatabaseSync} from 'node:sqlite';
import {migrateSqlite} from './lib/migracion-postgres.mjs';
const directory=resolve('tmp/tests','postgres-'+randomUUID());await mkdir(directory,{recursive:true});
const modules=['identity','sqlite','postgres-sql','db','contracts','parser','service','attachments','auth-store'];
for(const name of modules){let source=await readFile(`src/lib/local/${name}.ts`,'utf8');if(name==='db')source=source.replace('from "pg"','from "./pg-mock.mjs"');source=source.replace(/from "\.\/([^".]+)"/g,'from "./$1.mjs"');await writeFile(resolve(directory,name+'.mjs'),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);}
await writeFile(resolve(directory,'schema.mjs'),ts.transpileModule(await readFile('src/lib/postgres/schema.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText);
const engine=await PGlite.create();const {POSTGRES_SCHEMA}=await import(pathToFileURL(resolve(directory,'schema.mjs')));await engine.exec(POSTGRES_SCHEMA);
globalThis.pgTest={engine,events:[],failSerializable:0};
await writeFile(resolve(directory,'pg-mock.mjs'),`const state=globalThis.pgTest;export const types={getTypeParser:()=>x=>x};async function query(sql,values){state.events.push(sql);if(sql==='BEGIN ISOLATION LEVEL SERIALIZABLE'&&state.failSerializable>0){state.failSerializable--;throw Object.assign(Error('retry'),{code:'40001'});}const r=await state.engine.query(sql,values);return {rows:r.rows,rowCount:r.affectedRows??r.rows.length};}export class Pool{constructor(config){state.config=config;}on(){}async query(sql,values){return query(sql,values);}async connect(){state.events.push('connect');return {query,release(){state.events.push('release');}};}async end(){}}`);
process.env.APP_MODE='local';process.env.AUTH_MODE='google';process.env.DATABASE_PROVIDER='postgres';process.env.DATABASE_URL='postgresql://test:test@postgres.example.test/test';process.env.ATTACHMENT_STORAGE='local';
const load=name=>import(pathToFileURL(resolve(directory,name+'.mjs')));
const service=await load('service'),identity=await load('identity'),db=await load('db'),auth=await load('auth-store'),attachments=await load('attachments'),sql=await load('postgres-sql');
const results=[];async function check(name,action){await action();results.push({prueba:name,ok:true});console.log('OK '+name);}
const alice=await auth.provisionPrincipal({iss:'https://accounts.google.com',sub:'100000001',name:'Usuario A'}),bob=await auth.provisionPrincipal({iss:'https://accounts.google.com',sub:'100000002',name:'Usuario B'});
let bid,pid,mid;
await identity.withPrincipal(alice,async()=>{
 await check('Esquema PostgreSQL, TLS verificado y usuarios Google',async()=>{assert.equal((await service.bootstrap()).businesses.length,0);assert.deepEqual(globalThis.pgTest.config.ssl,{rejectUnauthorized:true});assert.equal(globalThis.pgTest.config.max,4);});
 bid=(await service.createBusiness({name:'Negocio SQL',sector:'Tienda',stage:'en_marcha'})).id;
 pid=(await service.createProduct(bid,{name:'Agua',sku:'AGUA',priceCents:500,stock:10,minStock:2})).id;
 const proposal=await service.createProposal(bid,{text:'Vendí 2 aguas a Q5 cada una y gasté Q1 de transporte'});
 await check('Venta y gasto en una sola transacción PostgreSQL',async()=>{await service.confirmProposal(bid,proposal.id,proposal.items);const snapshot=await service.snapshot(bid);assert.equal(snapshot.stats.sales,1000);assert.equal(snapshot.stats.expenses,100);assert.equal(snapshot.products[0].stock,8);assert.equal(snapshot.movements.length,2);mid=snapshot.movements[0].id;});
 await check('Confirmación duplicada se rechaza sin cambiar saldos',async()=>{await assert.rejects(()=>service.confirmProposal(bid,proposal.id,proposal.items),e=>e.status===409);assert.equal((await service.snapshot(bid)).stats.movements,2);});
 await check('Stock insuficiente revierte toda la operación',async()=>{const bad=await service.createProposal(bid,{text:'Gasté Q8 de transporte y vendí 99 aguas a Q5'});await assert.rejects(()=>service.confirmProposal(bid,bad.id,bad.items),e=>e.status===422);assert.equal((await service.snapshot(bid)).stats.expenses,100);});
 await check('Perfil, aprendizaje idempotente y orden de mensajes',async()=>{await service.saveProfile(bid,{archetypeId:'pioneros'});const boot=await service.bootstrap();await service.completeLesson(bid,boot.lessons[0].id);await service.completeLesson(bid,boot.lessons[0].id);await service.converse(bid,{text:'inventario'});const s=await service.snapshot(bid);assert.equal(s.learning.length,1);assert.equal(s.archetypeId,'pioneros');assert.equal(s.messages.length,2);assert.equal(s.messages[0].role,'usuario');});
 await check('Adjunto y descarga conservan bytes y no modifican saldos',async()=>{const before=(await service.snapshot(bid)).stats,bytes=Buffer.from('%PDF-1.4\nPostgres\n%%EOF');const made=await attachments.createAttachment(bid,mid,{filename:'recibo.pdf',contentType:'application/pdf',base64:bytes.toString('base64')});assert.equal((await attachments.listAttachments(bid,mid)).length,1);assert.equal((await attachments.readAttachment(bid,mid,made.id)).content_base64,bytes.toString('base64'));await attachments.deleteAttachment(bid,mid,made.id);assert.deepEqual((await service.snapshot(bid)).stats,before);});
});
await check('Negocios y archivos ajenos se rechazan con PostgreSQL',()=>identity.withPrincipal(bob,async()=>{assert.equal((await service.bootstrap()).businesses.length,0);await assert.rejects(()=>service.snapshot(bid),e=>e.status===404);await assert.rejects(()=>attachments.listAttachments(bid,mid),e=>e.status===404);}));
await check('Sesiones guardan fechas en milisegundos sin desbordar INTEGER',async()=>{const token=await auth.createSession(alice);assert.equal((await auth.sessionPrincipal(token)).id,alice.id);await auth.revokeSession(token);assert.equal(await auth.sessionPrincipal(token),null);});
await check('Reintento SERIALIZABLE y liberación de la conexión',async()=>{globalThis.pgTest.failSerializable=1;await db.transaction(async()=>{await db.run('UPDATE businesses SET name=? WHERE id=?','Nombre actualizado',bid);});assert.equal((await db.one('SELECT name FROM businesses WHERE id=?',bid)).name,'Nombre actualizado');assert.equal(globalThis.pgTest.events.filter(e=>e==='connect').length,globalThis.pgTest.events.filter(e=>e==='release').length);});
await check('Valores parametrizados y enteros seguros',async()=>{assert.equal(sql.postgresSql("SELECT '?' AS literal, ? AS valor"),"SELECT '?' AS literal, $1 AS valor");assert.equal(sql.safeInteger('123'),123);assert.throws(()=>sql.safeInteger('9007199254740993'));const hostile="x'; DROP TABLE users; --";await db.run('UPDATE businesses SET name=? WHERE id=?',hostile,bid);assert.equal((await db.one('SELECT name FROM businesses WHERE id=?',bid)).name,hostile);assert.equal((await db.rows('SELECT id FROM users')).length,2);});
await db.closeDatabase();await engine.close();
await check('Migración transaccional conserva hashes, orden y rechaza destino ocupado',async()=>{
 const old=new DatabaseSync(resolve(directory,'migration.sqlite'));const seed=await load('sqlite');
 process.env.AUTH_MODE='local';process.env.LOCAL_DB_PATH=resolve(directory,'migration.sqlite');seed.database();
 const target=await PGlite.create();const client={query:async(sql,params)=>{if(!params){const results=await target.exec(sql);return results.at(-1)??{rows:[]};}return target.query(sql,params);}};
 const migrated=await migrateSqlite(old,client,POSTGRES_SCHEMA);assert(migrated.every(t=>t.verified));assert.equal(migrated.find(t=>t.table==='businesses').rows,1);await assert.rejects(()=>migrateSqlite(old,client,POSTGRES_SCHEMA),/destino contiene datos/);assert.equal(Number((await target.query('SELECT COUNT(*) AS n FROM businesses')).rows[0].n),1);old.close();await target.close();
});await mkdir('evidencias',{recursive:true});await writeFile('evidencias/pruebas-postgresql-locales.json',JSON.stringify({fechaUTC:new Date().toISOString(),alcance:'Motor PostgreSQL PGlite local; transporte pg adaptado solo en la prueba. Sin Azure. No valida red, certificados o capacidad de Azure.',resultados:results},null,2));console.log(results.length+' pruebas PostgreSQL aprobadas, sin Azure.');
