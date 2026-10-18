/** Tipado mínimo del subconjunto node:sqlite usado aquí, compatible con los tipos Node 20 del proyecto recibido.
 * Runtime requerido: Node 24 LTS. No sustituye una implementación de SQLite.
 */
declare module "node:sqlite" {
 export class DatabaseSync {
  constructor(path: string);
  exec(sql: string): void;
  close(): void;
  prepare(sql: string): {
   get(...values: (string | number | null)[]): Record<string,unknown> | undefined;
   all(...values: (string | number | null)[]): Record<string,unknown>[];
   run(...values: (string | number | null)[]): {changes: number | bigint; lastInsertRowid: number | bigint};
  };
 }
}
