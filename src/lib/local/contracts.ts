export type Stage = "idea" | "en_marcha" | "crecimiento";
export type EntryKind = "venta" | "gasto" | "compra" | "inventario";
export type DraftEntry = { type: EntryKind; description: string; productId: string | null; quantity: number; unitPriceCents: number };
export type Business = { id: string; name: string; sector: string; stage: Stage; idea: string; customer: string; value: string; created_at: string };
export type Product = { id: string; business_id: string; name: string; sku: string; price_cents: number; min_stock: number; stock: number };
export type Proposal = { id: string; text: string; status: "pendiente" | "confirmada" | "rechazada"; items: DraftEntry[]; warnings: string[]; created_at: string };
export type Movement = { id: string; type: string; description: string; total_cents: number; created_at: string; receipt_id: string };
export type Action = { id: string; title: string; reason: string; status: "pendiente" | "en_curso" | "completada" };
export type Diagnostic = { id: string; organization: number; records: number; formality: string; created_at: string };
export type Archetype = { id: string; name: string; description: string; guidance: string };
export type Lesson = { id: string; title: string; minutes: number; body: string; activity: string };
export type Bootstrap = { user: { id: string; name: string }; businesses: Business[]; archetypes: Archetype[]; lessons: Lesson[]; mode: "local" };
export type Snapshot = { business: Business; products: Product[]; proposals: Proposal[]; movements: Movement[]; actions: Action[]; diagnostics: Diagnostic[]; archetypeId: string | null; evaluations: { archetype_id: string; created_at: string }[]; learning: string[]; messages: { id: string; role: string; content: string; created_at: string }[]; stats: { sales: number; expenses: number; purchases: number; balance: number; movements: number }; chart: { day: string; sales: number; expenses: number }[] };
export const ARCHETYPES: Archetype[] = [
 { id: "equilibristas", name: "Equilibristas Esforzados", description: "Buscas ordenar el negocio mientras atiendes muchas responsabilidades.", guidance: "Empieza con un registro al día y una tarea pequeña." },
 { id: "pioneros", name: "Pioneros Metódicos", description: "Prefieres probar ideas con estructura y revisar los resultados.", guidance: "Revisa tus registros y define un experimento para esta semana." },
 { id: "forjador", name: "Forjador Silencioso", description: "Aprendes haciendo y valoras herramientas claras que te ahorren tiempo.", guidance: "Registra lo que pasó y revisa cuánto producto te queda." },
 { id: "protectores", name: "Protectores Cautelosos", description: "Prefieres avanzar con claridad y revisar antes de tomar una decisión.", guidance: "Comprueba cada propuesta antes de confirmarla; puedes corregirla." },
];
export const LESSONS: Lesson[] = [
 { id: "registros", title: "Una venta no cuenta toda la historia", minutes: 3, body: "Registrar una venta ayuda a saber cuánto ingresó, pero para entender el negocio también necesitas registrar compras y gastos. El resumen de esta versión muestra registros de contado: no representa utilidad ni saldo bancario.", activity: "Registra una venta y un gasto de prueba. Compara sus importes en el resumen." },
 { id: "inventario", title: "Lo que hay en tu estante", minutes: 4, body: "El inventario aumenta con entradas y compras, y disminuye con ventas o ajustes de salida. Un conteo físico permite detectar diferencias. Un ajuste cambia las existencias, pero no registra automáticamente una compra ni un gasto.", activity: "Cuenta un producto y compara el resultado con la pestaña Inventario." },
 { id: "revision", title: "Un momento para revisar", minutes: 2, body: "El texto puede ser ambiguo. Antes de confirmar, revisa negocio, tipo, producto, cantidad y precio. Si algo no corresponde a lo ocurrido, corrígelo o rechaza la propuesta. Todavía puedes registrar los datos manualmente.", activity: "Crea una propuesta, cambia un importe y confirma solo después de revisarlo." },
];
