import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useToast } from '../../context/ToastContext.jsx';

export default function InventoryPage() {
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState({});

  useEffect(() => { api.getProducts().then(setProducts); }, []);

  async function guardar(variantId) {
    const value = editing[variantId];
    if (value === undefined) return;
    try {
      await api.setVariantStock(variantId, Number(value));
      setProducts((prev) => prev.map((p) => ({
        ...p, variants: p.variants.map((v) => v.id === variantId ? { ...v, stock: Number(value) } : v),
      })));
      toast('Existencia actualizada');
      setEditing((e) => { const c = { ...e }; delete c[variantId]; return c; });
    } catch (err) {
      toast(err.message);
    }
  }

  return (
    <>
      <div className="view-head"><div><h2>Inventario</h2><p>Existencias por talla y color.</p></div></div>

      {products.map((p) => (
        <div key={p.id} className="inv-product">
          <b>{p.name}</b>
          <div className="panel table-scroll">
            <table>
              <thead><tr><th>SKU</th><th>Talla</th><th>Color</th><th>Existencia</th><th></th></tr></thead>
              <tbody>
                {p.variants.map((v) => (
                  <tr key={v.id}>
                    <td className="mono">{v.sku}</td>
                    <td>{v.size}</td>
                    <td>{v.color}</td>
                    <td>
                      <input
                        className="field" type="number" min="0" style={{ width: 90 }}
                        value={editing[v.id] ?? v.stock}
                        onChange={(e) => setEditing({ ...editing, [v.id]: e.target.value })}
                      />
                    </td>
                    <td>
                      {editing[v.id] !== undefined && Number(editing[v.id]) !== v.stock && (
                        <button className="btn btn--sm btn--primary" onClick={() => guardar(v.id)}>Guardar</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </>
  );
}
