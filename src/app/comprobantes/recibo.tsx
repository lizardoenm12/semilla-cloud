export type Comprobante = {
  id: string;
  etiqueta: string;
  descripcion: string;
  total_gtq: number;
  creado: string;
};

export const fechaGT = (iso: string) =>
  new Date(iso).toLocaleString("es-GT", { timeZone: "America/Guatemala", dateStyle: "medium", timeStyle: "short" });

export const quetzales = (n: number) =>
  `Q${n.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Recibo({ c, objeto }: { c: Comprobante; objeto: string }) {
  return (
    <article className="recibo" aria-label="Comprobante">
      <p className="etiqueta-demo">{c.etiqueta}</p>
      <p className="recibo-total">{quetzales(c.total_gtq)}</p>
      <p>{c.descripcion}</p>
      <dl>
        <dt>Fecha (hora de Guatemala)</dt>
        <dd>{fechaGT(c.creado)}</dd>
        <dt>Objeto en Cloud Storage</dt>
        <dd><code>{objeto}</code></dd>
      </dl>
      <details>
        <summary>Ver JSON guardado</summary>
        <pre>{JSON.stringify(c, null, 2)}</pre>
      </details>
    </article>
  );
}
