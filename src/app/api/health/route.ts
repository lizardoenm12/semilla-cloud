import { release } from "@/lib/observability";
export const dynamic = "force-dynamic";

// Sin datos sensibles: solo indica que el servicio responde.
export async function GET() {
  return Response.json({ status: "ok", service: "asistente-negocios-gt", release: release() });
}
