import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const token = randomBytes(32).toString("hex");
const env = { ...process.env, APP_MODE: "cloud-demo", DEMO_TOKEN: token, AZURE_STORAGE_ACCOUNT: "stclouddevlizardo01", AZURE_STORAGE_CONTAINER: "comprobantes", AZURE_KEY_VAULT_NAME: "kv-cloud-lizardo-dev", AZURE_KEY_VAULT_PROBE_SECRET: "prueba-conexion", NEXT_TELEMETRY_DISABLED: "1" };
delete env.AZURE_CLIENT_ID;
const cli = "C:/Program Files/Microsoft SDKs/Azure/CLI2/wbin";
env.PATH = cli + ";" + (env.PATH ?? env.Path ?? "");
env.Path = env.PATH;
const server=spawn(process.execPath,["node_modules/next/dist/bin/next","start","--hostname","127.0.0.1","--port","3215"],{env,stdio:["ignore","pipe","pipe"]});
let logs="";server.stdout.on("data",b=>logs+=b.toString());server.stderr.on("data",b=>logs+=b.toString());
try {
 await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error("Inicio del servidor agotado")),30000);server.once("error",reject);server.stdout.on("data",b=>{if(b.toString().includes("Ready")){clearTimeout(t);resolve();}});});
 const headers={Authorization:`Bearer ${token}`};
 const base="http://127.0.0.1:3215";
 const stateResponse=await fetch(base+"/api/estado",{headers,signal:AbortSignal.timeout(120000)});
 const state=await stateResponse.json();
 assert.equal(stateResponse.status,200);assert.equal(state.storage.ok,true,"Blob listado real");assert.equal(state.keyVault.ok,true,"Lectura real Key Vault");assert.equal(state.identity.modo,"developer-session");
 const createdResponse=await fetch(base+"/api/comprobantes",{method:"POST",headers,signal:AbortSignal.timeout(90000)});
 const created=await createdResponse.json();assert.equal(createdResponse.status,201,"Crear comprobante real");assert.equal(created.comprobante.total_gtq,50);
 const readResponse=await fetch(base+"/api/comprobantes?id="+created.comprobante.id,{headers,signal:AbortSignal.timeout(90000)});
 const read=await readResponse.json();assert.equal(readResponse.status,200);assert.deepEqual(read.comprobante,created.comprobante);
 const unauthorized=await fetch(base+"/api/estado");assert.equal(unauthorized.status,401);
 const evidence={fechaUTC:new Date().toISOString(),alcance:"Backend Next.js ejecutado en equipo local con sesión Azure CLI; recursos reales de Azure. No ejecutado en Container Apps.",autenticacion:"Microsoft Entra ID mediante sesión de desarrollo Azure CLI; identidad administrada aún no probada en ejecución",storage:{account:state.storage.account,container:state.storage.container,listado:true,escritura:true,lectura:true,objetoPrueba:created.objeto},keyVault:{vault:"kv-cloud-lizardo-dev",secreto:"prueba-conexion",lectura:true,valorExpuesto:false},apiSinToken:unauthorized.status,containerApps:false,postgresql:false,resultado:"aprobado"};
 await writeFile("evidencias/conexion-azure-real-2026-10-19.json",JSON.stringify(evidence,null,2));
 console.log(JSON.stringify(evidence,null,2));
} catch(e) { console.error(e.message); console.error(logs.slice(-3500));process.exitCode=1; }
finally {server.kill();}
