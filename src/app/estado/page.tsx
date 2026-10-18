"use client";

import { useState } from "react";
import { useToken } from "../token-context";

type Estado = {
  compute: { entornoDetectado: boolean; servicio: string | null; revision: string | null };
  storage: { ok: boolean; account: string | null; container: string | null };
  consultado: string;
};

type Fila = { servicio: string; funcion: string; estado: string; clase: "ok" | "falla" | "plan"; detalle?: string };

function filas(e: Estado | null): Fila[] {
  const cr: Fila = e?.compute.entornoDetectado
    ? { servicio: "Azure Container Apps", funcion: "Frontend y backend", estado: "Entorno Azure detectado", clase: "ok", detalle: `${e.compute.servicio} · revisión ${e.compute.revision}` }
    : { servicio: "Azure Container Apps", funcion: "Frontend y backend", estado: e ? "Entorno Azure no detectado" : "Sin consultar", clase: "plan" };
  const st: Fila = !e
    ? { servicio: "Azure Blob Storage", funcion: "Comprobantes en contenedor privado", estado: "Sin consultar", clase: "plan" }
    : e.storage.ok
      ? { servicio: "Azure Blob Storage", funcion: "Comprobantes en contenedor privado", estado: "Integrado: el backend accede al contenedor", clase: "ok", detalle: e.storage.container ?? undefined }
      : { servicio: "Azure Blob Storage", funcion: "Comprobantes en contenedor privado", estado: "Sin acceso al contenedor", clase: "falla", detalle: "Revisa AZURE_STORAGE_ACCOUNT y AZURE_STORAGE_CONTAINER y los permisos de la identidad" };
  return [
    cr,
    st,
    { servicio: "Azure Database for PostgreSQL", funcion: "Negocios, productos y movimientos", estado: "Planeado", clase: "plan" },
    { servicio: "Microsoft Entra ID / identidades administradas", funcion: "Acceso entre servicios con roles acotados", estado: "Pendiente de configurar y verificar", clase: "plan" },
    { servicio: "Azure Monitor", funcion: "Logs, errores, rendimiento y alertas", estado: "Planeado", clase: "plan" },
    { servicio: "Azure DevOps / Azure Pipelines", funcion: "Pruebas y despliegue desde GitHub", estado: "YAML de CI preparado; ejecución y despliegue pendientes", clase: "plan" },
    { servicio: "Azure Key Vault", funcion: "Secretos del backend", estado: "Planeado; la demo usa un secreto de Container Apps", clase: "plan" },
  ];
}

export default function EstadoServicios() {
  const { token } = useToken();
  const [estado, setEstado] = useState<Estado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function consultar() {
    setOcupado(true);
    setError(null);
    try {
      const res = await fetch("/api/estado", { headers: { Authorization: `Bearer ${token}` } });
      const datos = await res.json();
      if (!res.ok) throw new Error(datos.error ?? `Error ${res.status}`);
      setEstado(datos);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo contactar al servidor. Revisa tu conexión.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      <h1>Estado de los servicios</h1>
      <p>
        Se detecta el entorno de ejecución y se prueba acceso de listado al almacenamiento.
        La escritura y lectura se demuestran en Comprobantes. El resto aparece como planeado hasta
        que exista una integración demostrable.
      </p>
      <button onClick={consultar} disabled={ocupado || token.length === 0}>
        {ocupado ? "Consultando…" : "Consultar estado"}
      </button>
      {token.length === 0 && <p className="aviso">Escribe el token de la demo en la parte superior.</p>}
      <div aria-live="polite">
        {error && (
          <div className="resultado error"><strong>No se pudo consultar.</strong><p>{error}</p></div>
        )}
      </div>
      <div className="tabla-scroll">
        <table>
          <thead><tr><th>Servicio</th><th>Función</th><th>Estado</th></tr></thead>
          <tbody>
            {filas(estado).map((f) => (
              <tr key={f.servicio}>
                <td>{f.servicio}</td>
                <td>{f.funcion}</td>
                <td>
                  <span className={`insignia ${f.clase}`}>{f.estado}</span>
                  {f.detalle && <div className="detalle">{f.detalle}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {estado && <p className="detalle">Consultado: {new Date(estado.consultado).toLocaleString("es-GT", { timeZone: "America/Guatemala" })}</p>}
    </>
  );
}
