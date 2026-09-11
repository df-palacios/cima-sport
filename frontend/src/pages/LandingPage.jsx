import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { publicUrl } from '../utils/publicUrl.js';
import { useSound } from '../context/SoundContext.jsx';
import { useReveal } from '../hooks/useReveal.js';
import Icon from '../components/Icon.jsx';
import ProductCard from '../components/ProductCard.jsx';

// Secuencia del hero. Cada escena se sirve en cuatro anchos para que el
// navegador baje solo el que necesita: en un teléfono no tiene sentido
// descargar 2560px. Antes se estiraba una foto de 500px a pantalla completa.
const ANCHOS = [828, 1280, 1920, 2560];
const ESCENAS = [
  { base: '/images/hero/pista-atardecer', alt: 'Corredor en la pista al atardecer' },
  { base: '/images/hero/entrenamiento', alt: 'Entrenamiento de fuerza en el gimnasio' },
];

function srcset(base, ext) {
  return ANCHOS.map((a) => `${publicUrl(`${base}-${a}.${ext}`)} ${a}w`).join(', ');
}

const CATEGORIAS = [
  { slug: 'calzado', label: 'Calzado', desc: 'Running, entrenamiento y calle', img: '/images/calzado/pexels-photo-9400770.jpg' },
  { slug: 'urbano', label: 'Urbano', desc: 'Hoodies, buzos y chaquetas', img: '/images/urbano/pexels-photo-33356325.jpg' },
  { slug: 'fitness', label: 'Fitness', desc: 'Conjuntos y leggings', img: '/images/fitness/pexels-photo-9634895.jpg' },
  { slug: 'calzado', label: 'Novedades', desc: 'Lo último que llegó', img: '/images/calzado/pexels-photo-38154578.jpg' },
];

export default function LandingPage() {
  const [escena, setEscena] = useState(0);
  const [destacados, setDestacados] = useState([]);
  const { play } = useSound();
  const revCat = useReveal();
  const revProd = useReveal();
  const revServ = useReveal();

  useEffect(() => {
    api.getProducts().then((all) => setDestacados(all.slice(0, 8))).catch(() => {});
  }, []);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setEscena((i) => (i + 1) % ESCENAS.length), 6000);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <section className="hero">
        <div className="hero__media">
          {ESCENAS.map((e, i) => (
            <picture key={e.base} className={i === escena ? 'on' : ''} aria-hidden={i !== escena}>
              <source type="image/webp" srcSet={srcset(e.base, 'webp')} sizes="100vw" />
              <img
                src={publicUrl(`${e.base}-1280.jpg`)}
                srcSet={srcset(e.base, 'jpg')}
                sizes="100vw"
                alt={i === escena ? e.alt : ''}
                fetchPriority={i === 0 ? 'high' : 'low'}
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
              />
            </picture>
          ))}
        </div>
        <div className="hero__veil" />
        <div className="hero__grain" />
        <div className="wrap hero__inner">
          <span className="hero__kicker"><i />Envío gratis desde $150.000</span>
          <h1 className="hero__title display">
            <span><b>Muévete</b></span>
            <span><b>a tu cima</b></span>
          </h1>
          <p className="hero__sub">
            Calzado, ropa urbana y fitness para entrenar, correr o simplemente salir.
            Cambios sin costo dentro de Cali.
          </p>
          <div className="hero__cta">
            <Link to="/tienda" className="btn btn--primary" onClick={() => play('tap')}>
              Ver la tienda <Icon name="chevronRight" size={16} />
            </Link>
            <Link to="/servicios" className="btn btn--ghost" onClick={() => play('tap')}>
              Personalizar uniformes
            </Link>
          </div>
        </div>
        <div className="hero__dots">
          {ESCENAS.map((e, i) => (
            <button key={e.base} aria-current={i === escena}
                    aria-label={`Escena ${i + 1}`}
                    onClick={() => { play('swipe'); setEscena(i); }} />
          ))}
        </div>
      </section>

      <div className="wrap">
        <div className="rule" />
        <section ref={revCat} className="reveal">
          <div className="sec-head">
            <h2>Compra por categoría</h2>
            <Link to="/tienda" onClick={() => play('tap')}>Ver todo <Icon name="chevronRight" size={15} /></Link>
          </div>
          <div className="bento">
            {CATEGORIAS.map((c) => (
              <Link key={c.label} to={`/tienda/${c.slug}`} className="bento__cell" onClick={() => play('tap')}>
                <img src={publicUrl(c.img)} alt={c.label} loading="lazy" />
                <div className="bento__label">
                  <div>
                    <b>{c.label}</b>
                    <small>{c.desc}</small>
                  </div>
                  <span className="bento__go"><Icon name="chevronRight" size={16} /></span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <div className="rule" />
        <section ref={revProd} className="reveal">
          <div className="sec-head">
            <h2>Lo más pedido</h2>
            <Link to="/tienda" onClick={() => play('tap')}>Ver catálogo <Icon name="chevronRight" size={15} /></Link>
          </div>
          {destacados.length === 0 ? (
            <div className="grid">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card"><div className="card__media" /></div>
              ))}
            </div>
          ) : (
            <div className="grid">
              {destacados.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </section>

        <div className="rule" />
        <section ref={revServ} className="reveal" style={{ paddingBottom: 20 }}>
          <div className="bento" style={{ gridAutoRows: '220px' }}>
            <Link to="/servicios" className="bento__cell" style={{ gridColumn: 'span 4', gridRow: 'span 1' }} onClick={() => play('tap')}>
              <img src={publicUrl('/images/urbano/pexels-photo-12555806.jpg')} alt="" loading="lazy" />
              <div className="bento__label">
                <div>
                  <b>Uniformes para tu equipo o colegio</b>
                  <small>Bordado, estampado y confección a medida. Cotiza sin compromiso.</small>
                </div>
                <span className="bento__go"><Icon name="chevronRight" size={16} /></span>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
