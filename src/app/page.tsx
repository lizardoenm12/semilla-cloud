import { cookies,headers } from "next/headers";
import { redirect } from "next/navigation";
import { authMode } from "@/lib/local/identity";
import { SESSION_COOKIE,sessionPrincipal } from "@/lib/local/auth-store";
import { entraSettings } from "@/lib/entra";
import Link from "next/link";
import Workspace from "./workspace";
export const dynamic="force-dynamic";
export default async function Inicio(){
 if(process.env.APP_MODE==="local"){
  if(authMode()==="entra"){
   let base:string;try{base=entraSettings().base;}catch{return <section><h1>Inicio de sesión pendiente de configurar</h1><p>Completa el registro de Microsoft Entra y la configuración del servidor. Tus datos se conservan.</p></section>;}
   if((await headers()).get("host")!==new URL(base).host)redirect(base+"/");
   const user=sessionPrincipal((await cookies()).get(SESSION_COOKIE)?.value);
   if(!user)return <section style={{maxWidth:540,margin:"80px auto",padding:24}}><p>TU ESPACIO DE NEGOCIO</p><h1>Bienvenido a tu negocio.</h1><p>Inicia sesión con tu cuenta de Microsoft de la universidad para acceder a tus negocios y comprobantes.</p><a href="/api/auth/login">Iniciar sesión con Microsoft</a><p>Tu contraseña se introduce únicamente en Microsoft.</p></section>;
  }
  return <Workspace/>;
 }
 return <><span className="etiqueta-demo">Proyecto en desarrollo</span><h1>Tu negocio, en claro.</h1><p>Registra ventas, gastos e inventario, revisa cada propuesta y construye tu perfil productivo digital.</p><h2>Versión local disponible</h2><p>Desde la carpeta del proyecto ejecuta <code>npm run dev:local</code> y abre <code>http://127.0.0.1:3000</code>. No requiere Azure ni claves de IA.</p><h2>Demostración cloud anterior</h2><p>Las operaciones de comprobantes continúan separadas del desarrollo local.</p><p><Link href="/comprobantes">Comprobantes de prueba</Link> · <Link href="/estado">Estado de servicios cloud</Link></p></>;
}
