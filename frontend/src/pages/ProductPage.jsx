import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, formatCOP } from '../api.js';
import { publicUrl } from '../utils/publicUrl.js';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useSound } from '../context/SoundContext.jsx';
import Icon from '../components/Icon.jsx';

export default function ProductPage() {
  const { slug } = useParams();
  const { addItem } = useCart();
  const toast = useToast();
  const { play } = useSound();
  const [product, setProduct] = useState(null);
  const [size, setSize] = useState(null);
  const [color, setColor] = useState(null);
  const [foto, setFoto] = useState(0);
  // La barra fija de compra solo aparece cuando el botón normal ya se salió
  // de pantalla — mostrarlas juntas es redundante y come espacio en móvil.
  const [ctaOculto, setCtaOculto] = useState(false);
  const ctaRef = useRef(null);

  useEffect(() => {
    setProduct(null); setFoto(0);
    api.getProduct(slug).then((p) => {
      setProduct(p);
      const first = p.variants.find((v) => v.stock > 0) || p.variants[0];
      setSize(first?.size); setColor(first?.color);
    }).catch(() => toast('No pudimos cargar la prenda.'));
  }, [slug]);

  useEffect(() => {
    if (!product || !ctaRef.current) return;
    const io = new IntersectionObserver(([entry]) => setCtaOculto(!entry.isIntersecting), { threshold: 0 });
    io.observe(ctaRef.current);
    return () => io.disconnect();
  }, [product]);

  if (!product) {
    return <div className="wrap"><div className="pdp"><div className="pdp__stage" /><div /></div></div>;
  }

  const imgs = product.images || [];
  const tallas = [...new Set(product.variants.map((v) => v.size))];
  const coloresDeTalla = [...new Set(product.variants.filter((v) => v.size === size).map((v) => v.color))];
  const variant = product.variants.find((v) => v.size === size && v.color === color);
  const precio = variant?.price_override ?? product.base_price;

  function elegirTalla(s) {
    play('tap');
    setSize(s);
    const disp = product.variants.filter((v) => v.size === s);
    if (!disp.some((v) => v.color === color)) setColor(disp[0]?.color);
  }

  function mover(dir) {
    if (imgs.length < 2) return;
    play('swipe');
    setFoto((f) => (f + dir + imgs.length) % imgs.length);
  }

  function agregar() {
    if (!variant || variant.stock === 0) { play('error'); return toast('Esa combinación está agotada.'); }
    addItem(variant, product, 1);
    play('add');
    toast(`${product.name} · talla ${variant.size} agregada`);
  }

  const estado = !variant ? null
    : variant.stock === 0 ? { c: 'out', t: 'Agotado en esta combinación' }
    : variant.stock <= 4 ? { c: 'low', t: `Quedan ${variant.stock} unidades` }
    : { c: 'ok', t: 'Disponible' };

  return (
    <div className="wrap">
      <div className="pdp">
        <div className="pdp__gallery">
          <div className="pdp__stage">
            {imgs.map((im, i) => (
              <img key={im.id} src={publicUrl(im.image_path)} alt={i === foto ? product.name : ''}
                   className={i === foto ? 'on' : ''} aria-hidden={i !== foto} />
            ))}
            {imgs.length > 1 && (
              <>
                <button className="pdp__nav pdp__nav--prev" onClick={() => mover(-1)} aria-label="Foto anterior">
                  <Icon name="chevronLeft" size={18} />
                </button>
                <button className="pdp__nav pdp__nav--next" onClick={() => mover(1)} aria-label="Foto siguiente">
                  <Icon name="chevronRight" size={18} />
                </button>
              </>
            )}
          </div>
          {imgs.length > 1 && (
            <div className="pdp__thumbs">
              {imgs.map((im, i) => (
                <button key={im.id} className={i === foto ? 'on' : ''}
                        onClick={() => { play('swipe'); setFoto(i); }}
                        aria-label={`Ver foto ${i + 1}`}>
                  <img src={publicUrl(im.image_path)} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pdp__info">
          {product.brand && <div className="pdp__brand">{product.brand}</div>}
          <h1>{product.name}</h1>
          <div className="pdp__price num">{formatCOP(precio)}</div>
          <p className="pdp__desc">{product.description}</p>

          <div className="field-group">
            <label>Talla</label>
            <div className="chips">
              {tallas.map((s) => {
                const hay = product.variants.filter((v) => v.size === s).reduce((a, v) => a + v.stock, 0);
                return (
                  <button key={s} className={`chip${size === s ? ' on' : ''}`}
                          onClick={() => elegirTalla(s)} disabled={hay === 0}>{s}</button>
                );
              })}
            </div>
          </div>

          {coloresDeTalla.length > 1 && (
            <div className="field-group">
              <label>Color</label>
              <div className="chips">
                {coloresDeTalla.map((c) => (
                  <button key={c} className={`chip${color === c ? ' on' : ''}`}
                          onClick={() => { play('tap'); setColor(c); }}>{c}</button>
                ))}
              </div>
            </div>
          )}

          {estado && (
            <div className={`stock-line stock-line--${estado.c}`}><i />{estado.t}</div>
          )}

          <button ref={ctaRef} className="btn btn--primary btn--block" onClick={agregar}
                  disabled={!variant || variant.stock === 0} style={{ padding: '16px' }}>
            <Icon name="cart" size={17} /> Agregar al carrito
          </button>

          <p className="hint" style={{ marginTop: 14 }}>
            Envío gratis desde $150.000. Pago contraentrega disponible en Cali.
          </p>

          <Link to="/tienda" className="auth__back" style={{ marginTop: 20 }} onClick={() => play('tap')}>
            <Icon name="arrowLeft" size={15} /> Seguir viendo
          </Link>
        </div>
      </div>

      {/* En móvil el precio y el botón viven fijos abajo, al alcance del pulgar */}
      <div className={`buy-bar${ctaOculto ? ' buy-bar--show' : ''}`}>
        <div className="buy-bar__price">
          <small>{size ? `Talla ${size}` : 'Elige talla'}</small>
          <b className="num">{formatCOP(precio)}</b>
        </div>
        <button className="btn btn--primary" onClick={agregar} disabled={!variant || variant.stock === 0}>
          <Icon name="cart" size={16} /> Agregar
        </button>
      </div>
    </div>
  );
}
