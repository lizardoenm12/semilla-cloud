import "./sign-in.css";
import { GrowthIllustration, SproutMark } from "./growth-art";
function ProviderIcon({ google }: { google: boolean }) {
 if(!google) return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#f25022" d="M1 1h10v10H1z"/><path fill="#7fba00" d="M13 1h10v10H13z"/><path fill="#00a4ef" d="M1 13h10v10H1z"/><path fill="#ffb900" d="M13 13h10v10H13z"/></svg>;
 return <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65Z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.8 23.8 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6C30.03 37.65 27.26 38.5 24 38.5c-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>;
}
export default function SignIn({ provider }: { provider: string }) {
 return <section className="signin-screen" aria-label="Acceso a Asistente Negocios">
  <header className="signin-header"><a className="signin-brand" href="/"><SproutMark/><span>asistente<span className="brand-second">negocios</span></span></a><span className="signin-edition">PEQUEÑOS PASOS. GRANDES IDEAS.</span></header>
  <div className="signin-main">
   <div className="signin-art"><GrowthIllustration/><span className="signin-art-caption">Un poquito de orden. Mucho por crecer.</span></div>
   <div className="signin-form-area"><p className="signin-eyebrow">TU NEGOCIO TIENE MUCHO POR DELANTE</p><h1>Hagamos crecer<br/>tu <span>gran idea.</span></h1><p className="signin-description">Ventas, gastos y próximos pasos.<br/>Todo más claro, un día a la vez.</p>
    <a className="signin-provider" href="/api/auth/login"><ProviderIcon google={provider === "Google"}/><span>Iniciar sesión con {provider}</span><span aria-hidden="true">→</span></a>
    <p className="signin-first-time">¿Primera vez por aquí? Con tu cuenta puedes empezar.</p><p className="signin-reassurance"><span aria-hidden="true">✓</span> Tu contraseña se introduce solo en {provider}.</p>
   </div>
  </div>
  <div className="signin-steps"><span><b>01</b><strong>Cuéntalo</strong>Registra lo que pasó hoy.</span><span><b>02</b><strong>Ordénalo</strong>Revisa antes de confirmar.</span><span><b>03</b><strong>Hazlo crecer</strong>Encuentra tu siguiente paso.</span></div>
  <footer className="signin-footer"><strong>Hecho para quienes se animan a empezar.</strong><span>Tu negocio, en claro.</span></footer>
 </section>;
}
