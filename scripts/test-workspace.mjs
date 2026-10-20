import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
const directory=resolve('tmp/tests',randomUUID());await mkdir(directory,{recursive:true});
const db=resolve(directory,'test.sqlite'), base='http://127.0.0.1:3213',results=[];
let server,logs='';
async function start(mode='local'){
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3213'],{env:{...process.env,APP_MODE:mode,LOCAL_DB_PATH:db,NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe']});
 await new Promise((yes,no)=>{const timeout=setTimeout(()=>no(new Error('El servidor no inició')),25000);server.once('error',no);server.once('exit',()=>{clearTimeout(timeout);no(new Error('El servidor terminó antes de iniciar'));});server.stdout.on('data',b=>{logs+=b; if(b.toString().includes('Ready')){clearTimeout(timeout);yes();}});server.stderr.on('data',b=>logs+=b);});
}
async function stop(){if(server&&server.exitCode===null){server.kill();await once(server,'exit');}}
async function request(path,body,method='POST',expected=200,origin=base){const response=await fetch(base+'/api/local/'+path,body===undefined?{headers:{}}:{method,headers:{'Content-Type':'application/json','Origin':origin},body:JSON.stringify(body)});const payload=await response.json();assert.equal(response.status,expected,`${path}: ${JSON.stringify(payload)}`);return payload;}
async function check(name,fn){await fn();results.push({prueba:name,ok:true});console.log('OK '+name);}
try{
 await start();
 const boot=await request('bootstrap');const id=boot.businesses[0].id,path='businesses/'+id;
 const initial=await request(path);const agua=initial.products.find(p=>p.sku==='AGUA');
 await check('Semilla local con inventario y sin ventas ficticias',async()=>{assert.equal(agua.stock,24);assert.equal(initial.stats.movements,0);assert.equal(boot.archetypes.length,4);});
 const made=await request(path+'/proposals',{text:'Vendí diez aguas a Q5 cada una y gasté Q20 de transporte'},'POST',201);
 await check('Interpretación de venta y gasto con número en palabras',async()=>{assert.equal(made.items.length,2);assert.equal(made.items[0].quantity,10);assert.equal(made.items[0].productId,agua.id);assert.equal(made.items[1].unitPriceCents,2000);});
 await check('Propuesta pendiente no altera dinero ni stock',async()=>{const s=await request(path);assert.equal(s.products.find(p=>p.id===agua.id).stock,24);assert.equal(s.stats.movements,0);});
 const corrected=made.items.map((x,i)=>i===0?{...x,quantity:8}:x);
 await request(`${path}/proposals/${made.id}/confirm`,{items:corrected},'POST',201);
 let state=await request(path);
 await check('Confirmación aplica correcciones, dos movimientos y stock',async()=>{assert.equal(state.stats.sales,4000);assert.equal(state.stats.expenses,2000);assert.equal(state.stats.balance,2000);assert.equal(state.products.find(p=>p.id===agua.id).stock,16);assert.equal(state.movements.length,2);});
 const receipt=await request(`${path}/receipts/${state.movements[0].receipt_id}`);
 await check('Comprobante local recuperable y consistente',async()=>{assert.equal(receipt.businessId,id);assert.equal(receipt.totalCents,state.movements[0].total_cents);});
 await check('No se puede confirmar dos veces',async()=>{await request(`${path}/proposals/${made.id}/confirm`,{items:corrected},'POST',409);assert.equal((await request(path)).stats.movements,2);});
 const rejected=await request(path+'/proposals',{text:'Gasté Q15 de transporte'},'POST',201);await request(`${path}/proposals/${rejected.id}/reject`,{},'POST',201);
 await check('Rechazar no altera los registros',async()=>{await request(`${path}/proposals/${rejected.id}/confirm`,{items:rejected.items},'POST',409);assert.equal((await request(path)).stats.movements,2);});
 const failed=await request(path+'/proposals',{text:'Gasté Q10 de transporte y vendí 999 aguas a Q5'},'POST',201);
 await check('Rollback completo ante stock insuficiente',async()=>{await request(`${path}/proposals/${failed.id}/confirm`,{items:failed.items},'POST',422);const s=await request(path);assert.equal(s.stats.movements,2);assert.equal(s.stats.expenses,2000);assert.equal(s.proposals.find(p=>p.id===failed.id).status,'pendiente');});
 const second=await request('businesses',{name:'Segundo negocio',sector:'Comercio',stage:'idea'},'POST',201);const path2='businesses/'+second.id;
 const secondProduct=await request(path2+'/products',{name:'Agua pura',sku:'AGUA',priceCents:500,stock:2},'POST',201);
 await check('Separación de negocios y productos ajenos rechazados',async()=>{assert.equal((await request(path2)).stats.movements,0);await request(`${path}/proposals/${failed.id}/confirm`,{items:[{type:'venta',description:'Cruce inválido',productId:secondProduct.id,quantity:1,unitPriceCents:500}]},'POST',422);await request(`${path2}/receipts/${receipt.id}`,undefined,'GET',404);});
 await check('Dinero y cantidades deben ser enteros válidos',async()=>{await request(`${path}/proposals/${failed.id}/confirm`,{items:[{type:'gasto',description:'Prueba',productId:null,quantity:1,unitPriceCents:0.5}]},'POST',422);await request(`${path}/proposals/${failed.id}/confirm`,{items:[{type:'venta',description:'Prueba',productId:agua.id,quantity:1.5,unitPriceCents:500}]},'POST',422);});
 const batch=await request(path+'/proposals',{text:'Compré 20 aguas a Q3 y vendí 30 aguas a Q5'},'POST',201);await request(`${path}/proposals/${batch.id}/confirm`,{items:batch.items},'POST',201);
 await check('Compra seguida de venta se evalúa en orden',async()=>{const s=await request(path);assert.equal(s.products.find(p=>p.id===agua.id).stock,6);assert.equal(s.stats.purchases,6000);assert.equal(s.stats.sales,19000);});
 const inventory=await request(path+'/proposals',{text:'Entraron 5 aguas'},'POST',201);await request(`${path}/proposals/${inventory.id}/confirm`,{items:inventory.items},'POST',201);
 await check('Ajuste de inventario no inventa ingresos ni gastos',async()=>{const s=await request(path);assert.equal(s.products.find(p=>p.id===agua.id).stock,11);assert.equal(s.stats.movements,4);});
 const unclear=await request(path+'/proposals',{text:'Hoy pasó algo que no sé cómo registrar'},'POST',201);
 await check('Texto desconocido exige revisión y permite entrada manual',async()=>{assert.equal(unclear.items.length,0);assert(unclear.warnings.length>0);await request(`${path}/proposals/${unclear.id}/confirm`,{items:[]},'POST',422);await request(`${path}/proposals/${unclear.id}/confirm`,{items:[{type:'gasto',description:'Gasto corregido',productId:null,quantity:1,unitPriceCents:700}]},'POST',201);});
 await request(path+'/profile',{archetypeId:'equilibristas'},'POST',201);await request(path+'/profile',{archetypeId:'pioneros'},'POST',201);
 await check('Arquetipo actual e historial de autoelección',async()=>{const s=await request(path);assert.equal(s.archetypeId,'pioneros');assert.equal(s.evaluations.length,2);});
 await request(path+'/diagnostics',{organization:0,records:0,formality:'sin_evaluar'},'POST',201);let diagnosed=await request(path);const action=diagnosed.actions[0];await request(`${path}/actions/${action.id}`,{status:'completada'},'PATCH',200);await request(path+'/diagnostics',{organization:1,records:1,formality:'en_proceso'},'POST',201);
 await check('Diagnósticos históricos y plan sin duplicar ni perder progreso',async()=>{const s=await request(path);assert.equal(s.diagnostics.length,2);assert.equal(s.actions.length,4);assert.equal(s.actions.find(a=>a.id===action.id).status,'completada');assert.equal((await request(path2)).actions.length,0);});
 await request(path+'/learning/registros/complete',{},'POST',201);await request(path+'/learning/registros/complete',{},'POST',201);
 await check('Aprendizaje persistente sin duplicación',async()=>{assert.deepEqual((await request(path)).learning,['registros']);});
 await request(path+'/conversation',{text:'¿Cómo va el inventario?'},'POST',201);
 await check('Conversación local guardada y separada por negocio',async()=>{assert.equal((await request(path)).messages.length,2);assert.equal((await request(path2)).messages.length,0);});
 await check('Etapa y planteamiento editables sin perder historial',async()=>{await request(path2,{stage:'crecimiento',idea:'Una idea revisada'},'PATCH',200);const s=await request(path2);assert.equal(s.business.stage,'crecimiento');assert.equal(s.business.idea,'Una idea revisada');assert.equal(s.products.length,1);});
 const exported=await request(path+'/profile-export');
 await check('Perfil productivo exportable con datos reales locales',async()=>{assert.equal(exported.business.id,id);assert.equal(exported.diagnostics.length,2);assert.equal(exported.mode,'local');});
 await check('Solicitudes con origen ajeno y JSON inválido se rechazan',async()=>{await request(path+'/products',{name:'No permitido'},'POST',403,'https://sitio-ajeno.test');const r=await fetch(base+'/api/local/'+path+'/products',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{'});assert.equal(r.status,400);});
 const attachedMovement=state.movements[0].id, attachmentPath=`${path}/movements/${attachedMovement}/attachments`;
 const fileBytes=Buffer.from("%PDF-1.4\nPrueba local de comprobante\n%%EOF\n");
 let savedAttachment;
 const beforeAttachments=await request(path);
 await check('Adjunto real asociado al movimiento y descargado sin cambios',async()=>{
  savedAttachment=await request(attachmentPath,{filename:'recibo de compra.pdf',contentType:'application/pdf',base64:fileBytes.toString('base64')},'POST',201);
  const listed=await request(attachmentPath);assert.equal(listed.items.length,1);assert.equal(listed.items[0].byte_size,fileBytes.length);assert.equal(listed.items[0].content_base64,undefined);
  const res=await fetch(base+'/api/local/'+attachmentPath+'/'+savedAttachment.id);assert.equal(res.status,200);assert.match(res.headers.get('content-disposition'),/^attachment;/);assert.equal(res.headers.get('x-content-type-options'),'nosniff');assert(Buffer.from(await res.arrayBuffer()).equals(fileBytes));
  assert.deepEqual((await request(path)).stats,beforeAttachments.stats);
 });
 await check('Adjuntos de otro negocio y movimiento inexistente rechazados',async()=>{
  await request(`${path2}/movements/${attachedMovement}/attachments`,undefined,'GET',404);
  await request(`${path2}/movements/${attachedMovement}/attachments/${savedAttachment.id}`,undefined,'GET',404);
  await request(`${path2}/movements/${attachedMovement}/attachments/${savedAttachment.id}`,{},'DELETE',404);
  await request(`${path}/movements/no-existe/attachments`,{filename:'prueba.pdf',contentType:'application/pdf',base64:fileBytes.toString('base64')},'POST',404);
 });
 await check('Duplicados, tipo falso, base64 y nombres peligrosos rechazados',async()=>{
  await request(attachmentPath,{filename:'otro.pdf',contentType:'application/pdf',base64:fileBytes.toString('base64')},'POST',409);
  await request(attachmentPath,{filename:'falso.png',contentType:'image/png',base64:Buffer.from('<html>ejemplo</html>').toString('base64')},'POST',415);
  await request(attachmentPath,{filename:'archivo.pdf',contentType:'application/pdf',base64:'%%%INVALIDO'},'POST',422);
  await request(attachmentPath,{filename:'../archivo.pdf',contentType:'application/pdf',base64:fileBytes.toString('base64')},'POST',422);
  await request(attachmentPath,{filename:'archivo.png',contentType:'application/pdf',base64:fileBytes.toString('base64')},'POST',415);
  await request(attachmentPath,{filename:'archivo.pdf',contentType:'application/pdf',base64:fileBytes.toString('base64')},'POST',403,'https://otro.test');
 });
 await check('Adjunto mayor de 2 MiB rechazado sin guardarlo',async()=>{
  await request(attachmentPath,{filename:'grande.pdf',contentType:'application/pdf',base64:Buffer.alloc(2*1024*1024+1,65).toString('base64')},'POST',413);
  assert.equal((await request(attachmentPath)).items.length,1);
 });
 await check('Límite de cinco archivos y eliminación sin alterar movimientos',async()=>{
  for(let n=0;n<4;n++)await request(attachmentPath,{filename:`extra${n}.pdf`,contentType:'application/pdf',base64:Buffer.from(`%PDF-1.4\n${n}\n%%EOF`).toString('base64')},'POST',201);
  await request(attachmentPath,{filename:'extra.pdf',contentType:'application/pdf',base64:Buffer.from('%PDF-1.4\nextra\n%%EOF').toString('base64')},'POST',409);
  const items=(await request(attachmentPath)).items;await request(attachmentPath+'/'+items.find(i=>i.id!==savedAttachment.id).id,{},'DELETE',200);
  assert.equal((await request(attachmentPath)).items.length,4);assert.deepEqual((await request(path)).stats,beforeAttachments.stats);
 });
 const before=await request(path);await stop();await start();
 await check('Persistencia real después de reiniciar el servidor',async()=>{const after=await request(path);assert.deepEqual(after.stats,before.stats);assert.equal(after.products.find(p=>p.id===agua.id).stock,11);assert.equal(after.messages.length,2);});
 await check('Adjuntos conservados tras reiniciar y esquema actualizado sin perder datos',async()=>{assert.equal((await request(attachmentPath)).items.length,4);const res=await fetch(base+'/api/local/'+attachmentPath+'/'+savedAttachment.id);assert(Buffer.from(await res.arrayBuffer()).equals(fileBytes));});
 // La UI se verifica opcionalmente con el Playwright disponible en el entorno.
 if(process.env.PLAYWRIGHT_PATH){const {chromium}=await import(process.env.PLAYWRIGHT_PATH);const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE});try{const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base);await page.getByRole('heading',{name:/Así va Tienda La Ceiba/}).waitFor();await page.screenshot({path:'evidencias/semilla-resumen.png',fullPage:true});await page.getByRole('button',{name:'Contar mi día',exact:true}).click();await page.getByLabel('¿Qué vendiste, gastaste o recibiste?').fill('Vendí 2 aguas a Q5 cada una');await page.getByRole('button',{name:'Preparar propuesta'}).click();await page.getByRole('heading',{name:'¿Lo entendimos bien?'}).waitFor();await page.screenshot({path:'evidencias/semilla-propuesta.png',fullPage:true});await page.getByRole('button',{name:'Confirmar y actualizar mi negocio'}).click();await page.getByRole('status').filter({hasText:'Guardamos'}).waitFor();await page.getByRole('button',{name:'Movimientos y comprobantes',exact:true}).click();await page.getByRole('heading',{name:'Movimientos y comprobantes.'}).waitFor();await page.getByRole('button',{name:'Ver comprobantes',exact:true}).first().click();await page.getByLabel('Seleccionar comprobante').setInputFiles({name:'foto-prueba.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')});await page.getByRole('button',{name:'Adjuntar comprobante',exact:true}).click();await page.getByRole('status').filter({hasText:'Comprobante adjuntado'}).waitFor();await page.getByRole('link',{name:'Descargar',exact:true}).waitFor();await page.screenshot({path:'evidencias/movimientos-comprobantes.png',fullPage:true});await page.getByRole('button',{name:'Perfil productivo',exact:true}).click();await page.getByRole('heading',{name:'Conoce desde dónde empiezas.'}).waitFor();await page.screenshot({path:'evidencias/semilla-perfil.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Mi resumen',exact:true}).click();await page.getByRole('heading',{name:/Así va Tienda/}).waitFor();await page.getByRole('button',{name:'Movimientos y comprobantes',exact:true}).click();await page.getByRole('heading',{name:'Movimientos y comprobantes.'}).waitFor();await page.screenshot({path:'evidencias/movimientos-movil.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false,'Sin desborde horizontal en móvil');assert.deepEqual(errors,[]);results.push({prueba:'Navegador: navegar, proponer, confirmar, perfil y móvil sin errores',ok:true});}finally{await browser.close();}}
 await stop();await start('');
 await check('API local deshabilitada fuera del modo local',async()=>{await request('bootstrap',undefined,'GET',404);});
 await writeFile('evidencias/pruebas-workspace.json',JSON.stringify({fechaUTC:new Date().toISOString(),alcance:'SQLite local y HTTP, sin Azure ni IA',resultados:results},null,2));
 console.log(`${results.length} comprobaciones aprobadas`);
}catch(error){console.error(error);console.error(logs.slice(-3500));process.exitCode=1;}finally{await stop();}
