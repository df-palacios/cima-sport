import { useState } from 'react';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';
import Icon from '../components/Icon.jsx';

const SERVICIOS = [
  { value: 'bordado', label: 'Bordado', desc: 'Escudos y logos bordados en uniformes o prendas.' },
  { value: 'estampado', label: 'Estampado', desc: 'Nombres, números y diseños estampados al por mayor.' },
  { value: 'confeccion', label: 'Confección a medida', desc: 'Uniformes deportivos hechos a la medida de tu equipo.' },
];

export default function ServicesPage() {
  const toast = useToast();
  const [form, setForm] = useState({ service_type: 'bordado', customer_name: '', customer_phone: '', description: '' });
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    if (!form.customer_name.trim() || !form.customer_phone.trim() || !form.description.trim()) {
      return toast('Completa todos los campos.');
    }
    setEnviando(true);
    try {
      await api.createServiceRequest(form);
      setEnviado(true);
    } catch (err) {
      toast(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="wrap services-page">
      <div className="view-head">
        <div>
          <h2>Personalización</h2>
          <p>Bordado, estampado y confección a medida para equipos, colegios y empresas.</p>
        </div>
      </div>

      <div className="service-cards">
        {SERVICIOS.map((s) => (
          <button
            key={s.value}
            className={`service-card${form.service_type === s.value ? ' active' : ''}`}
            onClick={() => setForm({ ...form, service_type: s.value })}
            type="button"
          >
            <Icon name="needle" size={20} />
            <b>{s.label}</b>
            <span>{s.desc}</span>
          </button>
        ))}
      </div>

      {enviado ? (
        <div className="empty" style={{ marginTop: 24 }}>
          <Icon name="circleCheck" size={30} />
          <b>Solicitud enviada</b>
          <span>Te contactaremos pronto para cotizar tu pedido.</span>
        </div>
      ) : (
        <form className="reserve-form" onSubmit={enviar} style={{ marginTop: 24, maxWidth: 480 }}>
          <div className="field-group">
            <label>Nombre o entidad</label>
            <input className="field" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
          </div>
          <div className="field-group">
            <label>Teléfono</label>
            <input className="field" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
          </div>
          <div className="field-group">
            <label>Cuéntanos qué necesitas</label>
            <textarea className="field" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <button className="btn btn--primary" style={{ width: '100%', justifyContent: 'center' }} disabled={enviando}>
            {enviando ? 'Enviando…' : 'Solicitar cotización'}
          </button>
        </form>
      )}
    </div>
  );
}
