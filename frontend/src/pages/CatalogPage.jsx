import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useSound } from '../context/SoundContext.jsx';
import ProductCard from '../components/ProductCard.jsx';

const CATEGORIAS = [
  { slug: '', label: 'Todo' },
  { slug: 'calzado', label: 'Calzado' },
  { slug: 'urbano', label: 'Urbano' },
  { slug: 'fitness', label: 'Fitness' },
];

export default function CatalogPage() {
  const { categorySlug = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const brand = searchParams.get('marca') || '';
  const { play } = useSound();

  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.getBrands().then(setBrands).catch(() => setBrands([])); }, []);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (categorySlug) params.category = categorySlug;
    if (q) params.q = q;
    if (brand) params.brand = brand;
    api.getProducts(params).then((d) => { setProducts(d); setLoading(false); }).catch(() => setLoading(false));
  }, [categorySlug, q, brand]);

  const titulo = useMemo(() => {
    if (q) return `Resultados para "${q}"`;
    return CATEGORIAS.find((c) => c.slug === categorySlug)?.label || 'Tienda';
  }, [categorySlug, q]);

  function filtrarMarca(m) {
    play('tap');
    const next = new URLSearchParams(searchParams);
    if (m) next.set('marca', m); else next.delete('marca');
    setSearchParams(next);
  }

  return (
    <div className="wrap" style={{ paddingBlock: '26px 70px' }}>
      <div className="view-head">
        <h2>{titulo}</h2>
        <p>{loading ? 'Buscando…' : `${products.length} ${products.length === 1 ? 'prenda' : 'prendas'}`}</p>
      </div>

      <div className="filters">
        {CATEGORIAS.map((c) => (
          <Link key={c.slug} to={c.slug ? `/tienda/${c.slug}` : '/tienda'}
                className={`pill${categorySlug === c.slug ? ' on' : ''}`} onClick={() => play('tap')}>
            {c.label}
          </Link>
        ))}
      </div>

      {brands.length > 0 && (
        <div className="filters">
          <button className={`pill${!brand ? ' on' : ''}`} onClick={() => filtrarMarca('')}>Todas las marcas</button>
          {brands.map((b) => {
            // El endpoint devuelve { brand, product_count }, no una cadena.
            const nombre = typeof b === 'string' ? b : b.brand;
            return (
              <button key={nombre} className={`pill${brand === nombre ? ' on' : ''}`}
                      onClick={() => filtrarMarca(nombre)}>
                {nombre}
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card"><div className="card__media" /></div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="empty">
          <b>No encontramos esa prenda</b>
          <p>Prueba con otra categoría, otra marca, o revisa cómo escribiste la búsqueda.</p>
          <Link to="/tienda" className="btn btn--sm" onClick={() => play('tap')}>Ver todo el catálogo</Link>
        </div>
      ) : (
        <div className="grid">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
