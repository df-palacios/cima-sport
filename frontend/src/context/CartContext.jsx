import { createContext, useContext, useEffect, useState } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cima_cart') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('cima_cart', JSON.stringify(items));
  }, [items]);

  function addItem(variant, product, qty = 1) {
    setItems((prev) => {
      const existing = prev.find((i) => i.variantId === variant.id);
      if (existing) {
        return prev.map((i) => i.variantId === variant.id ? { ...i, quantity: i.quantity + qty } : i);
      }
      return [...prev, {
        variantId: variant.id,
        productName: product.name,
        productSlug: product.slug,
        size: variant.size,
        color: variant.color,
        // El precio mostrado en el carrito es solo referencia visual — el
        // cobro real siempre se recalcula en el servidor al pagar.
        unitPrice: variant.price_override ?? product.base_price,
        image: product.images?.[0]?.image_path,
        quantity: qty,
        maxStock: variant.stock,
      }];
    });
  }

  function updateQty(variantId, qty) {
    setItems((prev) => prev
      .map((i) => i.variantId === variantId ? { ...i, quantity: Math.max(1, Math.min(qty, i.maxStock)) } : i));
  }
  function removeItem(variantId) {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  }
  function clearCart() { setItems([]); }

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, updateQty, removeItem, clearCart, subtotal, count }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
