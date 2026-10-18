"use client";

import Link from "next/link";
import { useToken } from "./token-context";

export default function Encabezado() {
  const { token, setToken } = useToken();
  return (
    <header className="sitio">
      <strong>Asistente de gestión</strong>
      <nav aria-label="Principal">
        <Link href="/">Inicio</Link>
        <Link href="/comprobantes">Comprobantes</Link>
        <Link href="/estado">Estado de servicios</Link>
      </nav>
      <div className="acceso">
        <label htmlFor="token-demo">Token de la demo</label>
        <input
          id="token-demo"
          type="password"
          autoComplete="off"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Pega el token"
        />
      </div>
    </header>
  );
}
