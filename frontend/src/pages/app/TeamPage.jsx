import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useSound } from '../../context/SoundContext.jsx';
import Icon from '../../components/Icon.jsx';
import Modal from '../../components/Modal.jsx';

export default function TeamPage() {
  const toast = useToast();
  const { play } = useSound();
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [editando, setEditando] = useState(null);
  const [seleccion, setSeleccion] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    return Promise.all([api.getEmployees(), api.getRoles()])
      .then(([e, r]) => { setEmployees(e); setRoles(r); setLoading(false); })
      .catch((err) => { toast(err.message); setLoading(false); });
  }
  useEffect(() => { load(); }, []);

  function abrir(emp) {
    play('tap');
    setEditando(emp);
    setSeleccion(emp.roles.map((r) => r.role_id));
  }

  async function guardar() {
    try {
      await api.setEmployeeRoles(editando.id, seleccion);
      play('success');
      toast('Cargos actualizados');
      setEditando(null);
      await load();
    } catch (err) { play('error'); toast(err.message); }
  }

  async function cambiarEstado(emp) {
    try {
      await api.setEmployeeActive(emp.id, !emp.is_active);
      play('tap');
      toast(emp.is_active ? 'Empleado dado de baja' : 'Empleado reactivado');
      await load();
    } catch (err) { play('error'); toast(err.message); }
  }

  if (loading) return <p className="hint">Cargando equipo…</p>;

  return (
    <>
      <div className="view-head">
        <h2>Equipo</h2>
        <p>Quién trabaja aquí y qué puede hacer cada quien.</p>
      </div>

      <div className="cards" style={{ marginBottom: 30 }}>
        {employees.map((e) => (
          <article className="ocard" key={e.id}>
            <div className="ocard__top">
              <div>
                <span className="ocard__id">{e.full_name}</span>
                {!e.is_active && <span className="tag tag--bad" style={{ marginLeft: 8 }}>Inactivo</span>}
              </div>
              <span className="hint">{e.employee_code}</span>
            </div>
            <p className="hint" style={{ margin: 0 }}>{e.email}{e.phone ? ` · ${e.phone}` : ''}</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {e.roles.length === 0
                ? <span className="tag tag--quiet">Sin cargo asignado</span>
                : e.roles.map((r) => <span key={r.role_id} className="tag tag--blaze">{r.name}</span>)}
            </div>
            <div className="ocard__acts">
              <button className="btn btn--sm" onClick={() => abrir(e)}>Cambiar cargos</button>
              <button className={`btn btn--sm ${e.is_active ? 'btn--danger' : 'btn--ghost'}`}
                      onClick={() => cambiarEstado(e)}>
                {e.is_active ? 'Dar de baja' : 'Reactivar'}
              </button>
            </div>
          </article>
        ))}
      </div>

      <h3 style={{ fontSize: 20, marginBottom: 14 }}>Cargos y permisos</h3>
      <div className="cards">
        {roles.map((r) => (
          <article className="ocard" key={r.id}>
            <div className="ocard__top">
              <span className="ocard__id">{r.name}</span>
              <span className="tag tag--quiet">{r.employeeCount} {r.employeeCount === 1 ? 'persona' : 'personas'}</span>
            </div>
            <p className="hint" style={{ margin: 0 }}>{r.description}</p>
            <ul className="ocard__lines" style={{ display: 'block' }}>
              {r.permissions.map((p) => (
                <li key={p.slug} style={{ display: 'flex', gap: 8, padding: '2px 0' }}>
                  <Icon name="check" size={13} /> {p.description}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <Modal open={!!editando} onClose={() => setEditando(null)} title={`Cargos de ${editando?.full_name || ''}`}>
        <p className="hint" style={{ marginBottom: 14 }}>
          Una persona puede tener varios cargos. Los permisos se suman.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {roles.map((r) => {
            const on = seleccion.includes(r.id);
            return (
              <button key={r.id} type="button"
                      className={`demo-card${on ? ' on' : ''}`}
                      style={on ? { borderColor: 'var(--blaze)', background: 'var(--blaze-wash)' } : undefined}
                      onClick={() => {
                        play('tap');
                        setSeleccion((s) => on ? s.filter((x) => x !== r.id) : [...s, r.id]);
                      }}>
                <b>{on ? '✓ ' : ''}{r.name}</b>
                <small>{r.description}</small>
              </button>
            );
          })}
        </div>
        <button className="btn btn--primary btn--block" style={{ marginTop: 16 }} onClick={guardar}>
          Guardar cargos
        </button>
      </Modal>
    </>
  );
}
