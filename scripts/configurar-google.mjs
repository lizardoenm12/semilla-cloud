import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const args=process.argv.slice(2),input=args[0];
if(!input||input.startsWith('--')){console.error('Uso: node scripts/configurar-google.mjs "ruta-al-client-secret.json" [--owner-sub SUB_VERIFICADO]');process.exit(1);}
try{
 const document=JSON.parse(await readFile(resolve(input),'utf8')),web=document.web;
 if(!web||!/^\d+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(web.client_id??'')||typeof web.client_secret!=='string'||web.client_secret.length<16||/[\r\n\0]/.test(web.client_secret))throw Error('El archivo no contiene un cliente OAuth válido de tipo Aplicación web.');
 const base='http://localhost:3010',callback=base+'/api/auth/callback';
 if(!Array.isArray(web.redirect_uris)||!web.redirect_uris.includes(callback))throw Error('Agrega '+callback+' a las URI de redirección autorizadas del cliente y descarga su JSON nuevamente.');
 const envPath=resolve('.env.local');let original='';try{original=await readFile(envPath,'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
 const values={AUTH_MODE:'google',AUTH_BASE_URL:base,GOOGLE_CLIENT_ID:web.client_id,GOOGLE_CLIENT_SECRET:web.client_secret};
 const ownerIndex=args.indexOf('--owner-sub');if(ownerIndex>=0){const sub=args[ownerIndex+1];if(!sub||!/^[A-Za-z0-9_-]{1,255}$/.test(sub))throw Error('El sub del propietario no es válido.');values.AUTH_LEGACY_GOOGLE_SUB=sub;}
 let output=original;
 for(const [key,value] of Object.entries(values)){output=output.replace(new RegExp('^'+key+'=.*\\n?','gm'),'').trimEnd()+'\n'+key+'='+JSON.stringify(value)+'\n';}
 // Respaldo privado. El JSON descargado, .env.local y .data están excluidos de Git.
 if(original){const backups=resolve('.data/backups');await mkdir(backups,{recursive:true});await copyFile(envPath,resolve(backups,'config-before-google-'+Date.now()+'.private.env'));}
 await writeFile(envPath,output,'utf8');console.log('Google configurado en .env.local sin mostrar secretos. Reinicia la app y abre '+base+'.');
}catch(error){console.error(error.message);process.exitCode=1;}
