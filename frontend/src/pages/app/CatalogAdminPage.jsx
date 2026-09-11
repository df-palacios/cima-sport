import { useEffect, useState } from 'react';
import { api, formatCOP } from '../../api.js';
import { useToast } from '../../context/ToastContext.jsx';
import { publicUrl } from '../../utils/publicUrl.js';

export default function CatalogAdminPage() {
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  function load() {
    return Promise.all([api.getProducts(), api.getCategories()]).then(([p, c]) => {
      setProducts(p); setCategories(c);
    });
  }
  useEffect(() => { load(); }, []);

  async function toggleActive(p) {
    try {
      await api.updateProduct(p.id, { active: p.active ? 0 : 1 });
      toast(p.active ? 'Producto ocultado de la tienda' : 'Producto visible de nuevo');
      await load();
    } catch (err) {
      toast(err.message);
    }
  }

  return (
    <>
      <div className="view-head"><div><h2>Catálogo</h2><p>{products.length} productos.</p></div></div>

      <div className="grid">
        {products.map((p) => (
          <div className="product-card admin-product-card" key={p.id}>
            <div className="product-card__img">
              {p.images?.[0] && <img src={publicUrl(p.images[0].image_path)} alt={p.name} />}
              {!p.active && <span className="tag tag--quiet product-card__badge">Oculto</span>}
            </div>
            <div className="product-card__body">
              <span className="product-card__cat">{categories.find((c) => c.id === p.category_id)?.name}</span>
              {p.brand && <span className="product-card__brand">{p.brand}</span>}
              <span className="product-card__name">{p.name}</span>
              <span className="product-card__price mono">{formatCOP(p.base_price)}</span>
              <button className="btn btn--sm btn--ghost" style={{ marginTop: 8 }} onClick={() => toggleActive(p)}>
                {p.active ? 'Ocultar de la tienda' : 'Volver a mostrar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
