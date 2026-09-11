import { useEffect, useState } from 'react';
import { api, formatCOP } from '../../api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { ORDER_STATUS } from '../../config.js';
import Icon from '../../components/Icon.jsx';

export default function OrdersPage() {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() { return api.getOrders().then((d) => { setOrders(d); setLoading(false); }); }
  useEffect(() => { load(); }, []);

  async function avanzar(id) {
    try { await api.advanceOrder(id); toast('Pedido actualizado'); await load(); }
    catch (err) { toast(err.message); }
  }
  async function cancelar(id) {
    if (!window.confirm('¿Cancelar este pedido? El stock se devolverá.')) return;
    try { await api.cancelOrder(id); toast('Pedido cancelado'); await load(); }
    catch (err) { toast(err.message); }
  }

  const SIGUIENTE_LABEL = {
    pendiente: 'Confirmar', confirmado: 'Pasar a preparación',
    en_preparacion: 'Marcar enviado', enviado: 'Marcar entregado',
  };

  if (loading) return <p className="hint">Cargando pedidos…</p>;

  return (
    <>
      <div className="view-head"><div><h2>Pedidos</h2><p>{orders.length} pedidos en total.</p></div></div>

      {orders.length === 0 ? (
        <div className="empty"><b>Sin pedidos</b><span>Todavía no se ha registrado ninguna venta.</span></div>
      ) : (
        <div className="cards">
          {orders.map((o) => (
            <article className="ocard" key={o.id}>
              <header>
                <div>
                  <b>#{o.id}</b>
                  <span className={`tag tag--${ORDER_STATUS[o.status]?.color}`}>{ORDER_STATUS[o.status]?.label}</span>
                  <span className="tag tag--quiet">{o.channel === 'tienda' ? 'Tienda física' : 'Online'}</span>
                </div>
                <span className="mono">{formatCOP(o.total)}</span>
              </header>
              <p className="hint">{o.customer_name} · {o.customer_phone}</p>
              {o.shipping_address && <p className="hint"><Icon name="pin" size={13} /> {o.shipping_address}, {o.city}</p>}
              <ul className="ocard__lines">
                {o.items.map((it) => (
                  <li key={it.id}><span>{it.quantity}x {it.product_name} ({it.size}/{it.color})</span><span className="mono">{formatCOP(it.unit_price * it.quantity)}</span></li>
                ))}
              </ul>
              {!['entregado', 'cancelado'].includes(o.status) && (
                <div className="ocard__acts">
                  <button className="btn btn--sm btn--primary" onClick={() => avanzar(o.id)}>{SIGUIENTE_LABEL[o.status]}</button>
                  <button className="btn btn--sm btn--danger" onClick={() => cancelar(o.id)}>Cancelar</button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
