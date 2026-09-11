import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, formatCOP } from '../api.js';
import { ORDER_STATUS } from '../config.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useSound } from '../context/SoundContext.jsx';
import { publicUrl } from '../utils/publicUrl.js';
import { reglasPassword, nivelPassword, passwordValida } from '../utils/password.js';
import Icon from '../components/Icon.jsx';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/**
 * Cuentas sembradas para probar la aplicación sin tener que registrarse.
 * Coinciden con backend/database/seed_rbac.sql. Cada una entra por la misma
 * puerta; lo que cambia es qué permisos trae y, por lo tanto, qué ve.
 */
const CUENTAS_PRUEBA = [
  { email: 'admin@cimasport.com',      pass: 'admin123',     rol: 'Administradora',   ve: 'Todo el panel, incluido el equipo' },
  { email: 'asesor@cimasport.com',     pass: 'asesor123',    rol: 'Asesor + domiciliario', ve: 'Pedidos, servicios y domicilios' },
  { email: 'bodega@cimasport.com',     pass: 'bodega123',    rol: 'Bodeguera',        ve: 'Catálogo e inventario' },
  { email: 'domicilios@cimasport.com', pass: 'domicilio123', rol: 'Domiciliario',     ve: 'Solo sus propias entregas' },
  { email: 'camila@correo.com',        pass: 'cliente123',   rol: 'Clienta',          ve: 'Solo la tienda, sin panel' },
];

/**
 * Historial de pedidos. Es la diferencia concreta entre comprar con cuenta y
 * comprar como invitado: quien tiene cuenta ve lo que pidió antes, en qué va
 * y con qué documento se facturó. Un invitado no tiene dónde consultarlo.
 */
function HistorialPedidos() {
  const [pedidos, setPedidos] = useState(null);

  useEffect(() => { api.getMyOrders().then(setPedidos).catch(() => setPedidos([])); }, []);

  if (pedidos === null) return <p className="hint" style={{ marginTop: 30 }}>Cargando tus pedidos…</p>;

  return (
    <section style={{ marginTop: 36 }}>
      <div className="sec-head"><h2 style={{ fontSize: 24 }}>Tus pedidos</h2></div>
      {pedidos.length === 0 ? (
        <div className="empty">
          <Icon name="package" size={28} />
          <b>Todavía no has pedido nada</b>
          <p>Cuando hagas tu primer pedido con esta cuenta, lo verás aquí con su estado.</p>
          <Link to="/tienda" className="btn btn--primary">Ver la tienda</Link>
        </div>
      ) : (
        <div className="cards">
          {pedidos.map((o) => (
            <article className="ocard" key={o.id}>
              <div className="ocard__top">
                <div>
                  <span className="ocard__id">#{o.id}</span>
                  <span className={`tag tag--${ORDER_STATUS[o.status]?.color}`} style={{ marginLeft: 8 }}>
                    {ORDER_STATUS[o.status]?.label}
                  </span>
                  {o.payment_status === 'pagado'
                    ? <span className="tag tag--ok" style={{ marginLeft: 6 }}>Pagado</span>
                    : <span className="tag tag--warn" style={{ marginLeft: 6 }}>Por pagar</span>}
                </div>
                <span className="num" style={{ fontWeight: 700 }}>{formatCOP(o.total)}</span>
              </div>
              <p className="hint" style={{ margin: 0 }}>
                {new Date(o.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                {o.shipping_address ? ` · ${o.shipping_address}` : ''}
              </p>
              <ul className="ocard__lines">
                {o.items.map((i) => (
                  <li key={i.id}>
                    <span>{i.quantity}x {i.product_name} ({i.size} · {i.color})</span>
                    <span className="num">{formatCOP(i.unit_price * i.quantity)}</span>
                  </li>
                ))}
              </ul>
              {o.documento && (
                <span className="hint">
                  Comprobante {o.documento.prefix}-{o.documento.number}
                </span>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default function AccountPage() {
  const { user, login, register, logout } = useAuth();
  const toast = useToast();
  const { play } = useSound();
  const navigate = useNavigate();
  const [modo, setModo] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tocado, setTocado] = useState({});
  const [form, setForm] = useState({ name: '', email: '', password: '', passwordConfirm: '', phone: '' });

  const esRegistro = modo === 'registro';
  const reglas = useMemo(() => reglasPassword(form.password), [form.password]);
  const fuerza = useMemo(() => nivelPassword(form.password), [form.password]);

  // Errores por campo, visibles solo cuando la persona ya pasó por el campo.
  const errores = {
    name: esRegistro && form.name.trim().length < 3 ? 'Escribe tu nombre completo.' : '',
    email: !EMAIL_RE.test(form.email) ? 'Ese correo no parece válido.' : '',
    password: esRegistro && form.password && !passwordValida(form.password) ? 'La contraseña no cumple los requisitos.' : '',
    passwordConfirm: esRegistro && form.passwordConfirm && form.password !== form.passwordConfirm
      ? 'Las dos contraseñas no coinciden.' : '',
    phone: esRegistro && form.phone && !/^\d{7,15}$/.test(form.phone.replace(/\s/g, ''))
      ? 'El teléfono debe tener entre 7 y 15 dígitos.' : '',
  };

  const puedeEnviar = esRegistro
    ? !errores.name && !errores.email && !errores.phone && passwordValida(form.password) && form.password === form.passwordConfirm
    : form.email && form.password;

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  function marcar(k) { setTocado((t) => ({ ...t, [k]: true })); }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setTocado({ name: true, email: true, password: true, passwordConfirm: true, phone: true });
    if (!puedeEnviar) { play('error'); return; }
    setLoading(true);
    try {
      if (esRegistro) await register(form);
      else await login(form.email, form.password);
      play('success');
      toast(esRegistro ? 'Cuenta creada. ¡Bienvenido!' : 'Sesión iniciada');
      navigate('/tienda');
    } catch (err) {
      play('error');
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (user) {
    return (
      <div className="wrap" style={{ paddingBlock: '48px 80px', maxWidth: 760 }}>
        <div className="empty" style={{ borderStyle: 'solid' }}>
          <Icon name="user" size={30} />
          <b>Hola, {user.name}</b>
          {user.isEmployee ? (
            <p>
              Trabajas aquí como {user.roles.map((r) => r.name).join(' y ')}.
              {user.isCustomer ? ' Tu cuenta también sirve para comprar.' : ''}
            </p>
          ) : (
            <p>Tu sesión está activa. Al pedir, tus datos se completan solos.</p>
          )}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link to="/tienda" className="btn btn--primary" onClick={() => play('tap')}>Ir a la tienda</Link>
            {user.isEmployee && (
              <Link to="/app" className="btn" onClick={() => play('tap')}>
                <Icon name="grid" size={15} /> Panel de trabajo
              </Link>
            )}
            <button className="btn btn--ghost" onClick={() => { play('tap'); logout(); toast('Sesión cerrada'); }}>
              <Icon name="logout" size={15} /> Cerrar sesión
            </button>
          </div>
        </div>

        <HistorialPedidos />
      </div>
    );
  }

  return (
    <div className="auth">
      <aside className="auth__aside">
        <img src={publicUrl('/images/hero/pista-atardecer-1280.jpg')} alt="" />
        <div className="auth__aside-copy">
          <b>Tus pedidos,<br />más rápido</b>
          <p>Guarda tus datos una vez y en la siguiente compra solo confirmas.</p>
        </div>
      </aside>

      <div className="auth__panel">
        <div className="auth__box">
          <Link to="/" className="auth__back" onClick={() => play('tap')}>
            <Icon name="arrowLeft" size={15} /> Volver a la tienda
          </Link>

          <h1>{esRegistro ? 'Crear cuenta' : 'Iniciar sesión'}</h1>
          <p className="auth__lead">
            {esRegistro
              ? 'Regístrate para guardar tus datos de entrega y seguir tus pedidos. Toma menos de un minuto.'
              : 'Entra con el correo y la contraseña que registraste. Si trabajas en la tienda, esta misma cuenta te lleva al panel.'}
          </p>

          {error && <div className="auth__err">{error}</div>}

          <form onSubmit={onSubmit} noValidate>
            {esRegistro && (
              <div className="field-group">
                <label htmlFor="a-name">Nombre completo</label>
                <input id="a-name" className={`field${tocado.name && errores.name ? ' is-error' : ''}`}
                       value={form.name} autoComplete="name" onBlur={() => marcar('name')}
                       onChange={(e) => set('name', e.target.value)} />
                {tocado.name && errores.name && <span className="field-error">{errores.name}</span>}
              </div>
            )}

            <div className="field-group">
              <label htmlFor="a-mail">Correo</label>
              <input id="a-mail" className={`field${tocado.email && errores.email ? ' is-error' : ''}`}
                     type="email" value={form.email} autoComplete="email" inputMode="email"
                     placeholder="tucorreo@ejemplo.com" onBlur={() => marcar('email')}
                     onChange={(e) => set('email', e.target.value)} />
              {tocado.email && errores.email && <span className="field-error">{errores.email}</span>}
            </div>

            <div className="field-group">
              <label htmlFor="a-pass">Contraseña</label>
              <input id="a-pass" className="field" type="password" value={form.password}
                     autoComplete={esRegistro ? 'new-password' : 'current-password'}
                     onBlur={() => marcar('password')} onChange={(e) => set('password', e.target.value)} />
              {esRegistro && form.password && (
                <>
                  <div className={`pw-meter ${fuerza.clase}`}><i /><i /><i /><i /></div>
                  <span className={`pw-label ${fuerza.clase}`}>{fuerza.etiqueta}</span>
                </>
              )}
              {esRegistro && (
                <ul className="pw-rules">
                  {reglas.map((r) => (
                    <li key={r.id} className={r.ok ? 'ok' : ''}>
                      <i>{r.ok ? '✓' : ''}</i>{r.texto}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {esRegistro && (
              <>
                <div className="field-group">
                  <label htmlFor="a-pass2">Repite la contraseña</label>
                  <input id="a-pass2" className={`field${tocado.passwordConfirm && errores.passwordConfirm ? ' is-error' : ''}`}
                         type="password" value={form.passwordConfirm} autoComplete="new-password"
                         onBlur={() => marcar('passwordConfirm')}
                         onChange={(e) => set('passwordConfirm', e.target.value)} />
                  {tocado.passwordConfirm && errores.passwordConfirm && (
                    <span className="field-error">{errores.passwordConfirm}</span>
                  )}
                  {form.passwordConfirm && !errores.passwordConfirm && form.password && (
                    <span className="pw-label is-good">Las contraseñas coinciden</span>
                  )}
                </div>

                <div className="field-group">
                  <label htmlFor="a-tel">Teléfono <span style={{ color: 'var(--steel)', fontWeight: 400 }}>(opcional)</span></label>
                  <input id="a-tel" className={`field${tocado.phone && errores.phone ? ' is-error' : ''}`}
                         value={form.phone} inputMode="tel" autoComplete="tel"
                         onBlur={() => marcar('phone')} onChange={(e) => set('phone', e.target.value)} />
                  {tocado.phone && errores.phone
                    ? <span className="field-error">{errores.phone}</span>
                    : <span className="hint">Lo usamos para avisarte cuando salga tu pedido.</span>}
                </div>
              </>
            )}

            <button className="btn btn--primary btn--block" disabled={loading || (esRegistro && !puedeEnviar)}
                    style={{ padding: 15 }}>
              {loading ? 'Un momento…' : esRegistro ? 'Crear mi cuenta' : 'Entrar a mi cuenta'}
            </button>
          </form>

          <div className="auth__switch">
            {esRegistro ? '¿Ya tienes cuenta? ' : '¿Primera vez aquí? '}
            <button onClick={() => { play('tap'); setError(''); setTocado({}); setModo(esRegistro ? 'login' : 'registro'); }}>
              {esRegistro ? 'Inicia sesión' : 'Crea una cuenta'}
            </button>
          </div>

          <p className="hint" style={{ textAlign: 'center', marginTop: 16 }}>
            También puedes comprar sin cuenta, como invitado.
          </p>

          {!esRegistro && (
            <div className="demo-box">
              <div className="demo-box__head">
                <b>¿Solo quieres probar?</b>
                <span>Toca una cuenta y se completan los datos. No tienes que registrarte.</span>
              </div>
              <div className="demo-list">
                {CUENTAS_PRUEBA.map((c) => (
                  <button
                    key={c.email}
                    type="button"
                    className="demo-card"
                    onClick={() => {
                      play('tap');
                      setError('');
                      setTocado({});
                      set('email', c.email);
                      set('password', c.pass);
                      toast(`Datos de ${c.rol} listos. Toca "Entrar a mi cuenta".`);
                    }}
                  >
                    <b>{c.rol}</b>
                    <small>{c.ve}</small>
                  </button>
                ))}
              </div>
              <span className="hint" style={{ display: 'block', marginTop: 10 }}>
                Todas usan contraseñas simples porque son de demostración.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
