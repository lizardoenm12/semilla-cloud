import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";

export const LOCAL_USER = "usuario-local";
type Scalar = string | number | null;
type RecordRow = Record<string, string | number | null>;
const globalDb = globalThis as typeof globalThis & { businessDb?: DatabaseSync };
export function database(): DatabaseSync {
 if (process.env.APP_MODE !== "local") throw new Error("Modo local deshabilitado");
 if (globalDb.businessDb) return globalDb.businessDb;
 const path = resolve(/* turbopackIgnore: true */ process.env.LOCAL_DB_PATH ?? ".data/negocios.sqlite");
 mkdirSync(dirname(path), { recursive: true });
 const db = new DatabaseSync(path);
 db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS schema_version(version INTEGER PRIMARY KEY);
 INSERT OR IGNORE INTO schema_version VALUES(1);
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, name TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS businesses(id TEXT PRIMARY KEY, name TEXT NOT NULL, sector TEXT NOT NULL, stage TEXT NOT NULL CHECK(stage IN ('idea','en_marcha','crecimiento')), idea TEXT NOT NULL, customer TEXT NOT NULL, value TEXT NOT NULL, created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS memberships(business_id TEXT NOT NULL REFERENCES businesses(id), user_id TEXT NOT NULL REFERENCES users(id), role TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, PRIMARY KEY(business_id,user_id));
 CREATE TABLE IF NOT EXISTS products(id TEXT PRIMARY KEY, business_id TEXT NOT NULL REFERENCES businesses(id), name TEXT NOT NULL, sku TEXT NOT NULL, price_cents INTEGER NOT NULL CHECK(price_cents>=0), min_stock INTEGER NOT NULL CHECK(min_stock>=0), UNIQUE(business_id,sku), UNIQUE(business_id,id));
 CREATE TABLE IF NOT EXISTS proposals(id TEXT PRIMARY KEY, business_id TEXT NOT NULL, author_id TEXT NOT NULL, text TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('pendiente','confirmada','rechazada')), original_items TEXT NOT NULL, confirmed_items TEXT, warnings TEXT NOT NULL, created_at TEXT NOT NULL, confirmed_at TEXT, FOREIGN KEY(business_id,author_id) REFERENCES memberships(business_id,user_id), UNIQUE(business_id,id));
 CREATE TABLE IF NOT EXISTS movements(id TEXT PRIMARY KEY, business_id TEXT NOT NULL, author_id TEXT NOT NULL, proposal_id TEXT NOT NULL, type TEXT NOT NULL CHECK(type IN ('venta','gasto','compra')), description TEXT NOT NULL, total_cents INTEGER NOT NULL CHECK(total_cents>=0), created_at TEXT NOT NULL, FOREIGN KEY(business_id,author_id) REFERENCES memberships(business_id,user_id), FOREIGN KEY(business_id,proposal_id) REFERENCES proposals(business_id,id), UNIQUE(business_id,id));
 CREATE TABLE IF NOT EXISTS movement_details(movement_id TEXT NOT NULL, line_number INTEGER NOT NULL CHECK(line_number>0), business_id TEXT NOT NULL, product_id TEXT, description TEXT NOT NULL, quantity INTEGER NOT NULL CHECK(quantity>0), unit_price_cents INTEGER NOT NULL CHECK(unit_price_cents>=0), subtotal_cents INTEGER NOT NULL CHECK(subtotal_cents>=0), PRIMARY KEY(movement_id,line_number), FOREIGN KEY(business_id,movement_id) REFERENCES movements(business_id,id), FOREIGN KEY(business_id,product_id) REFERENCES products(business_id,id));
 CREATE TABLE IF NOT EXISTS inventory_entries(id TEXT PRIMARY KEY, business_id TEXT NOT NULL, product_id TEXT NOT NULL, proposal_id TEXT, movement_id TEXT, detail_line INTEGER, quantity_delta INTEGER NOT NULL CHECK(quantity_delta<>0), reason TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY(business_id,product_id) REFERENCES products(business_id,id), FOREIGN KEY(business_id,proposal_id) REFERENCES proposals(business_id,id), FOREIGN KEY(movement_id,detail_line) REFERENCES movement_details(movement_id,line_number), CHECK((movement_id IS NULL AND detail_line IS NULL) OR (movement_id IS NOT NULL AND detail_line IS NOT NULL)));
 CREATE TABLE IF NOT EXISTS receipts(id TEXT PRIMARY KEY, business_id TEXT NOT NULL, movement_id TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY(business_id,movement_id) REFERENCES movements(business_id,id));
 CREATE TABLE IF NOT EXISTS movement_attachments(id TEXT PRIMARY KEY, business_id TEXT NOT NULL, movement_id TEXT NOT NULL, filename TEXT NOT NULL, content_type TEXT NOT NULL CHECK(content_type IN ('image/png','image/jpeg','application/pdf')), byte_size INTEGER NOT NULL CHECK(byte_size>0 AND byte_size<=2097152), sha256 TEXT NOT NULL, content_base64 TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY(business_id,movement_id) REFERENCES movements(business_id,id));
 CREATE INDEX IF NOT EXISTS attachments_movement ON movement_attachments(business_id,movement_id);
 INSERT OR IGNORE INTO schema_version VALUES(2);
 CREATE TABLE IF NOT EXISTS attachment_cloud(attachment_id TEXT PRIMARY KEY REFERENCES movement_attachments(id) ON DELETE CASCADE, account TEXT NOT NULL, container TEXT NOT NULL, object_name TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('pending','uploaded','failed')), updated_at TEXT NOT NULL);
 INSERT OR IGNORE INTO schema_version VALUES(3);
 CREATE TABLE IF NOT EXISTS entrepreneur_profiles(user_id TEXT PRIMARY KEY REFERENCES users(id), archetype_id TEXT NOT NULL, updated_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS archetype_evaluations(id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), archetype_id TEXT NOT NULL, method TEXT NOT NULL DEFAULT 'autoseleccion', created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS diagnostics(id TEXT PRIMARY KEY, business_id TEXT NOT NULL, author_id TEXT NOT NULL, organization INTEGER NOT NULL CHECK(organization BETWEEN 0 AND 2), records INTEGER NOT NULL CHECK(records BETWEEN 0 AND 2), formality TEXT NOT NULL CHECK(formality IN ('sin_evaluar','en_proceso','formal')), created_at TEXT NOT NULL, FOREIGN KEY(business_id,author_id) REFERENCES memberships(business_id,user_id));
 CREATE TABLE IF NOT EXISTS improvement_plans(id TEXT PRIMARY KEY, business_id TEXT NOT NULL UNIQUE REFERENCES businesses(id), title TEXT NOT NULL, created_at TEXT NOT NULL, source_diagnostic_id TEXT NOT NULL REFERENCES diagnostics(id));
 CREATE TABLE IF NOT EXISTS plan_actions(id TEXT PRIMARY KEY, business_id TEXT NOT NULL REFERENCES businesses(id), plan_id TEXT NOT NULL REFERENCES improvement_plans(id), code TEXT NOT NULL, title TEXT NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pendiente' CHECK(status IN ('pendiente','en_curso','completada')), UNIQUE(business_id,code));
 CREATE TABLE IF NOT EXISTS learning_progress(user_id TEXT NOT NULL REFERENCES users(id), lesson_id TEXT NOT NULL, completed_at TEXT NOT NULL, PRIMARY KEY(user_id,lesson_id));
 CREATE TABLE IF NOT EXISTS conversations(id TEXT PRIMARY KEY, business_id TEXT NOT NULL REFERENCES businesses(id), user_id TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL, UNIQUE(business_id,user_id));
 CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES conversations(id), role TEXT NOT NULL CHECK(role IN ('usuario','guia')), content TEXT NOT NULL, created_at TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS inventory_product ON inventory_entries(business_id,product_id);
 CREATE INDEX IF NOT EXISTS movements_business ON movements(business_id,created_at);
 CREATE INDEX IF NOT EXISTS proposals_business ON proposals(business_id,created_at);
 `);
 globalDb.businessDb = db;
 db.prepare("INSERT OR IGNORE INTO users VALUES (?,?)").run(LOCAL_USER,"Emprendedor local");
 if (!db.prepare("SELECT 1 FROM businesses LIMIT 1").get() && process.env.LOCAL_SEED !== "empty") {
  db.exec("BEGIN IMMEDIATE");
  try {
   const id = randomUUID(), now = new Date().toISOString();
   db.prepare("INSERT INTO businesses VALUES (?,?,?,?,?,?,?,?)").run(id,"Tienda La Ceiba","Tienda de barrio","en_marcha","Productos cotidianos cerca de casa","Vecinos del barrio","Atención cercana y productos disponibles",now);
   db.prepare("INSERT INTO memberships VALUES (?,?,?,1)").run(id,LOCAL_USER,"propietario");
   for (const [name,sku,price,stock] of [["Agua pura","AGUA",500,24],["Pan","PAN",200,30]] as const) {
    const p = randomUUID(); db.prepare("INSERT INTO products VALUES (?,?,?,?,?,?)").run(p,id,name,sku,price,5);
    db.prepare("INSERT INTO inventory_entries VALUES (?,?,?,?,?,?,?,?,?)").run(randomUUID(),id,p,null,null,null,stock,"inicial",now);
   }
   db.exec("COMMIT");
  } catch (error) { db.exec("ROLLBACK"); throw error; }
 }
 return db;
}
export function rows<T>(sql: string, ...values: Scalar[]): T[] { return database().prepare(sql).all(...values) as unknown as T[]; }
export function one<T>(sql: string, ...values: Scalar[]): T | undefined { return database().prepare(sql).get(...values) as unknown as T | undefined; }
export function run(sql: string, ...values: Scalar[]) { return database().prepare(sql).run(...values); }
export function transaction<T>(action: () => T): T {
 const db = database(); db.exec("BEGIN IMMEDIATE");
 try { const result = action(); db.exec("COMMIT"); return result; }
 catch (error) { db.exec("ROLLBACK"); throw error; }
}
export type DbRow = RecordRow;
