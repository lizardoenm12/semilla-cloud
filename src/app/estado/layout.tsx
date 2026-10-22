import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
/** Herramienta histórica de desarrollo: no se ofrece en la app pública. */
export default function DemoLayout({ children }: { children: React.ReactNode }) {
 if (process.env.APP_MODE === "cloud" || process.env.CONTAINER_APP_NAME) notFound();
 return children;
}
