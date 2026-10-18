"use client";

import { useState } from "react";
import { useToken } from "../token-context";
import Recibo, { Comprobante, fechaGT } from "./recibo";

type Item = { id: string; objeto: string; creado: string; bytes: number };
type Detalle = { objeto: string; comprobante: Comprobante };

export default function Comprobantes() {
  const { token } = useToken();
  const [items, setItems] = useState<Item[] | null>(null);
  const [detalle, setDetalle] = useState<Detalle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  async function llamar<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, { ...init, headers });
    const datos = await res.json();
    if (!res.ok) throw new Error(datos.error ?? `Error ${res.status}`);
    return datos as T;
  }

  async function actualizar() {
    setOcupado(true);
    setError(null);
    try {
      const d = await llamar<{ items: Item[] }>("/api/comprobantes");
      setItems(d.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo contactar al servidor. Revisa tu conexión.");
    } finally {
      setOcupado(false);
    }
  }

  async function crear() {
    setOcupado(true);
    setError(null);
    try {
      const d = await llamar<Detalle>("/api/comprobantes", { method: "POST" });
      setDetalle({ objeto: d.objeto, comprobante: d.comprobante });
      const lista = await llamar<{ items: Item[] }>("/api/comprobantes");
      setItems(lista.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo contactar al servidor. Revisa tu conexión.");
    } finally {
      setOcupado(false);
    }
  }

  async function ver(id: string) {
    setOcupado(true);
    setError(null);
    try {
      const d = await llamar<Detalle>(`/api/comprobantes?id=${encodeURIComponent(id)}`);
      setDetalle({ objeto: d.objeto, comprobante: d.comprobante });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo contactar al servidor. Revisa tu conexión.");
    } finally {
      setOcupado(false);
    }
  }

  const sinToken = token.length === 0;

  return (
    <>
      <span className="etiqueta-demo">Datos de demostración</span>
      <h1>Comprobantes de prueba</h1>
      <p>
        Cada comprobante es un archivo en un contenedor privado de Azure Blob Storage. Crea uno, recarga la
        página, escribe el token y pulsa “Actualizar lista”: el comprobante sigue ahí.
      </p>
      {sinToken && <p className="aviso">Escribe el token de la demo en la parte superior para empezar.</p>}

      <div className="acciones">
        <button onClick={crear} disabled={ocupado || sinToken}>
          {ocupado ? "Trabajando…" : "Crear comprobante de prueba"}
        </button>
        <button className="secundario" onClick={actualizar} disabled={ocupado || sinToken}>
          Actualizar lista
        </button>
      </div>

      <div aria-live="polite">
        {error && (
          <div className="resultado error">
            <strong>No se pudo completar la acción.</strong>
            <p>{error}</p>
          </div>
        )}
        {detalle && <Recibo c={detalle.comprobante} objeto={detalle.objeto} />}
      </div>

      {items && (
        <>
          <h2>Guardados en Azure Blob Storage</h2>
          {items.length === 0 ? (
            <p>Todavía no hay comprobantes. Crea el primero con el botón de arriba.</p>
          ) : (
            <div className="tabla-scroll">
              <table>
                <thead>
                  <tr><th>Fecha (Guatemala)</th><th>Identificador</th><th>Tamaño</th><th><span className="solo-lector">Acción</span></th></tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.id}>
                      <td>{fechaGT(i.creado)}</td>
                      <td><code>{i.id.slice(0, 8)}…</code></td>
                      <td>{i.bytes} B</td>
                      <td><button className="secundario chico" onClick={() => ver(i.id)} disabled={ocupado}>Ver</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
