import { AsyncLocalStorage } from "node:async_hooks";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Pool,types,type PoolClient } from "pg";
import * as sqlite from "./sqlite";
import { postgresSql,safeInteger } from "./postgres-sql";
type Scalar=string|number|null;
type Connection={driver:"sqlite"}|{driver:"postgres";client:PoolClient};
const context=new AsyncLocalStorage<Connection>();
const state=globalThis as typeof globalThis & { businessPgPool?:Pool; sqliteQueue?:Promise<unknown> };
export const LOCAL_USER=sqlite.LOCAL_USER;
export type DbRow=Record<string,string|number|null>;
export function databaseProvider(){const provider=process.env.DATABASE_PROVIDER??"sqlite";if(provider!=="sqlite"&&provider!=="postgres")throw new Error("DATABASE_PROVIDER inválido");return provider;}
export function maintenance(){return existsSync(resolve(/* turbopackIgnore: true */ process.env.LOCAL_DB_PATH??".data/negocios.sqlite")+".migration-lock");}
function writable(){if(maintenance()&&process.env.DATABASE_MIGRATION_PROCESS!=="1")throw new Error("Base de datos en mantenimiento");}
function pool(){
 if(process.env.APP_MODE!=="local")throw new Error("Modo de aplicación deshabilitado");
 if(state.businessPgPool)return state.businessPgPool;
 const raw=process.env.DATABASE_URL;if(!raw)throw new Error("Falta DATABASE_URL");
 const url=new URL(raw);if(!["postgres:","postgresql:"].includes(url.protocol))throw new Error("DATABASE_URL inválida");
 // No permitir que parámetros de la URL reemplacen la validación TLS.
 for(const key of ['sslmode','sslcert','sslkey','sslrootcert'])if(url.searchParams.has(key))throw new Error("Configura TLS en el servidor, sin parámetros ssl en DATABASE_URL");
 const local=["localhost","127.0.0.1","[::1]"].includes(url.hostname);
 const client=new Pool({connectionString:raw,max:4,connectionTimeoutMillis:15000,idleTimeoutMillis:30000,statement_timeout:15000,application_name:"asistente-negocios",ssl:local?false:{rejectUnauthorized:true},types:{getTypeParser:(oid,format)=>oid===20?safeInteger:types.getTypeParser(oid,format)}});
 client.on("error",()=>console.error("postgres_pool_error"));state.businessPgPool=client;return client;
}
async function sqliteExclusive<T>(action:()=>Promise<T>|T):Promise<T>{
 const previous=state.sqliteQueue??Promise.resolve();let release!:()=>void;const next=new Promise<void>(r=>{release=r;});state.sqliteQueue=previous.catch(()=>{}).then(()=>next);
 await previous.catch(()=>{});try{return await action();}finally{release();}
}
export async function rows<T>(sql:string,...values:Scalar[]):Promise<T[]>{
 const connection=context.getStore();
 if(databaseProvider()==="sqlite")return connection?.driver==="sqlite"?sqlite.rows<T>(sql,...values):sqliteExclusive(()=>sqlite.rows<T>(sql,...values));
 const result=await (connection?.driver==="postgres"?connection.client:pool()).query(postgresSql(sql),values);return result.rows as T[];
}
export async function one<T>(sql:string,...values:Scalar[]):Promise<T|undefined>{return (await rows<T>(sql,...values))[0];}
export async function run(sql:string,...values:Scalar[]):Promise<{changes:number}>{
 writable();const connection=context.getStore();
 if(databaseProvider()==="sqlite"){
  const result=connection?.driver==="sqlite"?sqlite.run(sql,...values):await sqliteExclusive(()=>sqlite.run(sql,...values));return {changes:Number(result.changes)};
 }
 const result=await (connection?.driver==="postgres"?connection.client:pool()).query(postgresSql(sql),values);return {changes:result.rowCount??0};
}
export async function transaction<T>(action:()=>T|Promise<T>):Promise<T>{
 writable();if(context.getStore())return action();
 if(databaseProvider()==="sqlite")return sqliteExclusive(async()=>{
  const db=sqlite.database();db.exec("BEGIN IMMEDIATE");
  try{const result=await context.run({driver:"sqlite"},action);db.exec("COMMIT");return result;}catch(error){db.exec("ROLLBACK");throw error;}
 });
 for(let attempt=0;;attempt++){
  const client=await pool().connect();
  try{await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");const result=await context.run({driver:"postgres",client},action);await client.query("COMMIT");return result;}
  catch(error){await client.query("ROLLBACK").catch(()=>{});const code=(error as {code?:string}).code;if(!["40001","40P01"].includes(code??"")||attempt>=2)throw error;}
  finally{client.release();}
 }
}
export async function closeDatabase(){if(state.businessPgPool){await state.businessPgPool.end();state.businessPgPool=undefined;}}
