import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useSound } from '../context/SoundContext.jsx';
import { publicUrl } from '../utils/publicUrl.js';
import { PORTFOLIO_URL } from '../config/links.js';
import Icon from '../components/Icon.jsx';

const LINKS = [
  { to: '/tienda/calzado', label: 'Calzado' },
  { to: '/tienda/urbano', label: 'Urbano' },
  { to: '/tienda/fitness', label: 'Fitness' },
  { to: '/servicios', label: 'Personalización' },
];

export default function StoreLayout() {
  const { count } = useCart();
  const { customer } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { play, enabled: sonido, toggle: toggleSonido } = useSound();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [q, setQ] = useState('');
  const [pop, setPop] = useState(false);
  const prevCount = useRef(count);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // El contador del carrito late cuando cambia, para confirmar la acción.
  useEffect(() => {
    if (count > prevCount.current) {
      setPop(true);
      const t = setTimeout(() => setPop(false), 460);
      return () => clearTimeout(t);
    }
    prevCount.current = count;
  }, [count]);

  function buscar(e) {
    e.preventDefault();
    if (!q.trim()) return;
    play('tap');
    navigate(`/tienda?q=${encodeURIComponent(q.trim())}`);
    setOpen(false);
  }

  // Si se llegó desde el portafolio, volver es un paso atrás en el historial:
  // instantáneo y sin depender de que el portafolio esté levantado.
  function volverAlPortafolio(e) {
    try {
      const vengoDeAhi = document.referrer &&
        new URL(document.referrer).origin === new URL(PORTFOLIO_URL).origin;
      if (vengoDeAhi && window.history.length > 1) {
        e.preventDefault();
        window.history.back();
      }
    } catch { /* si la URL no parsea, se sigue el enlace normal */ }
  }

  return (
    <>
      <div className="demo-bar">
        <a href={PORTFOLIO_URL} onClick={volverAlPortafolio} data-testid="link-portafolio">
          <Icon name="arrowLeft" size={14} />
          <span>Volver al portafolio</span>
        </a>
        <span className="demo-bar__tag">Proyecto de demostración</span>
      </div>
      <header className={`nav${scrolled ? ' nav--scrolled' : ''}`}>
        <div className="wrap nav__bar">
          <Link to="/" className="nav__brand" onClick={() => play('tap')}>
            <img src={publicUrl('/images/logo.svg')} alt="" width="30" height="30" />
            <span>CIMA SPORT</span>
          </Link>

          <nav className="nav__links">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} onClick={() => play('tap')}>{l.label}</NavLink>
            ))}
          </nav>

          <form className="nav__search" onSubmit={buscar} role="search">
            <Icon name="search" size={15} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar prendas" aria-label="Buscar prendas" />
          </form>

          <div className="nav__actions">
            <button
              className="icon-btn icon-btn--round"
              onClick={() => { play('tap'); toggleSonido(); }}
              aria-label={sonido ? 'Silenciar sonidos' : 'Activar sonidos'}
              title={sonido ? 'Silenciar sonidos' : 'Activar sonidos'}
            >
              <Icon name={sonido ? 'volume' : 'volumeOff'} size={17} />
            </button>
            <button
              className="icon-btn icon-btn--round"
              onClick={() => { play('tap'); toggleTheme(); }}
              aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              title={isDark ? 'Modo claro' : 'Modo oscuro'}
            >
              <Icon name={isDark ? 'sun' : 'moon'} size={17} />
            </button>

            {/* Con leyenda, no solo icono: se lee qué hace antes de tocarlo */}
            <Link to="/cuenta" className="icon-btn" onClick={() => play('tap')}>
              <Icon name="user" size={17} />
              <span className="only-wide">{customer ? customer.name.split(' ')[0] : 'Entrar'}</span>
            </Link>

            <Link to="/carrito" className="icon-btn" onClick={() => play('tap')}>
              <Icon name="cart" size={17} />
              <span className="only-wide">Carrito</span>
              {count > 0 && <span className={`icon-btn__count${pop ? ' icon-btn__count--pop' : ''}`}>{count}</span>}
            </Link>

            <button
              className="icon-btn icon-btn--round nav__burger"
              onClick={() => { play('tap'); setOpen((v) => !v); }}
              aria-expanded={open}
              aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            >
              <Icon name={open ? 'x' : 'menu'} size={19} />
            </button>
          </div>
        </div>

        {open && (
          <>
            <div className="drawer-scrim" onClick={() => setOpen(false)} />
            <div className="drawer">
              <form className="drawer__search" onSubmit={buscar} role="search">
                <Icon name="search" size={16} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar prendas" aria-label="Buscar prendas" />
              </form>
              <nav className="drawer__links">
                {LINKS.map((l) => (
                  <NavLink key={l.to} to={l.to}>
                    {l.label}<Icon name="chevronRight" size={16} />
                  </NavLink>
                ))}
                <NavLink to="/cuenta">
                  {customer ? `Mi cuenta · ${customer.name.split(' ')[0]}` : 'Iniciar sesión o registrarse'}
                  <Icon name="chevronRight" size={16} />
                </NavLink>
              </nav>
              <div className="drawer__foot">
                <button className="btn btn--sm btn--ghost" onClick={() => { play('tap'); toggleSonido(); }}>
                  <Icon name={sonido ? 'volume' : 'volumeOff'} size={15} />
                  {sonido ? 'Sonido activado' : 'Sonido silenciado'}
                </button>
                <button className="btn btn--sm btn--ghost" onClick={() => { play('tap'); toggleTheme(); }}>
                  <Icon name={isDark ? 'sun' : 'moon'} size={15} />
                  {isDark ? 'Modo claro' : 'Modo oscuro'}
                </button>
              </div>
            </div>
          </>
        )}
      </header>

      <main><Outlet /></main>

      <footer className="foot">
        <div className="wrap">
          <div className="foot__grid">
            <div>
              <span className="foot__brand">CIMA SPORT</span>
              <p>Calzado y ropa deportiva para entrenar, correr o salir a la calle. Envíos a todo el país.</p>
            </div>
            <div>
              <h4>Tienda</h4>
              <Link to="/tienda/calzado">Calzado</Link>
              <Link to="/tienda/urbano">Urbano</Link>
              <Link to="/tienda/fitness">Fitness</Link>
            </div>
            <div>
              <h4>Personalización</h4>
              <Link to="/servicios">Bordado</Link>
              <Link to="/servicios">Estampado</Link>
              <Link to="/servicios">Confección a medida</Link>
            </div>
            <div>
              <h4>Contacto</h4>
              <a href="https://wa.me/573000000000"><Icon name="phone" size={15} /> WhatsApp</a>
              <span className="f"><Icon name="pin" size={15} /> Cali, Colombia</span>
              <Link to="/staff/login"><Icon name="user" size={15} /> Acceso del equipo</Link>
            </div>
          </div>
          <p className="foot__note">
            Catálogo de demostración. Las marcas mostradas pertenecen a sus respectivos titulares.
          </p>
        </div>
      </footer>
    </>
  );
}
