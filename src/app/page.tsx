import SignIn from "./sign-in";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { authMode, workspaceEnabled } from "@/lib/local/identity";
import { SESSION_COOKIE, sessionPrincipal } from "@/lib/local/auth-store";
import { loginSettings } from "@/lib/oidc";
import Link from "next/link";
import Workspace from "./workspace";
export const dynamic = "force-dynamic";
export default async function Inicio() {
    if (workspaceEnabled()) {
        if (authMode() !== "local") {
            let base: string, label: string;
            try {
                const settings = loginSettings();
                base = settings.base;
                label = settings.label;
            }
            catch {
                return <section><h1>Inicio de sesión pendiente de configurar</h1><p>Completa la configuración del proveedor de inicio de sesión en el servidor. Tus datos se conservan.</p></section>;
            }
            if ((await headers()).get("host") !== new URL(base).host)
                redirect(base + "/");
            const user = await sessionPrincipal((await cookies()).get(SESSION_COOKIE)?.value);
            if (!user)
                return <SignIn provider={label} />;
        }
        return <Workspace />;
    }
    if (process.env.APP_MODE === "cloud" || process.env.CONTAINER_APP_NAME)
        return <section><h1>Servicio temporalmente no disponible</h1><p>Vuelve a intentarlo en un momento.</p></section>;
    return <><span className="etiqueta-demo">Proyecto en desarrollo</span><h1>Tu negocio, en claro.</h1><p>Registra ventas, gastos e inventario, revisa cada propuesta y construye tu perfil productivo digital.</p><h2>Versión local disponible</h2><p>Desde la carpeta del proyecto ejecuta <code>npm run dev:local</code> y abre <code>http://127.0.0.1:3000</code>. No requiere Azure ni claves de IA.</p><h2>Demostración cloud anterior</h2><p>Las operaciones de comprobantes continúan separadas del desarrollo local.</p><p><Link href="/comprobantes">Comprobantes de prueba</Link> · <Link href="/estado">Estado de servicios cloud</Link></p></>;
}
