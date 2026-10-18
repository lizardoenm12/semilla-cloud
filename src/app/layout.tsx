import type { Metadata } from "next";
import "./globals.css";
import { TokenProvider } from "./token-context";
import Encabezado from "./encabezado";

export const metadata: Metadata = {
  title: "Asistente de gestión para pequeños negocios",
  description: "Registra ventas, gastos e inventario de tu negocio.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-GT">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <TokenProvider>
          <Encabezado />
          <main>{children}</main>
        </TokenProvider>
      </body>
    </html>
  );
}
