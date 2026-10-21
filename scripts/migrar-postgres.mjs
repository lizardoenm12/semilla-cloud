import {DatabaseSync,backup} from 'node:sqlite';
import {Client,types} from 'pg';
import {mkdir,readFile,writeFile,open,unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {POSTGRES_SCHEMA} from '../src/lib/postgres/schema.ts';
import {migrateSqlite} from './lib/migracion-postgres.mjs';
const root=resolve(process.env.PROJECT_ROOT??'.'),sourcePath=resolve(root,process.env.LOCAL_DB_PATH??'.data/negocios.sqlite');
const lockPath=sourcePath+'.migration-lock';let lock,source,client,guard;let success=false;
try{
 const config=JSON.parse(await readFile(resolve(root,'.data/private/postgres-admin.json'),'utf8'));
 const local=['localhost','127.0.0.1'].includes(config.host);if(!local&&!config.host.endsWith('.postgres.database.azure.com'))throw Error('Servidor destino no permitido');
 lock=await open(lockPath,'wx');await lock.writeFile('Migración PostgreSQL en curso. No borrar durante la migración.');
 guard=new DatabaseSync(sourcePath);guard.exec('BEGIN IMMEDIATE');source=new DatabaseSync(sourcePath,{readOnly:true});await mkdir(resolve(root,'.data/backups'),{recursive:true});
 const backupName='antes-postgres-'+Date.now()+'.sqlite';await backup(source,resolve(root,'.data/backups',backupName));
 client=new Client({host:config.host,user:config.admin,password:config.password,database:config.database,port:5432,connectionTimeoutMillis:15000,ssl:local?false:{rejectUnauthorized:true},types:{getTypeParser:(oid,format)=>oid===20?x=>{const n=Number(x);if(!Number.isSafeInteger(n))throw Error('Entero fuera de rango');return n;}:types.getTypeParser(oid,format)}});
 await client.connect();const tables=await migrateSqlite(source,client,POSTGRES_SCHEMA);
 const report={fechaUTC:new Date().toISOString(),source:'SQLite local, copia consistente',target:config.host,database:config.database,backup:'.data/backups/'+backupName,tables,verified:true,activated:false};
 await mkdir(resolve(root,'evidencias'),{recursive:true});await writeFile(resolve(root,'evidencias/migracion-postgresql.json'),JSON.stringify(report,null,2));
 success=true;console.log(JSON.stringify({verified:true,tables:tables.length,rows:tables.reduce((n,t)=>n+t.rows,0),activated:false}));
}catch(error){console.error(error.code??(error.message.startsWith('El destino')?error.message:'No se completó la migración; SQLite sigue siendo la fuente activa.'));process.exitCode=1;}
finally{if(source)source.close();if(guard){guard.exec("ROLLBACK");guard.close();}if(client)await client.end().catch(()=>{});if(lock){await lock.close();if(!success||!process.argv.includes("--keep-lock"))await unlink(lockPath);}}
