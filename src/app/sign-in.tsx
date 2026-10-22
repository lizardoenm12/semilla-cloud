import localFont from "next/font/local";
import "./sign-in.css";
const manrope = localFont({ src: "./fonts/manrope-latin.ttf", weight: "200 800", display: "swap" });
function Arrow({ diagonal = false }: { diagonal?: boolean }) {
 return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={diagonal ? "M6 18 18 6M6 6h12v12" : "M4 12h15m-6-6 6 6-6 6"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function ProviderIcon({ google }: { google: boolean }) {
 if(!google) return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#f25022" d="M1 1h10v10H1z"/><path fill="#7fba00" d="M13 1h10v10H13z"/><path fill="#00a4ef" d="M1 13h10v10H1z"/><path fill="#ffb900" d="M13 13h10v10H13z"/></svg>;
 return <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65Z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.8 23.8 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6C30.03 37.65 27.26 38.5 24 38.5c-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>;
}
function Sculpture() {
 return <svg className="signin-sculpture" viewBox="0 0 900 1000" fill="none" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs>
   <radialGradient id="signin-bg" cx="0" cy="0" r="1" gradientTransform="translate(665 255) rotate(112) scale(790 680)" gradientUnits="userSpaceOnUse"><stop stopColor="#41464b"/><stop offset=".55" stopColor="#202327"/><stop offset="1" stopColor="#101214"/></radialGradient>
   <linearGradient id="signin-metal" x1="790" y1="140" x2="370" y2="690" gradientUnits="userSpaceOnUse"><stop stopColor="#d6d8d9"/><stop offset=".24" stopColor="#737a80"/><stop offset=".49" stopColor="#30363c"/><stop offset=".72" stopColor="#8c9398"/><stop offset="1" stopColor="#21262b"/></linearGradient>
   <linearGradient id="signin-edge" x1="300" y1="650" x2="820" y2="120" gradientUnits="userSpaceOnUse"><stop stopColor="#1a1d21"/><stop offset=".55" stopColor="#737c83"/><stop offset="1" stopColor="#edecea"/></linearGradient>
   <linearGradient id="signin-red" x1="550" y1="430" x2="740" y2="160" gradientUnits="userSpaceOnUse"><stop stopColor="#550a13"/><stop offset=".48" stopColor="#a21c2c"/><stop offset="1" stopColor="#f3444a"/></linearGradient>
   <linearGradient id="signin-shade" x1="300" y1="280" x2="350" y2="1000" gradientUnits="userSpaceOnUse"><stop stopColor="#111315" stopOpacity="0"/><stop offset=".63" stopColor="#111315" stopOpacity=".8"/><stop offset="1" stopColor="#111315"/></linearGradient>
   <pattern id="signin-grid" width="90" height="90" patternUnits="userSpaceOnUse"><path d="M90 0H0v90" stroke="white" strokeOpacity=".025"/></pattern>
   <filter id="signin-shadow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="24"/></filter>
  </defs>
  <path fill="url(#signin-bg)" d="M0 0h900v1000H0z"/><path fill="url(#signin-grid)" d="M0 0h900v1000H0z"/>
  <ellipse cx="640" cy="645" rx="285" ry="56" fill="#050607" opacity=".65" filter="url(#signin-shadow)"/>
  <g transform="translate(35 -30)">
   <path d="M986 263C790 94 569 97 421 267 295 413 317 590 462 704l86-108C443 513 430 398 510 305c94-109 244-112 378 1l98-43Z" fill="#14191d"/>
   <path d="M960 234C764 65 543 68 395 238 269 384 291 561 436 675l86-108C417 484 404 369 484 276c94-109 244-112 378 1l98-43Z" fill="url(#signin-metal)"/>
   <path d="M960 234C764 65 543 68 395 238 269 384 291 561 436 675" stroke="url(#signin-edge)" strokeWidth="2"/>
   <path d="M522 567C417 484 404 369 484 276c94-109 244-112 378 1l26 29c-134-113-284-110-378-1-80 93-67 208 38 291l-26-29Z" fill="#111619"/>
   <path d="M548 596c-105-83-118-198-38-291 94-109 244-112 378 1" stroke="#9da4aa" strokeOpacity=".35" strokeWidth="1.5"/>
   <path d="M422 211c41-37 87-63 136-78l48 131c-45 14-85 36-122 75l-62-128Z" fill="url(#signin-red)"/>
   <path d="m558 133 20 24 48 131-20-24-48-131Z" fill="#64121e"/>
   <path d="m423 212 135-79" stroke="#f76065" strokeOpacity=".6"/>
   <path d="M989 330c-146-128-317-140-431-36-119 109-128 263-26 383" stroke="#b5bdc3" strokeOpacity=".12" strokeWidth="1"/>
  </g>
  <path fill="url(#signin-shade)" d="M0 0h900v1000H0z"/>
 </svg>;
}
export default function SignIn({ provider }: { provider: string }) {
 return <section className={`signin-screen ${manrope.className}`} aria-label="Acceso a Asistente Negocios">
  <div className="signin-hero">
   <Sculpture />
   <div className="signin-hero-top"><a className="signin-brand" href="/" aria-label="Asistente Negocios, inicio"><svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true"><path d="M4 25 16 5l12 20M10 20h12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/><path d="M23 6h5v5" fill="none" stroke="#ee3c46" strokeWidth="2.5"/></svg><span>ASISTENTE<br/><strong>NEGOCIOS</strong></span></a><span className="signin-edition">CRECER EMPIEZA CONTIGO</span></div>
   <div className="signin-hero-copy"><p className="signin-eyebrow"><span/> CADA DÍA CUENTA</p><h1>El siguiente<br/>paso es tuyo<span className="signin-period">.</span></h1><p className="signin-hero-description">Dale dirección a lo que estás construyendo.<br/>Tu negocio, más claro. Tu próximo paso, más cerca.</p></div>
   <div className="signin-steps" aria-label="Tu proceso"><span><small>01</small> Registra</span><span><small>02</small> Organiza</span><span><small>03</small> Avanza <Arrow diagonal /></span></div>
  </div>
  <div className="signin-panel">
   <div className="signin-panel-top"><span className="signin-panel-line"/> TU ESPACIO DE NEGOCIO</div>
   <div className="signin-form-area">
    <span className="signin-entry-icon"><Arrow diagonal /></span>
    <h2>Bienvenido<br/> a tu negocio.</h2>
    <p className="signin-description">Tus registros, inventario y comprobantes.<br/>Todo en un mismo lugar.</p>
    <a className="signin-provider" href="/api/auth/login"><ProviderIcon google={provider === "Google"}/><span>Iniciar sesión con {provider}</span><Arrow /></a>
    <p className="signin-first-time">¿Es tu primera visita? Entra con {provider} para empezar.</p>
    <div className="signin-reassurance"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.5"/><path d="M12 14v3" stroke="currentColor" strokeWidth="1.5"/></svg><p>Tu contraseña se introduce únicamente en {provider}.<br/>Tu espacio se abre después de verificar tu cuenta.</p></div>
   </div>
   <footer className="signin-footer"><span>ASISTENTE NEGOCIOS</span><span>Hecho para dar el siguiente paso.</span></footer>
  </div>
 </section>;
}
