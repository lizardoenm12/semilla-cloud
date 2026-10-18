import type { DraftEntry, Product } from "./contracts";
const numbers: Record<string,number> = { un:1,una:1,uno:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12,trece:13,catorce:14,quince:15,dieciseis:16,diecisiete:17,dieciocho:18,diecinueve:19,veinte:20 };
function normalize(text: string) { return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }
function quantity(text: string) { return numbers[text] ?? (/^\d+$/.test(text) ? Number(text) : 0); }
function product(text: string, products: Product[]) {
 const query = normalize(text).replace(/\bpanes\b/g,"pan").split(/\s+/).map(w => w.replace(/s$/, "")).join(" ");
 const matches = products.filter(p => normalize(p.name).split(/\s+/).some(w => query.split(" ").includes(w.replace(/s$/, ""))));
 return matches.length === 1 ? matches[0].id : null;
}
/** Reglas explícitas de demostración, SIN modelo de IA conectado. */
export function interpret(text: string, products: Product[]): { items: DraftEntry[]; warnings: string[] } {
 const items: DraftEntry[] = [], warnings: string[] = [];
 for (const original of text.split(/\s+y\s+|;|\n/).map(s=>s.trim()).filter(Boolean)) {
  const clause = normalize(original);
  const sale = clause.match(/^(vendi|compre)\s+(\d+|[a-z]+)\s+(.+?)\s+a\s+q\s*(\d+(?:[.,]\d{1,2})?)(?:\s+cada\s+(?:una|uno))?\.?$/);
  const expense = clause.match(/^(?:gaste|pague)\s+q\s*(\d+(?:[.,]\d{1,2})?)(?:\s+(?:de|en|por)\s+(.+))?\.?$/);
  const inventory = clause.match(/^(entraron|salieron)\s+(\d+|[a-z]+)\s+(.+?)\.?$/);
  if (sale) {
   const id = product(sale[3],products);
   items.push({type:sale[1]==="vendi"?"venta":"compra",description:original,productId:id,quantity:quantity(sale[2]),unitPriceCents:Math.round(Number(sale[4].replace(",","."))*100)});
   if (!id) warnings.push("Selecciona el producto: no hubo una coincidencia única con el catálogo.");
  } else if (expense) {
   items.push({type:"gasto",description:expense[2]??original,productId:null,quantity:1,unitPriceCents:Math.round(Number(expense[1].replace(",","."))*100)});
  } else if (inventory) {
   const id = product(inventory[3],products);
   items.push({type:"inventario",description:original,productId:id,quantity:quantity(inventory[2])*(inventory[1]==="salieron"?-1:1),unitPriceCents:0});
   if (!id) warnings.push("Selecciona el producto para el ajuste de inventario.");
  } else warnings.push(`No se interpretó: “${original}”. Añade o corrige el registro manualmente.`);
 }
 return {items,warnings};
}
