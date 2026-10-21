import {createHash} from 'node:crypto';
export const DATA_TABLES=['users','businesses','memberships','products','proposals','movements','movement_details','inventory_entries','receipts','movement_attachments','attachment_cloud','auth_sessions','auth_flows','legacy_claims','entrepreneur_profiles','archetype_evaluations','diagnostics','improvement_plans','plan_actions','learning_progress','conversations','messages'];
const identifier=value=>{if(!/^[a-z_][a-z0-9_]*$/.test(value))throw Error('Identificador de migración inválido');return '"'+value+'"';};
const hash=rows=>createHash('sha256').update(JSON.stringify(rows)).digest('hex');
/** Ejecutar solo contra una base destino vacía. No modifica la fuente SQLite. */
export async function migrateSqlite(source,client,schema){
 const results=[];await client.query('BEGIN');
 try{
  await client.query(schema);
  for(const table of DATA_TABLES){const exists=await client.query('SELECT COUNT(*) AS n FROM '+identifier(table));if(Number(exists.rows[0].n)!==0)throw Error('El destino contiene datos; migración cancelada sin reemplazarlos.');}
  source.exec('BEGIN');
  try{
   for(const table of DATA_TABLES){
    const columns=source.prepare('PRAGMA table_info('+identifier(table)+')').all().map(c=>c.name);
    const select=columns.map(identifier).join(','),data=source.prepare('SELECT rowid AS _seq,'+select+' FROM '+identifier(table)+' ORDER BY rowid').all();
    for(const row of data){const fields=[...columns,'_seq'];await client.query('INSERT INTO '+identifier(table)+' ('+fields.map(identifier).join(',')+') VALUES ('+fields.map((_,i)=>'$'+(i+1)).join(',')+')',fields.map(c=>row[c]));}
    const actual=(await client.query('SELECT '+select+' FROM '+identifier(table)+' ORDER BY _seq')).rows;
    const expected=data.map(row=>Object.fromEntries(columns.map(c=>[c,row[c]])));
    if(hash(actual)!==hash(expected))throw Error('La verificación de integridad falló; destino revertido.');
    const max=data.length?Math.max(...data.map(row=>row._seq)):1;
    await client.query("SELECT setval(pg_get_serial_sequence($1,'_seq'),$2,$3)",[table,max,data.length>0]);
    results.push({table,rows:data.length,sha256:hash(expected),verified:true});
   }
   source.exec('COMMIT');
  }catch(error){source.exec('ROLLBACK');throw error;}
  await client.query('COMMIT');return results;
 }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
}
