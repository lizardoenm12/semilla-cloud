import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
process.loadEnvFile('.env.local');
const vault=process.env.AZURE_KEY_VAULT_NAME;
if(vault!=='kv-cloud-lizardo-dev')throw Error('Almacén de desarrollo no esperado');
const entries=[['DATABASE_URL','asistente-postgresql-url'],['GOOGLE_CLIENT_SECRET','asistente-google-client-secret']];
for(const [key] of entries)if(!process.env[key])throw Error('Falta credencial local para transferir');
const original=await readFile('.env.local','utf8');
await mkdir('.data/backups',{recursive:true});await mkdir('.data/private',{recursive:true});
await writeFile(resolve('.data/backups',`antes-keyvault-${Date.now()}.private.env`),original,{mode:0o600});
const cli=process.platform==='win32'?'C:\\Program Files\\Microsoft SDKs\\Azure\\CLI2\\python.exe':'az';
for(const [key,name] of entries){
 const file=resolve('.data/private',randomUUID()+'.secret');
 try{
  await writeFile(file,process.env[key],{mode:0o600});
  // Solo ruta y nombre en argv. El valor nunca aparece en consola ni argumentos.
  const args=['keyvault','secret','set','--vault-name',vault,'--name',name,'--file',file,'--encoding','utf-8','--output','none','--only-show-errors'];
  const result=spawnSync(cli,process.platform==='win32'?['-m','azure.cli',...args]:args,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:90000});
  if(result.status!==0)throw Error('No se pudo guardar el secreto en Key Vault; configuración local conservada');
 }finally{await unlink(file).catch(()=>{});}
}
let content=original;
for(const [key,name] of entries){content=content.replace(new RegExp('^'+key+'=.*(?:\\r?\\n|$)','gm'),'').replace(new RegExp('^'+key+'_KEY_VAULT_SECRET=.*(?:\\r?\\n|$)','gm'),'');content+='\n'+key+'_KEY_VAULT_SECRET='+name+'\n';}
await writeFile('.env.local',content,{mode:0o600});
console.log('Dos secretos guardados en Key Vault; .env.local contiene referencias. Respaldo privado conservado.');
