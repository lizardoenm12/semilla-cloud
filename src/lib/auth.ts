import { timingSafeEqual } from "crypto";

/** Verifica "Authorization: Bearer <DEMO_TOKEN>" con comparación de tiempo constante. */
export function isAuthorized(req: Request): boolean {
  const expected = process.env.DEMO_TOKEN;
  if (!expected || expected.length < 16) return false; // sin token configurado, todo se rechaza
  const header = req.headers.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
