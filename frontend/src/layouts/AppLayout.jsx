import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { VIEWS, viewsFor } from '../config.js';
import Icon from '../components/Icon.jsx';
import { publicUrl } from '../utils/publicUrl.js';
import { useTheme } from '../context/ThemeContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../api.js';

function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button className="theme-toggle" onClick={toggleTheme} aria-label="Cambiar tema">
      <Icon name={isDark ? 'sun' : 'moon'} size={17} />
    </button>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [reiniciando, setReiniciando] = useState(false);
  const toast = useToast();
  // El menú se arma con los permisos reales, no con un cargo fijo.
  const allowed = viewsFor(user?.permissions || []);

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  function handleLogout() {
    logout();
    window.location.assign('/');
  }

  async function handleReiniciar() {
    const ok = window.confirm(
      'Esto borra pedidos, domicilios e inventario actuales y deja la demo ' +
      'como al principio. ¿Continuar?'
    );
    if (!ok) return;
    setReiniciando(true);
    try {
      await api.reiniciarDemo();
      toast('Datos de demostración restaurados');
      window.location.reload();
    } catch (err) {
      toast(err.message);
    } finally {
      setReiniciando(false);
    }
  }

  const enlaces = allowed.map((key) => (
    <NavLink key={key} to={VIEWS[key].path} end={key === 'dashboard'}
      className={({ isActive }) => `side__item${isActive ? ' active' : ''}`}>
      <Icon name={VIEWS[key].icon} />
      <span>{VIEWS[key].label}</span>
    </NavLink>
  ));

  const seccionActual = allowed.map((k) => VIEWS[k]).find((v) => v.path === location.pathname)?.label || 'Panel';

  return (
    <div id="app" className="active">
      <aside className="side">
        <div className="side__brand">
          <img src={publicUrl('/images/logo.svg')} width="32" height="32" alt="" />
          <div><b>CIMA SPORT</b><small>PANEL INTERNO</small></div>
        </div>
        <nav className="side__nav">{enlaces}</nav>
        <div className="side__foot">
          {(user.permissions || []).includes('demo.reiniciar') && (
            <button className="side__item" onClick={handleReiniciar} disabled={reiniciando} data-testid="btn-reiniciar">
              <Icon name="refresh" /><span>{reiniciando ? 'Reiniciando…' : '[DEMO] Reiniciar datos'}</span>
            </button>
          )}
          <button className="side__item" onClick={handleLogout} data-testid="btn-logout">
            <Icon name="logout" /><span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="appbar">
          <div className="appbar__id">
            <img src={publicUrl('/images/logo.svg')} width="34" height="34" alt="" />
            <div className="appbar__text">
              <b>{user.name}</b>
              <small>{user.roles?.map((r) => r.name).join(' · ') || 'Empleado'} · {seccionActual}</small>
            </div>
          </div>
          <div className="appbar__actions">
            <ThemeToggle />
            <button className="appbar__menu-btn" onClick={() => setMenuOpen((v) => !v)} aria-expanded={menuOpen}>
              <Icon name={menuOpen ? 'x' : 'menu'} size={20} />
            </button>
          </div>
        </header>

        {menuOpen && <div className="appdrawer__backdrop" onClick={() => setMenuOpen(false)} />}
        <nav className={`appdrawer${menuOpen ? ' open' : ''}`}>
          <div className="appdrawer__head">Secciones</div>
          <div className="appdrawer__links">{enlaces}</div>
          {(user.permissions || []).includes('demo.reiniciar') && (
            <button className="side__item" onClick={handleReiniciar} disabled={reiniciando} style={{ padding: '15px 20px', borderBottom: '1px solid var(--line)' }}>
              <Icon name="refresh" size={17} /><span>{reiniciando ? 'Reiniciando…' : '[DEMO] Reiniciar datos'}</span>
            </button>
          )}
          <button className="appdrawer__logout" onClick={handleLogout} data-testid="btn-logout">
            <Icon name="logout" size={17} /><span>Cerrar sesión</span>
          </button>
        </nav>

        <header className="topbar">
          <div><h1>{user.name}</h1><div className="topbar__meta">{user.roles?.map((r) => r.name).join(' · ') || 'Empleado'} · CIMA SPORT</div></div>
          <div className="topbar__actions">
            <ThemeToggle />
            <span className="role-pill active">{user.roles?.map((r) => r.name).join(' · ') || 'Empleado'}</span>
          </div>
        </header>

        <main><Outlet /></main>
      </div>
    </div>
  );
}
