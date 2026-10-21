import {Client} from 'pg';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
const root=resolve(process.env.PROJECT_ROOT??'.');const config=JSON.parse(await readFile(resolve(root,'.data/private/postgres-admin.json'),'utf8'));
const client=new Client({host:config.host,user:config.admin,password:config.password,database:config.database,port:5432,connectionTimeoutMillis:15000,ssl:{rejectUnauthorized:true}});
try{
 await client.connect();const existing=await client.query("SELECT 1 FROM pg_roles WHERE rolname='asistente_app'");
 const destination=resolve(root,'.data/private/postgres-runtime.json');
 if(existing.rows.length){await readFile(destination,'utf8');console.log('Rol de aplicación ya preparado; credencial privada conservada.');}
 else{
  const password='App!'+randomBytes(28).toString('base64url');await client.query('BEGIN');
  try{await client.query("CREATE ROLE asistente_app LOGIN PASSWORD '"+password.replaceAll("'","''")+"'");await client.query('GRANT CONNECT ON DATABASE negocios TO asistente_app');await client.query('GRANT USAGE ON SCHEMA public TO asistente_app');await client.query('GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO asistente_app');await client.query('GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO asistente_app');await client.query('COMMIT');}catch(error){await client.query('ROLLBACK');throw error;}
  const url=new URL('postgresql://'+config.host+'/'+config.database);url.username='asistente_app';url.password=password;
  await writeFile(destination,JSON.stringify({url:url.href,host:config.host,database:config.database,role:'asistente_app'}));console.log('Rol de aplicación con permisos de datos preparado; contraseña guardada privadamente.');
 }
}catch(error){console.error('No se completó el rol de aplicación:',error.code??error.name);process.exitCode=1;}finally{await client.end().catch(()=>{});}
