import { useEffect, useState } from 'react';
import { api, formatCOP } from '../../api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import Icon from '../../components/Icon.jsx';
import Modal from '../../components/Modal.jsx';

const DESPACHA = ['admin', 'ventas'];

const COLOR_ESTADO = {
  'Sin asignar': 'quiet',
  'Asignada': 'warn',
  'En camino': 'blaze',
  'Entregada': 'ok',
  'Fallida': 'bad',
};

export default function DomiciliosPage() {
  const toast = useToast();
  const { can } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fallo, setFallo] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [externo, setExterno] = useState(null);
  const [formExterno, setFormExterno] = useState({ externalCarrier: '', trackingRef: '' });

  const puedeDespachar = can('domicilios.asignar');

  function load() {
    const calls = [api.getDeliveries()];
    calls.push(puedeDespachar ? api.getCouriers() : Promise.resolve([]));
    return Promise.all(calls).then(([d, c]) => { setDeliveries(d); setCouriers(c); setLoading(false); });
  }
  useEffect(() => { load(); }, []);

  async function accion(fn, mensaje) {
    try { await fn(); toast(mensaje); await load(); }
    catch (err) { toast(err.message); }
  }

  async function guardarExterno() {
    try {
      await api.setDeliveryProvider(externo.id, {
        provider: 'externo', externalCarrier: formExterno.externalCarrier, trackingRef: formExterno.trackingRef,
      });
      toast('Reparto actualizado');
      setExterno(null);
      await load();
    } catch (err) { toast(err.message); }
  }

  if (loading) return <p className="hint">Cargando domicilios…</p>;

  const activas = deliveries.filter((d) => !['Entregada', 'Fallida'].includes(d.status));
  const cerradas = deliveries.filter((d) => ['Entregada', 'Fallida'].includes(d.status));

  return (
    <>
      <div className="view-head">
        <div>
          <h2>Domicilios</h2>
          <p>
            {puedeDespachar
              ? 'Asigna quién reparte cada pedido, o márcalo si va por mensajería externa.'
              : 'Estas son tus entregas asignadas. Marca cuándo sales y cuándo entregas.'}
          </p>
        </div>
      </div>

      {deliveries.length === 0 && (
        <div className="empty">
          <Icon name="truck" size={28} />
          <b>Sin domicilios</b>
          <span>
            {puedeDespachar
              ? 'Cuando se cree un pedido online con dirección aparecerá aquí.'
              : 'Todavía no tienes entregas asignadas.'}
          </span>
        </div>
      )}

      {activas.length > 0 && <h3 className="sec-label">En curso</h3>}
      <div className="cards">
        {activas.map((d) => (
          <article className="ocard" key={d.id}>
            <header>
              <div>
                <b>#{d.order_id}</b>
                <span className={`tag tag--${COLOR_ESTADO[d.status]}`}>{d.status}</span>
                {d.provider !== 'propio' && <span className="tag tag--warn">{d.external_carrier || 'Mensajería externa'}</span>}
              </div>
              <span className="mono">{formatCOP(d.total || 0)}</span>
            </header>

            <p className="hint"><Icon name="pin" size={13} /> {d.address}{d.city ? `, ${d.city}` : ''}</p>
            <p className="hint">{d.customer_name} · {d.customer_phone}</p>

            {d.provider === 'propio' && (
              <p className="hint" style={{ padding: '2px 0' }}>
                {d.courier_name ? `Reparte: ${d.courier_name}` : 'Sin domiciliario asignado'}
              </p>
            )}

            <div className="ocard__acts">
              {puedeDespachar && d.provider === 'propio' && (
                <select
                  className="field" style={{ flex: '1 1 160px' }}
                  value={d.courier_id || ''}
                  onChange={(e) => accion(
                    () => api.assignCourier(d.id, e.target.value ? Number(e.target.value) : null),
                    e.target.value ? 'Domiciliario asignado' : 'Domiciliario retirado'
                  )}
                >
                  <option value="">Sin asignar</option>
                  {couriers.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.status}</option>)}
                </select>
              )}

              {puedeDespachar && (
                <button className="btn btn--sm btn--ghost" onClick={() => { setExterno(d); setFormExterno({ externalCarrier: '', trackingRef: '' }); }}>
                  <Icon name="truck" size={14} /> Mensajería externa
                </button>
              )}

              {d.status === 'Asignada' && (
                <button className="btn btn--sm btn--primary" onClick={() => accion(() => api.pickupDelivery(d.id), 'Vas en camino')}>
                  Salí con el pedido
                </button>
              )}
              {d.status === 'En camino' && (
                <button className="btn btn--sm btn--primary" onClick={() => accion(() => api.markDelivered(d.id), 'Entrega registrada')}>
                  Entregado
                </button>
              )}
              {['Asignada', 'En camino'].includes(d.status) && (
                <button className="btn btn--sm btn--danger" onClick={() => { setFallo(d); setMotivo(''); }}>No se pudo</button>
              )}
            </div>
          </article>
        ))}
      </div>

      {cerradas.length > 0 && (
        <>
          <h3 className="sec-label">Cerrados</h3>
          <div className="panel table-scroll">
            <table>
              <thead><tr><th>Pedido</th><th>Dirección</th><th>Reparto</th><th>Estado</th></tr></thead>
              <tbody>
                {cerradas.map((d) => (
                  <tr key={d.id}>
                    <td><b>#{d.order_id}</b></td>
                    <td>{d.address}</td>
                    <td>{d.provider === 'propio' ? (d.courier_name || '—') : (d.external_carrier || 'Externa')}</td>
                    <td>
                      <span className={`tag tag--${COLOR_ESTADO[d.status]}`}>{d.status}</span>
                      {d.failure_reason && <div className="sub">{d.failure_reason}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal open={!!fallo} onClose={() => setFallo(null)} title="No se pudo entregar">
        <div className="field-group">
          <label>¿Qué pasó?</label>
          <input className="field" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej. Nadie contestó, dirección incorrecta…" />
        </div>
        <button
          className="btn btn--danger" style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => {
            if (!motivo.trim()) return toast('Escribe el motivo');
            accion(() => api.failDelivery(fallo.id, motivo), 'Registrado');
            setFallo(null);
          }}
        >
          Registrar
        </button>
      </Modal>

      <Modal open={!!externo} onClose={() => setExterno(null)} title="Mensajería externa">
        <div className="field-group">
          <label>Empresa (Servientrega, Coordinadora, Interrapidísimo…)</label>
          <input className="field" value={formExterno.externalCarrier} onChange={(e) => setFormExterno({ ...formExterno, externalCarrier: e.target.value })} />
        </div>
        <div className="field-group">
          <label>Número de guía (opcional)</label>
          <input className="field" value={formExterno.trackingRef} onChange={(e) => setFormExterno({ ...formExterno, trackingRef: e.target.value })} />
        </div>
        <button className="btn btn--primary" style={{ width: '100%', justifyContent: 'center' }} onClick={guardarExterno}>
          Guardar
        </button>
      </Modal>
    </>
  );
}
