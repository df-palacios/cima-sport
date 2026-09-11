import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { SERVICE_LABELS } from '../../config.js';

const ESTADOS = ['nueva', 'cotizada', 'en_proceso', 'entregada'];
const COLOR = { nueva: 'warn', cotizada: 'blaze', en_proceso: 'blaze', entregada: 'ok' };

export default function ServiceRequestsPage() {
  const toast = useToast();
  const [requests, setRequests] = useState([]);

  function load() { return api.getServiceRequests().then(setRequests); }
  useEffect(() => { load(); }, []);

  async function cambiarEstado(id, status) {
    try { await api.updateServiceRequest(id, status); toast('Solicitud actualizada'); await load(); }
    catch (err) { toast(err.message); }
  }

  return (
    <>
      <div className="view-head"><div><h2>Solicitudes de servicio</h2><p>Bordado, estampado y confección a medida.</p></div></div>

      {requests.length === 0 ? (
        <div className="empty"><b>Sin solicitudes</b><span>Aún no han llegado pedidos de personalización.</span></div>
      ) : (
        <div className="cards">
          {requests.map((r) => (
            <article className="ocard" key={r.id}>
              <header>
                <div>
                  <b>{SERVICE_LABELS[r.service_type]}</b>
                  <span className={`tag tag--${COLOR[r.status]}`}>{r.status.replace('_', ' ')}</span>
                </div>
              </header>
              <p className="hint">{r.customer_name} · {r.customer_phone}</p>
              <p className="hint" style={{ padding: '4px 0' }}>{r.description}</p>
              <div className="ocard__acts">
                {ESTADOS.filter((e) => e !== r.status).map((e) => (
                  <button key={e} className="btn btn--sm btn--ghost" onClick={() => cambiarEstado(r.id, e)}>
                    {e.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
