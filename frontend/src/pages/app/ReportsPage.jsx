import { useEffect, useState } from 'react';
import { api, formatCOP } from '../../api.js';

export default function ReportsPage() {
  const [summary, setSummary] = useState(null);
  const [top, setTop] = useState([]);

  useEffect(() => {
    api.getSummary().then(setSummary);
    api.getTopProducts(8).then(setTop);
  }, []);

  if (!summary) return <p className="hint">Cargando…</p>;

  const maxUnits = Math.max(...top.map((t) => t.units), 1);

  return (
    <>
      <div className="view-head"><div><h2>Reportes</h2><p>Resumen de ventas.</p></div></div>

      <div className="kpis">
        <div className="kpi"><b className="mono">{formatCOP(summary.revenue)}</b><span>Ventas totales</span></div>
        <div className="kpi"><b>{summary.orderCount}</b><span>Pedidos</span></div>
        <div className="kpi"><b>{summary.lowStockCount}</b><span>Variantes con poco stock</span></div>
      </div>

      <h3 className="sec-label">Por categoría</h3>
      <div className="panel table-scroll">
        <table>
          <thead><tr><th>Categoría</th><th>Productos</th><th>Ventas</th></tr></thead>
          <tbody>
            {summary.byCategory.map((c) => (
              <tr key={c.category}><td>{c.category}</td><td>{c.productos}</td><td className="mono">{formatCOP(c.revenue)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="sec-label">Más vendidos</h3>
      <div className="bar-chart">
        {top.map((t) => (
          <div className="bar-row" key={t.product_name}>
            <span className="bar-row__label">{t.product_name}</span>
            <div className="bar-row__track"><div className="bar-row__fill" style={{ width: `${(t.units / maxUnits) * 100}%` }} /></div>
            <span className="mono">{t.units}</span>
          </div>
        ))}
      </div>
    </>
  );
}
