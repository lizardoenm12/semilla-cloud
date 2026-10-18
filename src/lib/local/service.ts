import { randomUUID } from "node:crypto";
import { ARCHETYPES, LESSONS, type Business, type Product, type DraftEntry, type Proposal, type Movement, type Snapshot, type Action, type Diagnostic } from "./contracts";
import { LOCAL_USER, one, rows, run, transaction } from "./db";
import { interpret } from "./parser";
export class LocalError extends Error { constructor(message: string, public status = 422) { super(message); } }
const now = () => new Date().toISOString();
export function text(value: unknown, label: string, max=200, allowEmpty=false): string {
 if(typeof value!=="string" || (!allowEmpty && !value.trim()) || value.length>max) throw new LocalError(`${label}: escribe un texto vÃ¡lido de hasta ${max} caracteres.`);
 return value.trim();
}
export function integer(value: unknown, label: string, min=0, max=100000000): number {
 if(typeof value!=="number" || !Number.isSafeInteger(value) || value<min || value>max) throw new LocalError(`${label}: valor fuera del rango permitido.`);
 return value;
}
export function business(id: string): Business {
 const result=one<Business>("SELECT b.* FROM businesses b JOIN memberships m ON m.business_id=b.id WHERE b.id=? AND m.user_id=? AND m.active=1",id,LOCAL_USER);
 if(!result) throw new LocalError("Negocio no encontrado o sin acceso.",404);
 return result;
}
export function products(id: string): Product[] {
 return rows<Product>("SELECT p.*,COALESCE(SUM(i.quantity_delta),0) AS stock FROM products p LEFT JOIN inventory_entries i ON i.product_id=p.id AND i.business_id=p.business_id WHERE p.business_id=? GROUP BY p.id ORDER BY p.name",id);
}
export function bootstrap() {
 return {user:{id:LOCAL_USER,name:"Emprendedor local"},businesses:rows<Business>("SELECT b.* FROM businesses b JOIN memberships m ON m.business_id=b.id WHERE m.user_id=? AND m.active=1 ORDER BY b.created_at",LOCAL_USER),archetypes:ARCHETYPES,lessons:LESSONS,mode:"local"};
}
export function snapshot(id: string): Snapshot {
 const b=business(id);
 const raw=rows<{id:string;text:string;status:Proposal["status"];original_items:string;confirmed_items:string|null;warnings:string;created_at:string}>("SELECT * FROM proposals WHERE business_id=? ORDER BY created_at DESC,rowid DESC LIMIT 20",id);
 const stats=one<{sales:number;expenses:number;purchases:number;movements:number}>("SELECT COALESCE(SUM(CASE WHEN type='venta' THEN total_cents ELSE 0 END),0) AS sales,COALESCE(SUM(CASE WHEN type='gasto' THEN total_cents ELSE 0 END),0) AS expenses,COALESCE(SUM(CASE WHEN type='compra' THEN total_cents ELSE 0 END),0) AS purchases,COUNT(*) AS movements FROM movements WHERE business_id=?",id)!;
 const chart=[];
 for(let offset=6;offset>=0;offset--){const date=new Date(Date.now()-offset*86400000); const day=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Guatemala"}).format(date); chart.push({day,sales:0,expenses:0});}
 for(const movement of rows<{created_at:string;type:string;total_cents:number}>("SELECT created_at,type,total_cents FROM movements WHERE business_id=? AND created_at>=?",id,new Date(Date.now()-8*86400000).toISOString())){
  const day=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Guatemala"}).format(new Date(movement.created_at));const bucket=chart.find(c=>c.day===day);
  if(bucket){if(movement.type==="venta")bucket.sales+=movement.total_cents;else bucket.expenses+=movement.total_cents;}
 }
 return {business:b,products:products(id),proposals:raw.map(p=>({id:p.id,text:p.text,status:p.status,items:JSON.parse(p.confirmed_items??p.original_items),warnings:JSON.parse(p.warnings),created_at:p.created_at})),
  movements:rows<Movement>("SELECT m.*,r.id AS receipt_id FROM movements m LEFT JOIN receipts r ON r.movement_id=m.id WHERE m.business_id=? ORDER BY m.created_at DESC,m.rowid DESC LIMIT 40",id),
  actions:rows<Action>("SELECT id,title,reason,status FROM plan_actions WHERE business_id=? ORDER BY rowid",id),
  diagnostics:rows<Diagnostic>("SELECT * FROM diagnostics WHERE business_id=? ORDER BY created_at DESC,rowid DESC LIMIT 20",id),
  archetypeId:one<{archetype_id:string}>("SELECT archetype_id FROM entrepreneur_profiles WHERE user_id=?",LOCAL_USER)?.archetype_id??null,
  evaluations:rows("SELECT archetype_id,created_at FROM archetype_evaluations WHERE user_id=? ORDER BY created_at DESC,rowid DESC LIMIT 20",LOCAL_USER),
  learning:rows<{lesson_id:string}>("SELECT lesson_id FROM learning_progress WHERE user_id=?",LOCAL_USER).map(x=>x.lesson_id),
  messages:rows("SELECT * FROM (SELECT m.id,m.role,m.content,m.created_at,m.rowid AS sequence FROM messages m JOIN conversations c ON c.id=m.conversation_id WHERE c.business_id=? AND c.user_id=? ORDER BY m.rowid DESC LIMIT 50) ORDER BY sequence",id,LOCAL_USER),
  stats:{...stats,balance:stats.sales-stats.expenses-stats.purchases},chart};
}
export function createBusiness(body: Record<string,unknown>) {
 const name=text(body.name,"Nombre"),sector=text(body.sector,"Actividad"),stage=text(body.stage,"Etapa");
 if(!["idea","en_marcha","crecimiento"].includes(stage))throw new LocalError("Selecciona una etapa vÃ¡lida.");
 const idea=text(body.idea??"","Idea",1000,true),customer=text(body.customer??"","Clientes",1000,true),value=text(body.value??"","Propuesta de valor",1000,true);
 return transaction(()=>{const id=randomUUID();run("INSERT INTO businesses VALUES (?,?,?,?,?,?,?,?)",id,name,sector,stage,idea,customer,value,now());run("INSERT INTO memberships VALUES (?,?,?,1)",id,LOCAL_USER,"propietario");return {id};});
}
export function createProduct(id:string,body:Record<string,unknown>) {
 business(id); const name=text(body.name,"Producto"),sku=text(body.sku,"CÃ³digo",40),price=integer(body.priceCents,"Precio"),stock=integer(body.stock??0,"Existencias",0,1000000),minimum=integer(body.minStock??5,"MÃ­nimo",0,1000000);
 if(one("SELECT 1 FROM products WHERE business_id=? AND sku=?",id,sku))throw new LocalError("Ya existe ese cÃ³digo en este negocio.",409);
 return transaction(()=>{const productId=randomUUID();run("INSERT INTO products VALUES (?,?,?,?,?,?)",productId,id,name,sku,price,minimum);if(stock)run("INSERT INTO inventory_entries VALUES (?,?,?,?,?,?,?,?,?)",randomUUID(),id,productId,null,null,null,stock,"inicial",now());return {id:productId};});
}
export function createProposal(id:string,body:Record<string,unknown>) {
 business(id);const original=text(body.text,"Lo que ocurriÃ³",3000);const parsed=interpret(original,products(id));const proposalId=randomUUID();run("INSERT INTO proposals VALUES (?,?,?,?,?,?,?,?,?,?)",proposalId,id,LOCAL_USER,original,"pendiente",JSON.stringify(parsed.items),null,JSON.stringify(parsed.warnings),now(),null);
 return {id:proposalId,...parsed};
}
function proposal(id:string,proposalId:string){business(id);const p=one<{status:string;original_items:string}>("SELECT status,original_items FROM proposals WHERE business_id=? AND id=?",id,proposalId);if(!p)throw new LocalError("Propuesta no encontrada.",404);if(p.status!=="pendiente")throw new LocalError("Esta propuesta ya fue confirmada o rechazada.",409);return p;}
export function rejectProposal(id:string,proposalId:string){return transaction(()=>{proposal(id,proposalId);run("UPDATE proposals SET status='rechazada' WHERE id=?",proposalId);return {ok:true};});}
function validateItems(value:unknown): DraftEntry[]{
 if(!Array.isArray(value)||value.length<1||value.length>30)throw new LocalError("Agrega entre 1 y 30 registros antes de confirmar.");
 return value.map((raw:unknown)=>{if(!raw||typeof raw!=="object")throw new LocalError("Registro invÃ¡lido.");const item=raw as Record<string,unknown>;const type=text(item.type,"Tipo");if(!["venta","gasto","compra","inventario"].includes(type))throw new LocalError("Tipo de operaciÃ³n invÃ¡lido.");const quantity=integer(item.quantity,"Cantidad",type==="inventario"?-1000000:1,1000000);if(quantity===0)throw new LocalError("La cantidad no puede ser cero.");const price=integer(item.unitPriceCents,"Precio");if(type!=="inventario" && quantity*price>1000000000)throw new LocalError("El importe supera el lÃ­mite de esta versiÃ³n.");return {type:type as DraftEntry["type"],description:text(item.description,"DescripciÃ³n",500),quantity,unitPriceCents:type==="inventario"?0:price,productId:type==="gasto"?null:text(item.productId,"Producto")};});
}
export function confirmProposal(id:string,proposalId:string,value:unknown){
 const items=validateItems(value);
 return transaction(()=>{
  proposal(id,proposalId); const current=products(id),balances=new Map(current.map(p=>[p.id,p.stock]));
  // Simular toda la secuencia antes de escribir, incluida una compra seguida de venta.
  for(const item of items){if(item.type==="gasto")continue;const product=current.find(p=>p.id===item.productId);if(!product)throw new LocalError("El producto no pertenece a este negocio.");const delta=item.type==="venta"?-item.quantity:item.quantity;const next=balances.get(product.id)!+delta;if(next<0)throw new LocalError(`No hay existencias suficientes de ${product.name}.`);balances.set(product.id,next);}
  const created=now(),ids:string[]=[];
  for(const item of items){
   let movementId:string|null=null;
   if(item.type!=="inventario"){
    movementId=randomUUID();const total=item.quantity*item.unitPriceCents;run("INSERT INTO movements VALUES (?,?,?,?,?,?,?,?)",movementId,id,LOCAL_USER,proposalId,item.type,item.description,total,created);
    run("INSERT INTO movement_details VALUES (?,?,?,?,?,?,?,?)",movementId,1,id,item.productId,item.description,item.quantity,item.unitPriceCents,total);
    const receiptId=randomUUID();run("INSERT INTO receipts VALUES (?,?,?,?,?)",receiptId,id,movementId,JSON.stringify({id:receiptId,movementId,businessId:id,description:item.description,type:item.type,totalCents:total,currency:"GTQ",createdAt:created,synthetic:true}),created);ids.push(movementId);
   }
   if(item.type!=="gasto")run("INSERT INTO inventory_entries VALUES (?,?,?,?,?,?,?,?,?)",randomUUID(),id,item.productId,proposalId,movementId,movementId?1:null,item.type==="venta"?-item.quantity:item.quantity,item.type,created);
  }
  run("UPDATE proposals SET status='confirmada',confirmed_items=?,confirmed_at=? WHERE id=?",JSON.stringify(items),created,proposalId);
  return {ok:true,movementIds:ids};
 });
}
export function saveProfile(id:string,body:Record<string,unknown>){business(id);const a=text(body.archetypeId,"Arquetipo");if(!ARCHETYPES.some(x=>x.id===a))throw new LocalError("Arquetipo invÃ¡lido.");return transaction(()=>{run("INSERT INTO entrepreneur_profiles VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET archetype_id=excluded.archetype_id,updated_at=excluded.updated_at",LOCAL_USER,a,now());run("INSERT INTO archetype_evaluations VALUES (?,?,?,?,?)",randomUUID(),LOCAL_USER,a,"autoseleccion",now());return {ok:true};});}
export function diagnose(id:string,body:Record<string,unknown>){business(id);const organization=integer(body.organization,"OrganizaciÃ³n",0,2),records=integer(body.records,"Registros",0,2),formality=text(body.formality,"Formalidad");if(!["sin_evaluar","en_proceso","formal"].includes(formality))throw new LocalError("Formalidad invÃ¡lida.");return transaction(()=>{
 const diagnosticId=randomUUID();run("INSERT INTO diagnostics VALUES (?,?,?,?,?,?,?)",diagnosticId,id,LOCAL_USER,organization,records,formality,now());let plan=one<{id:string}>("SELECT id FROM improvement_plans WHERE business_id=?",id);if(!plan){plan={id:randomUUID()};run("INSERT INTO improvement_plans VALUES (?,?,?,?,?)",plan.id,id,"Mi siguiente paso",now(),diagnosticId);}
 run("UPDATE improvement_plans SET source_diagnostic_id=? WHERE id=?",diagnosticId,plan.id);
 const suggested=[{code:"registro",title:records<2?"Registrar un dÃ­a completo de ventas y gastos":"Revisar los registros de la semana",reason:"Construir un historial antes de sacar conclusiones."},{code:"catalogo",title:organization<2?"Contar y organizar los productos del negocio":"Revisar diferencias entre el conteo y el inventario",reason:"Empezar con cantidades que puedas comprobar."},{code:"aprendizaje",title:"Completar una lectura de educaciÃ³n financiera",reason:"Entender la informaciÃ³n que muestra tu resumen."}];
 if(formality!=="formal")suggested.push({code:"documentos",title:"Reunir los documentos y dudas del negocio",reason:"Preparar una consulta con la entidad o profesional correspondiente; esta autoevaluaciÃ³n no determina obligaciones fiscales."});
 for(const action of suggested)run("INSERT INTO plan_actions VALUES (?,?,?,?,?,?,?) ON CONFLICT(business_id,code) DO UPDATE SET title=excluded.title,reason=excluded.reason",randomUUID(),id,plan.id,action.code,action.title,action.reason,"pendiente");return {id:diagnosticId};
 });}
export function updateAction(id:string,actionId:string,body:Record<string,unknown>){business(id);const status=text(body.status,"Estado");if(!["pendiente","en_curso","completada"].includes(status))throw new LocalError("Estado invÃ¡lido.");const result=run("UPDATE plan_actions SET status=? WHERE business_id=? AND id=?",status,id,actionId);if(!result.changes)throw new LocalError("AcciÃ³n no encontrada.",404);return {ok:true};}
export function completeLesson(id:string,lessonId:string){business(id);if(!LESSONS.some(l=>l.id===lessonId))throw new LocalError("Lectura no encontrada.",404);run("INSERT OR IGNORE INTO learning_progress VALUES (?,?,?)",LOCAL_USER,lessonId,now());return {ok:true};}
export function converse(id:string,body:Record<string,unknown>){business(id);const message=text(body.text,"Mensaje",1500);const context=snapshot(id);const normalized=message.toLowerCase();let reply="Podemos comenzar por un paso pequeÃ±o: describe a quiÃ©n atiendes, quÃ© ofreces y quÃ© necesitas ordenar. DespuÃ©s elige una acciÃ³n de tu plan y revisa si la completaste. Â¿QuÃ© parte te cuesta mÃ¡s?";
 if(/inventario|producto|stock/.test(normalized))reply=`Tienes ${context.products.length} productos en este negocio y ${context.products.filter(p=>p.stock<=p.min_stock).length} en su mÃ­nimo o por debajo. Compara un conteo fÃ­sico con Inventario. Un ajuste cambia cantidades; una compra registra tambiÃ©n su importe.`;
 else if(/venta|gasto|dinero|saldo/.test(normalized))reply=`Tus registros acumulan ventas por Q${(context.stats.sales/100).toFixed(2)}, gastos por Q${(context.stats.expenses/100).toFixed(2)} y compras por Q${(context.stats.purchases/100).toFixed(2)}. Revisa primero si registraste el mismo periodo completo. Estas cifras no son una proyecciÃ³n ni una utilidad calculada.`;
 else if(/plan|empezar|organizar/.test(normalized))reply=context.actions.length?`Tu siguiente acciÃ³n pendiente es: ${context.actions.find(a=>a.status!=="completada")?.title??"ya completaste las acciones actuales; vuelve a evaluar tu negocio"}. Puedes cambiar su estado en Mi plan.`:"Completa la autoevaluaciÃ³n de Perfil productivo para generar un primer plan. Se basa en tus respuestas y puedes revisarlo antes de actuar.";
 return transaction(()=>{let conversation=one<{id:string}>("SELECT id FROM conversations WHERE business_id=? AND user_id=?",id,LOCAL_USER);if(!conversation){conversation={id:randomUUID()};run("INSERT INTO conversations VALUES (?,?,?,?)",conversation.id,id,LOCAL_USER,now());}run("INSERT INTO messages VALUES (?,?,?,?,?)",randomUUID(),conversation.id,"usuario",message,now());run("INSERT INTO messages VALUES (?,?,?,?,?)",randomUUID(),conversation.id,"guia",reply,now());return {ok:true};});
}

export function updateBusiness(id:string,body:Record<string,unknown>){const current=business(id);const name=text(body.name??current.name,"Nombre"),sector=text(body.sector??current.sector,"Actividad"),stage=text(body.stage??current.stage,"Etapa");if(!["idea","en_marcha","crecimiento"].includes(stage))throw new LocalError("Etapa inválida.");run("UPDATE businesses SET name=?,sector=?,stage=?,idea=?,customer=?,value=? WHERE id=?",name,sector,stage,text(body.idea??current.idea,"Idea",1000,true),text(body.customer??current.customer,"Clientes",1000,true),text(body.value??current.value,"Valor",1000,true),id);return {ok:true};}
