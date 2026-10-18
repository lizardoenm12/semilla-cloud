"use client";

import { createContext, useContext, useState } from "react";

type Ctx = { token: string; setToken: (t: string) => void };
const TokenContext = createContext<Ctx>({ token: "", setToken: () => {} });

/** Guarda el token solo en memoria: se pierde al recargar la página. */
export function TokenProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState("");
  return <TokenContext.Provider value={{ token, setToken }}>{children}</TokenContext.Provider>;
}

export const useToken = () => useContext(TokenContext);
