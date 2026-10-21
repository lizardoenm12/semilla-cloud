-- Esquema SQLite local, versión 3: adjuntos y ubicación del respaldo Azure.
-- Referencia; no ejecutar directamente en PostgreSQL.

CREATE INDEX attachments_movement ON movement_attachments(business_id,movement_id);

CREATE INDEX inventory_product ON inventory_entries(business_id,product_id);

CREATE INDEX movements_business ON movements(business_id,created_at);

CREATE INDEX proposals_business ON proposals(business_id,created_at);

CREATE TABLE archetype_evaluations(id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), archetype_id TEXT NOT NULL, method TEXT NOT NULL DEFAULT 'autoseleccion', created_at TEXT NOT NULL);

CREATE TABLE attachment_cloud(attachment_id TEXT PRIMARY KEY REFERENCES movement_attachments(id) ON DELETE CASCADE, account TEXT NOT NULL, container TEXT NOT NULL, object_name TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('pending','uploaded','failed')), updated_at TEXT NOT NULL);

CREATE TABLE businesses(id TEXT PRIMARY KEY, name TEXT NOT NULL, sector TEXT NOT NULL, stage TEXT NOT NULL CHECK(stage IN ('idea','en_marcha','crecimiento')), idea TEXT NOT NULL, customer TEXT NOT NULL, value TEXT NOT NULL, created_at TEXT NOT NULL);

CREATE TABLE conversations(id TEXT PRIMARY KEY, business_id TEXT NOT NULL REFERENCES businesses(id), user_id TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL, UNIQUE(business_id,user_id));

CREATE TABLE diagnostics(id TEXT PRIMARY KEY, business_id TEXT NOT NULL, author_id TEXT NOT NULL, organization INTEGER NOT NULL CHECK(organization BETWEEN 0 AND 2), records INTEGER NOT NULL CHECK(records BETWEEN 0 AND 2), formality TEXT NOT NULL CHECK(formality IN ('sin_evaluar','en_proceso','formal')), created_at TEXT NOT NULL, FOREIGN KEY(business_id,author_id) REFERENCES memberships(business_id,user_id));

CREATE TABLE entrepreneur_profiles(user_id TEXT PRIMARY KEY REFERENCES users(id), archetype_id TEXT NOT NULL, updated_at TEXT NOT NULL);

CREATE TABLE improvement_plans(id TEXT PRIMARY KEY, business_id TEXT NOT NULL UNIQUE REFERENCES businesses(id), title TEXT NOT NULL, created_at TEXT NOT NULL, source_diagnostic_id TEXT NOT NULL REFERENCES diagnostics(id));

CREATE TABLE inventory_entries(id TEXT PRIMARY KEY, business_id TEXT NOT NULL, product_id TEXT NOT NULL, proposal_id TEXT, movement_id TEXT, detail_line INTEGER, quantity_delta INTEGER NOT NULL CHECK(quantity_delta<>0), reason TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY(business_id,product_id) REFERENCES products(business_id,id), FOREIGN KEY(business_id,proposal_id) REFERENCES proposals(business_id,id), FOREIGN KEY(movement_id,detail_line) REFERENCES movement_details(movement_id,line_number), CHECK((movement_id IS NULL AND detail_line IS NULL) OR (movement_id IS NOT NULL AND detail_line IS NOT NULL)));

CREATE TABLE learning_progress(user_id TEXT NOT NULL REFERENCES users(id), lesson_id TEXT NOT NULL, completed_at TEXT NOT NULL, PRIMARY KEY(user_id,lesson_id));

CREATE TABLE memberships(business_id TEXT NOT NULL REFERENCES businesses(id), user_id TEXT NOT NULL REFERENCES users(id), role TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, PRIMARY KEY(business_id,user_id));

CREATE TABLE messages(id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES conversations(id), role TEXT NOT NULL CHECK(role IN ('usuario','guia')), content TEXT NOT NULL, created_at TEXT NOT NULL);

CREATE TABLE movement_attachments(id TEXT PRIMARY KEY, business_id TEXT NOT NULL, movement_id TEXT NOT NULL, filename TEXT NOT NULL, content_type TEXT NOT NULL CHECK(content_type IN ('image/png','image/jpeg','application/pdf')), byte_size INTEGER NOT NULL CHECK(byte_size>0 AND byte_size<=2097152), sha256 TEXT NOT NULL, content_base64 TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY(business_id,movement_id) REFERENCES movements(business_id,id));

CREATE TABLE movement_details(movement_id TEXT NOT NULL, line_number INTEGER NOT NULL CHECK(line_number>0), business_id TEXT NOT NULL, product_id TEXT, description TEXT NOT NULL, quantity INTEGER NOT NULL CHECK(quantity>0), unit_price_cents INTEGER NOT NULL CHECK(unit_price_cents>=0), subtotal_cents INTEGER NOT NULL CHECK(subtotal_cents>=0), PRIMARY KEY(movement_id,line_number), FOREIGN KEY(business_id,movement_id) REFERENCES movements(business_id,id), FOREIGN KEY(business_id,product_id) REFERENCES products(business_id,id));

CREATE TABLE movements(id TEXT PRIMARY KEY, business_id TEXT NOT NULL, author_id TEXT NOT NULL, proposal_id TEXT NOT NULL, type TEXT NOT NULL CHECK(type IN ('venta','gasto','compra')), description TEXT NOT NULL, total_cents INTEGER NOT NULL CHECK(total_cents>=0), created_at TEXT NOT NULL, FOREIGN KEY(business_id,author_id) REFERENCES memberships(business_id,user_id), FOREIGN KEY(business_id,proposal_id) REFERENCES proposals(business_id,id), UNIQUE(business_id,id));

CREATE TABLE plan_actions(id TEXT PRIMARY KEY, business_id TEXT NOT NULL REFERENCES businesses(id), plan_id TEXT NOT NULL REFERENCES improvement_plans(id), code TEXT NOT NULL, title TEXT NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pendiente' CHECK(status IN ('pendiente','en_curso','completada')), UNIQUE(business_id,code));

CREATE TABLE products(id TEXT PRIMARY KEY, business_id TEXT NOT NULL REFERENCES businesses(id), name TEXT NOT NULL, sku TEXT NOT NULL, price_cents INTEGER NOT NULL CHECK(price_cents>=0), min_stock INTEGER NOT NULL CHECK(min_stock>=0), UNIQUE(business_id,sku), UNIQUE(business_id,id));

CREATE TABLE proposals(id TEXT PRIMARY KEY, business_id TEXT NOT NULL, author_id TEXT NOT NULL, text TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('pendiente','confirmada','rechazada')), original_items TEXT NOT NULL, confirmed_items TEXT, warnings TEXT NOT NULL, created_at TEXT NOT NULL, confirmed_at TEXT, FOREIGN KEY(business_id,author_id) REFERENCES memberships(business_id,user_id), UNIQUE(business_id,id));

CREATE TABLE receipts(id TEXT PRIMARY KEY, business_id TEXT NOT NULL, movement_id TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY(business_id,movement_id) REFERENCES movements(business_id,id));

CREATE TABLE schema_version(version INTEGER PRIMARY KEY);

CREATE TABLE users(id TEXT PRIMARY KEY, name TEXT NOT NULL);
