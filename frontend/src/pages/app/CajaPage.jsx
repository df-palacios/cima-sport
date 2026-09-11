import { useEffect, useMemo, useState } from 'react';
import { api, formatCOP } from '../../api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useSound } from '../../context/SoundContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import Icon from '../../components/Icon.jsx';
import Modal from '../../components/Modal.jsx';

const MEDIOS = [
  { valor: 'efectivo', etiqueta: 'Efectivo', icono: 'wallet' },
  { valor: 'tarjeta', etiqueta: 'Tarjeta', icono: 'circleCheck' },
  { valor: 'transferencia', etiqueta: 'Transferencia', icono: 'arrowRight' },
  { valor: 'contraentrega', etiqueta: 'Contraentrega', icono: 'truck' },
];

// IVA general para ropa y calzado. Debe coincidir con backend/src/fiscal.js
const IVA = 19;

export default function CajaPage() {
  const toast = useToast();
  const { play } = useSound();
  const { can } = useAuth();
  const puedeOperar = can('caja.operar');

  const [caja, setCaja] = useState(null);
  const [pendientes, setPendientes] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [abrirModal, setAbrirModal] = useState(false);
  const [base, setBase] = useState('200000');
  const [cerrarModal, setCerrarModal] = useState(false);
  const [contado, setContado] = useState('');
  const [arqueo, setArqueo] = useState(null);

  const [cobrando, setCobrando] = useState(null);
  const [medio, setMedio] = useState('efectivo');
  const [recibido, setRecibido] = useState('');
  const [descuento, setDescuento] = useState('');
  const [cliente, setCliente] = useState({ name: '', doc: '' });
  const [tirilla, setTirilla] = useState(null);

  async function cargar() {
    const [c, p] = await Promise.all([api.getCashSession(), api.getPendingCharges()]);
    setCaja(c); setPendientes(p); setCargando(false);
  }
  useEffect(() => { cargar().catch((e) => { toast(e.message); setCargando(false); }); }, []);

  // El precio de vitrina ya incluye IVA: la base se saca hacia atrás.
  const calculo = useMemo(() => {
    if (!cobrando) return null;
    const subtotal = cobrando.total;
    const desc = Math.min(Math.max(0, Number(descuento) || 0), subtotal);
    const total = subtotal - desc;
    const taxBase = Math.round(total / (1 + IVA / 100));
    const impuesto = total - taxBase;
    const entregado = Number(recibido) || 0;
    return { subtotal, desc, taxBase, impuesto, total, vuelto: Math.max(0, entregado - total) };
  }, [cobrando, descuento, recibido]);

  function abrirCobro(order) {
    play('tap');
    setCobrando(order); setMedio('efectivo'); setRecibido(''); setDescuento('');
    setCliente({ name: order.customer_name || '', doc: '' });
  }

  async function confirmarCobro() {
    if (!calculo) return;
    if (medio === 'efectivo' && (Number(recibido) || 0) < calculo.total) {
      play('error');
      return toast('El efectivo recibido no alcanza para el total.');
    }
    try {
      const res = await api.payOrder(cobrando.id, {
        discount: calculo.desc,
        customerName: cliente.name || undefined,
        customerDoc: cliente.doc || undefined,
        payments: [{
          method: medio,
          amount: calculo.total,
          received: medio === 'efectivo' ? Number(recibido) : undefined,
        }],
      });
      play('success');
      toast(`Cobro registrado · ${res.documento.prefix}-${res.documento.number}`);
      setCobrando(null);
      const t = await api.getReceipt(res.documento.order_id);
      setTirilla({ ...t, vuelto: res.vuelto });
      await cargar();
    } catch (err) { play('error'); toast(err.message); }
  }

  async function abrirCaja() {
    try { await api.openCashSession(Number(base) || 0); play('success'); toast('Caja abierta'); setAbrirModal(false); await cargar(); }
    catch (err) { play('error'); toast(err.message); }
  }

  async function cerrarCaja() {
    try { const r = await api.closeCashSession(Number(contado) || 0); play('success'); setArqueo(r); setCerrarModal(false); await cargar(); }
    catch (err) { play('error'); toast(err.message); }
  }

  if (cargando) return <p className="hint">Cargando caja…</p>;
  const resumen = caja?.resumen;

  return (
    <>
      <div className="view-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <h2>Caja</h2>
          <p>Cobra los pedidos, entrega el comprobante y cuadra el turno al cerrar.</p>
        </div>
        {puedeOperar && (caja?.abierta ? (
          <button className="btn btn--sm" onClick={() => { play('tap'); setContado(''); setCerrarModal(true); }}>
            <Icon name="logout" size={15} /> Cerrar caja
          </button>
        ) : (
          <button className="btn btn--sm btn--primary" onClick={() => { play('tap'); setAbrirModal(true); }}>
            <Icon name="wallet" size={15} /> Abrir caja
          </button>
        ))}
      </div>

      {!caja?.abierta ? (
        <div className="empty">
          <Icon name="wallet" size={30} />
          <b>La caja está cerrada</b>
          <p>
            Ábrela indicando con cuánto efectivo empiezas. Sin caja abierta los
            cobros no quedan asociados a ningún turno y no se puede cuadrar.
          </p>
          {puedeOperar && (
            <button className="btn btn--primary" onClick={() => { play('tap'); setAbrirModal(true); }}>Abrir caja</button>
          )}
        </div>
      ) : (
        <>
          <div className="kpis">
            <div className="kpi"><i><Icon name="wallet" size={16} /></i><b className="num">{formatCOP(resumen.efectivoEsperado)}</b><span>Efectivo esperado en caja</span></div>
            <div className="kpi"><i><Icon name="trending" size={16} /></i><b className="num">{formatCOP(resumen.totalCobrado)}</b><span>Cobrado en el turno</span></div>
            <div className="kpi"><i><Icon name="ticket" size={16} /></i><b>{resumen.pagosCount}</b><span>Cobros realizados</span></div>
            <div className="kpi"><i><Icon name="package" size={16} /></i><b>{pendientes.length}</b><span>Pedidos por cobrar</span></div>
          </div>

          <h3 style={{ fontSize: 19, margin: '26px 0 14px' }}>Por cobrar</h3>
          {pendientes.length === 0 ? (
            <div className="empty"><Icon name="check" size={28} /><b>Todo cobrado</b><p>No hay pedidos pendientes de pago.</p></div>
          ) : (
            <div className="cards">
              {pendientes.map((o) => (
                <article className="ocard" key={o.id}>
                  <div className="ocard__top">
                    <div>
                      <span className="ocard__id">#{o.id}</span>
                      <span className="tag tag--quiet" style={{ marginLeft: 8 }}>{o.channel === 'tienda' ? 'Tienda' : 'Online'}</span>
                    </div>
                    <span className="num" style={{ fontWeight: 700 }}>{formatCOP(o.total)}</span>
                  </div>
                  <p className="hint" style={{ margin: 0 }}>{o.customer_name} · {o.customer_phone}</p>
                  <ul className="ocard__lines">
                    {o.items.map((i) => (
                      <li key={i.id}><span>{i.quantity}x {i.product_name} ({i.size})</span><span className="num">{formatCOP(i.unit_price * i.quantity)}</span></li>
                    ))}
                  </ul>
                  {puedeOperar && (
                    <div className="ocard__acts">
                      <button className="btn btn--sm btn--primary btn--block" onClick={() => abrirCobro(o)}>
                        Cobrar {formatCOP(o.total)}
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {/* ---------- Abrir caja ---------- */}
      <Modal open={abrirModal} onClose={() => setAbrirModal(false)} title="Abrir caja">
        <div className="field-group">
          <label htmlFor="c-base">Base inicial en efectivo</label>
          <input id="c-base" className="field" type="number" min="0" step="1000" value={base}
                 onChange={(e) => setBase(e.target.value)} />
          <span className="hint">Es la plata con la que arrancas el turno, para dar vueltos.</span>
        </div>
        <button className="btn btn--primary btn--block" onClick={abrirCaja}>Abrir caja</button>
      </Modal>

      {/* ---------- Cobro ---------- */}
      <Modal open={!!cobrando} onClose={() => setCobrando(null)} title={`Cobrar pedido #${cobrando?.id ?? ''}`}>
        {calculo && (
          <>
            <div className="totals" style={{ borderTop: 'none', marginTop: 0 }}>
              <div><span>Subtotal</span><span className="num">{formatCOP(calculo.subtotal)}</span></div>
              {calculo.desc > 0 && <div><span>Descuento</span><span className="num">−{formatCOP(calculo.desc)}</span></div>}
              <div style={{ fontSize: 13 }}><span>Base gravable</span><span className="num">{formatCOP(calculo.taxBase)}</span></div>
              <div style={{ fontSize: 13 }}><span>IVA {IVA}%</span><span className="num">{formatCOP(calculo.impuesto)}</span></div>
              <div className="totals__grand"><span>Total a cobrar</span><span className="num">{formatCOP(calculo.total)}</span></div>
            </div>

            <div className="field-group">
              <label>Medio de pago</label>
              <div className="chips">
                {MEDIOS.map((m) => (
                  <button key={m.valor} type="button" className={`chip${medio === m.valor ? ' on' : ''}`}
                          onClick={() => { play('tap'); setMedio(m.valor); }}>
                    {m.etiqueta}
                  </button>
                ))}
              </div>
            </div>

            {medio === 'efectivo' && (
              <div className="field-group">
                <label htmlFor="c-rec">¿Con cuánto paga?</label>
                <input id="c-rec" className="field" type="number" min="0" step="1000" value={recibido}
                       placeholder={String(calculo.total)} aria-label="Efectivo recibido"
                       onChange={(e) => setRecibido(e.target.value)} />
                {calculo.vuelto > 0 && (
                  <div className="change-box">Vuelto <b className="num">{formatCOP(calculo.vuelto)}</b></div>
                )}
              </div>
            )}

            <details style={{ marginBottom: 16 }}>
              <summary className="hint" style={{ cursor: 'pointer', padding: '8px 0' }}>Descuento y datos del cliente</summary>
              <div className="field-group" style={{ marginTop: 12 }}>
                <label htmlFor="c-desc">Descuento (COP)</label>
                <input id="c-desc" className="field" type="number" min="0" step="1000" value={descuento}
                       placeholder="0" onChange={(e) => setDescuento(e.target.value)} />
              </div>
              <div className="row2">
                <div className="field-group">
                  <label htmlFor="c-nom">Nombre</label>
                  <input id="c-nom" className="field" value={cliente.name}
                         onChange={(e) => setCliente({ ...cliente, name: e.target.value })} />
                </div>
                <div className="field-group">
                  <label htmlFor="c-doc">NIT / Cédula</label>
                  <input id="c-doc" className="field" value={cliente.doc} placeholder="Opcional"
                         onChange={(e) => setCliente({ ...cliente, doc: e.target.value })} />
                </div>
              </div>
              <span className="hint">Si el cliente se identifica, se emite factura en vez de documento POS.</span>
            </details>

            <button className="btn btn--primary btn--block" onClick={confirmarCobro} style={{ padding: 15 }}>
              Confirmar cobro · {formatCOP(calculo.total)}
            </button>
          </>
        )}
      </Modal>

      {/* ---------- Comprobante ---------- */}
      <Modal open={!!tirilla} onClose={() => setTirilla(null)} title="Comprobante">
        {tirilla && (
          <>
            <div className="receipt" id="tirilla">
              <div className="receipt__head">
                <b>CIMA SPORT</b>
                <span>Cali, Valle del Cauca</span>
              </div>
              <div className="receipt__doc">
                <span>{tirilla.documento.doc_type === 'POS' ? 'Documento equivalente POS' : 'Factura de venta'}</span>
                <b>{tirilla.documento.prefix}-{tirilla.documento.number}</b>
              </div>
              <ul className="receipt__items">
                {tirilla.items.map((i) => (
                  <li key={i.id}>
                    <span>{i.quantity}x {i.product_name} ({i.size})</span>
                    <span className="num">{formatCOP(i.unit_price * i.quantity)}</span>
                  </li>
                ))}
              </ul>
              <div className="receipt__totals">
                <div><span>Base gravable</span><span className="num">{formatCOP(tirilla.documento.tax_base)}</span></div>
                <div><span>IVA {Number(tirilla.documento.tax_rate)}%</span><span className="num">{formatCOP(tirilla.documento.tax_amount)}</span></div>
                {tirilla.documento.discount > 0 && <div><span>Descuento</span><span className="num">−{formatCOP(tirilla.documento.discount)}</span></div>}
                <div className="receipt__grand"><span>TOTAL</span><span className="num">{formatCOP(tirilla.documento.total)}</span></div>
                {tirilla.vuelto > 0 && <div><span>Vuelto</span><span className="num">{formatCOP(tirilla.vuelto)}</span></div>}
              </div>
              <div className="receipt__foot">
                {tirilla.documento.cufe_cude
                  ? <span className="num">CUFE/CUDE: {tirilla.documento.cufe_cude}</span>
                  : <span className="receipt__pending">
                      Pendiente de transmisión a la DIAN — este comprobante todavía no
                      es un documento electrónico válido.
                    </span>}
                <span>¡Gracias por su compra!</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="btn btn--ghost" style={{ flex: 1 }} onClick={() => setTirilla(null)}>Cerrar</button>
              <button className="btn btn--primary" style={{ flex: 1 }} onClick={() => window.print()}>
                <Icon name="download" size={15} /> Imprimir
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* ---------- Cierre y arqueo ---------- */}
      <Modal open={cerrarModal} onClose={() => setCerrarModal(false)} title="Cerrar caja">
        <p className="hint" style={{ marginBottom: 14 }}>
          Cuenta el efectivo del cajón y escríbelo. El sistema lo compara con lo
          que debería haber.
        </p>
        <div className="totals" style={{ borderTop: 'none', marginTop: 0 }}>
          <div><span>Base inicial</span><span className="num">{formatCOP(caja?.sesion?.opening_amount ?? 0)}</span></div>
          <div><span>Efectivo cobrado</span><span className="num">{formatCOP(resumen?.porMedio?.efectivo ?? 0)}</span></div>
          <div className="totals__grand"><span>Debería haber</span><span className="num">{formatCOP(resumen?.efectivoEsperado ?? 0)}</span></div>
        </div>
        <div className="field-group" style={{ marginTop: 16 }}>
          <label htmlFor="c-cont">Efectivo contado</label>
          <input id="c-cont" className="field" type="number" min="0" step="1000" value={contado}
                 placeholder="0" aria-label="Efectivo contado" onChange={(e) => setContado(e.target.value)} />
        </div>
        <button className="btn btn--primary btn--block" onClick={cerrarCaja}>Cerrar turno</button>
      </Modal>

      <Modal open={!!arqueo} onClose={() => setArqueo(null)} title="Cierre de caja">
        {arqueo && (
          <>
            <div className="totals" style={{ borderTop: 'none', marginTop: 0 }}>
              <div><span>Debería haber</span><span className="num">{formatCOP(arqueo.esperado)}</span></div>
              <div><span>Contado</span><span className="num">{formatCOP(arqueo.contado)}</span></div>
              <div className="totals__grand">
                <span>Diferencia</span>
                <span className="num" style={{ color: arqueo.diferencia === 0 ? 'var(--ok)' : 'var(--bad)' }}>
                  {arqueo.diferencia > 0 ? '+' : ''}{formatCOP(arqueo.diferencia)}
                </span>
              </div>
            </div>
            <p className="hint">
              {arqueo.diferencia === 0 ? 'La caja cuadró exacta.'
                : arqueo.diferencia > 0 ? 'Sobró efectivo. Revisa si algún cobro no se registró.'
                : 'Faltó efectivo. Revisa vueltos y cobros del turno.'}
            </p>
            <button className="btn btn--primary btn--block" onClick={() => setArqueo(null)}>Entendido</button>
          </>
        )}
      </Modal>
    </>
  );
}
