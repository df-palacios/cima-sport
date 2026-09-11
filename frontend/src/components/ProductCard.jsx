import { Link } from 'react-router-dom';
import { formatCOP } from '../api.js';
import { publicUrl } from '../utils/publicUrl.js';
import { useSound } from '../context/SoundContext.jsx';

/**
 * Tarjeta de producto. La segunda foto se revela al pasar el cursor y las
 * tallas aparecen sin abrir la ficha, para decidir desde el listado.
 * En pantallas táctiles (sin hover) las tallas se muestran siempre.
 */
export default function ProductCard({ product }) {
  const { play } = useSound();
  const imgs = product.images || [];
  const first = imgs[0]?.image_path;
  const second = imgs[1]?.image_path || first;

  const tallas = [...new Set((product.variants || []).map((v) => v.size))];
  const stockPorTalla = Object.fromEntries(
    tallas.map((t) => [t, (product.variants || []).filter((v) => v.size === t).reduce((s, v) => s + v.stock, 0)])
  );
  const agotado = product.total_stock === 0;

  return (
    <Link to={`/producto/${product.slug}`} className="card" onClick={() => play('tap')}>
      <div className="card__media">
        {agotado && <span className="tag tag--bad card__flag">Agotado</span>}
        {first && <img className="is-first" src={publicUrl(first)} alt={product.name} loading="lazy" />}
        {second && <img className="is-second" src={publicUrl(second)} alt="" aria-hidden="true" loading="lazy" />}
        {tallas.length > 0 && (
          <div className="card__sizes">
            <b>Tallas</b>
            {tallas.map((t) => (
              <span key={t} className={`card__size${stockPorTalla[t] === 0 ? ' card__size--out' : ''}`}>{t}</span>
            ))}
          </div>
        )}
      </div>
      <div className="card__body">
        {product.brand && <span className="card__brand">{product.brand}</span>}
        <span className="card__name">{product.name}</span>
        <span className="card__price num">{formatCOP(product.base_price)}</span>
      </div>
    </Link>
  );
}
