import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useSound } from '../context/SoundContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api, formatCOP } from '../api.js';
import { publicUrl } from '../utils/publicUrl.js';
import Icon from '../components/Icon.jsx';

const ENVIO_GRATIS_DESDE = 150000;

export default function CartPage() {
  const { items, updateQty, removeItem, subtotal, clearCart } = useCart();
  const { customer } = useAuth();
  const toast = useToast();
  const { play } = useSound();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: customer?.name || '', phone: '', email: '', address: '', city: 'Cali',
  });
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(null);

  const envio = subtotal >= ENVIO_GRATIS_DESDE || subtotal === 0 ? 0 : 12000;
  const total = subtotal + envio;
  const falta = Math.max(0, ENVIO_GRATIS_DESDE - subtotal);
  const progreso = Math.min(100, (subtotal / ENVIO_GRATIS_DESDE) * 100);

  async function pagar(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim() || !form.city.trim()) {
      play('error');
      return toast('Faltan datos de entrega: nombre, teléfono, dirección y ciudad.');
    }
    setEnviando(true);
    try {
      const res = await api.createOrder({
        customer_name: form.name, customer_phone: form.phone,
        customer_email: form.email || undefined,
        shipping_address: form.address, city: form.city, channel: 'online',
        items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
      });
      play('success');
      setListo(res);
      clearCart();
    } catch (err) {
      play('error');
      toast(err.message);
    } finally {
      setEnviando(false);
    }
  }

  if (listo) {
    return (
      <div className="wrap" style={{ paddingBlock: '48px 80px', maxWidth: 560 }}>
        <div className="empty" style={{ borderStyle: 'solid', borderColor: 'var(--ok)', background: 'var(--ok-wash)' }}>
          <Icon name="check" size={34} />
          <b>Pedido #{listo.id} confirmado</b>
          <p>
            Total {formatCOP(listo.total)}. Te escribimos al {form.phone} para
            coordinar la entrega. El pago es contraentrega.
          </p>
          <Link to="/tienda" className="btn btn--primary" onClick={() => play('tap')}>Seguir comprando</Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="wrap" style={{ paddingBlock: '48px 80px', maxWidth: 560 }}>
        <div className="empty">
          <Icon name="cart" size={32} />
          <b>Tu carrito está vacío</b>
          <p>Cuando agregues prendas aparecerán aquí, con su talla y color.</p>
          <Link to="/tienda" className="btn btn--primary" onClick={() => play('tap')}>Ir a la tienda</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="view-head" style={{ paddingTop: 26 }}>
        <h2>Tu carrito</h2>
        <p>{items.length} {items.length === 1 ? 'prenda' : 'prendas'} listas para pedir.</p>
      </div>

      <div className="cart">
        <div>
          {items.map((i) => (
            <div className="cart__item" key={i.variantId}>
              {i.image && <img src={publicUrl(i.image)} alt="" />}
              <div className="cart__meta">
                <b>{i.productName}</b>
                <small>Talla {i.size} · {i.color}</small>
                <span className="num" style={{ fontWeight: 600 }}>{formatCOP(i.unitPrice)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="stepper">
                  <button onClick={() => { play('tap'); updateQty(i.variantId, i.quantity - 1); }}
                          disabled={i.quantity <= 1} aria-label="Quitar una unidad">
                    <Icon name="minus" size={14} />
                  </button>
                  <span className="num">{i.quantity}</span>
                  <button onClick={() => { play('tap'); updateQty(i.variantId, i.quantity + 1); }}
                          disabled={i.quantity >= i.maxStock} aria-label="Agregar una unidad">
                    <Icon name="plus" size={14} />
                  </button>
                </div>
                <button className="cart__remove" onClick={() => { play('remove'); removeItem(i.variantId); }}
                        aria-label={`Quitar ${i.productName} del carrito`}>
                  <Icon name="trash" size={17} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <form className="summary" onSubmit={pagar}>
          <h3>Datos de entrega</h3>

          <div className="field-group">
            <label htmlFor="f-name">Nombre completo</label>
            <input id="f-name" className="field" value={form.name}
                   onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
          </div>
          <div className="row2">
            <div className="field-group">
              <label htmlFor="f-phone">Teléfono</label>
              <input id="f-phone" className="field" value={form.phone} inputMode="tel" autoComplete="tel"
                     onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="field-group">
              <label htmlFor="f-city">Ciudad</label>
              <input id="f-city" className="field" value={form.city}
                     onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
          </div>
          <div className="field-group">
            <label htmlFor="f-addr">Dirección</label>
            <input id="f-addr" className="field" value={form.address} autoComplete="street-address"
                   onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Cra 45 #12-30, apto 302" />
          </div>
          <div className="field-group">
            <label htmlFor="f-mail">Correo <span style={{ color: 'var(--steel)', fontWeight: 400 }}>(opcional)</span></label>
            <input id="f-mail" className="field" type="email" value={form.email} autoComplete="email"
                   onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>

          {falta > 0 && (
            <>
              <div className="ship-meter"><i style={{ width: `${progreso}%` }} /></div>
              <p className="hint" style={{ marginBottom: 12 }}>
                Agrega {formatCOP(falta)} más y el envío te sale gratis.
              </p>
            </>
          )}

          <div className="totals">
            <div><span>Subtotal</span><span className="num">{formatCOP(subtotal)}</span></div>
            <div><span>Envío</span><span className="num">{envio === 0 ? 'Gratis' : formatCOP(envio)}</span></div>
            <div className="totals__grand"><span>Total</span><span className="num">{formatCOP(total)}</span></div>
          </div>

          <button className="btn btn--primary btn--block" disabled={enviando} style={{ marginTop: 18, padding: 16 }}>
            {enviando ? 'Confirmando…' : `Confirmar pedido · ${formatCOP(total)}`}
          </button>
          <p className="hint" style={{ textAlign: 'center', marginTop: 10 }}>
            Pagas cuando recibes. Te llamamos para coordinar la entrega.
          </p>
        </form>
      </div>
    </div>
  );
}
