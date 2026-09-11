import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { api, formatCOP } from '../../api.js';
import Icon from '../../components/Icon.jsx';
import { ORDER_STATUS } from '../../config.js';

export default function DashboardPage() {
  const { user, can } = useAuth();
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [deliveries, setDeliveries] = useState([]);

  useEffect(() => {
    if (can('reportes.ver')) api.getSummary().then(setSummary).catch(() => {});
    if (can('pedidos.ver','pedidos.gestionar')) api.getOrders().then(setOrders).catch(() => {});
    if (can('domicilios.ver_todos','domicilios.operar')) api.getDeliveries().then(setDeliveries).catch(() => {});
  }, [user?.id]);

  const pendientes = orders.filter((o) => !['entregado', 'cancelado'].includes(o.status));
  const misEntregas = deliveries.filter((d) => !['Entregada', 'Fallida'].includes(d.status));

  return (
    <>
      <div className="view-head">
        <div><h2>Panel general</h2><p>Vista rápida de la operación.</p></div>
      </div>

      {summary && (
        <div className="kpis">
          <div className="kpi"><div className="kpi-i"><Icon name="wallet" size={16} /></div><b className="mono">{formatCOP(summary.revenue)}</b><span>Ventas totales</span></div>
          <div className="kpi"><div className="kpi-i"><Icon name="ticket" size={16} /></div><b>{summary.orderCount}</b><span>Pedidos</span></div>
          <div className="kpi"><div className="kpi-i"><Icon name="box" size={16} /></div><b>{summary.lowStockCount}</b><span>Variantes con poco stock</span></div>
        </div>
      )}

      {can('pedidos.ver','pedidos.gestionar') && (
        <>
          <h3 className="sec-label">Pedidos pendientes</h3>
          {pendientes.length === 0 ? (
            <p className="hint">No hay pedidos pendientes.</p>
          ) : (
            <div className="panel table-scroll">
              <table>
                <thead><tr><th>Pedido</th><th>Cliente</th><th>Total</th><th>Estado</th></tr></thead>
                <tbody>
                  {pendientes.slice(0, 8).map((o) => (
                    <tr key={o.id}>
                      <td><b>#{o.id}</b></td>
                      <td>{o.customer_name}</td>
                      <td className="mono">{formatCOP(o.total)}</td>
                      <td><span className={`tag tag--${ORDER_STATUS[o.status]?.color}`}>{ORDER_STATUS[o.status]?.label}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {can('domicilios.operar') && !can('domicilios.ver_todos') && (
        <>
          <h3 className="sec-label">Tus entregas de hoy</h3>
          {misEntregas.length === 0 ? (
            <p className="hint">No tienes domicilios pendientes.</p>
          ) : (
            <div className="panel table-scroll">
              <table>
                <thead><tr><th>Pedido</th><th>Dirección</th><th>Estado</th></tr></thead>
                <tbody>
                  {misEntregas.map((d) => (
                    <tr key={d.id}>
                      <td><b>#{d.order_id}</b></td>
                      <td>{d.address}</td>
                      <td><span className="tag tag--blaze">{d.status}</span></td>
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

