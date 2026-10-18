import Link from "next/link";
import Workspace from "./workspace";
export const dynamic="force-dynamic";
export default function Inicio(){
 if(process.env.APP_MODE==="local")return <Workspace/>;
 return <><span className="etiqueta-demo">Proyecto en desarrollo</span><h1>Tu negocio, en claro.</h1><p>Registra ventas, gastos e inventario, revisa cada propuesta y construye tu perfil productivo digital.</p><h2>Versión local disponible</h2><p>Desde la carpeta del proyecto ejecuta <code>npm run dev:local</code> y abre <code>http://127.0.0.1:3000</code>. No requiere Azure ni claves de IA.</p><h2>Demostración cloud anterior</h2><p>Las operaciones de comprobantes continúan separadas del desarrollo local.</p><p><Link href="/comprobantes">Comprobantes de prueba</Link> · <Link href="/estado">Estado de servicios cloud</Link></p></>;
}
