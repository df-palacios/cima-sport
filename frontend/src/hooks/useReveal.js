import { useEffect, useRef } from 'react';

/**
 * Revela un bloque cuando entra en pantalla. Un solo gesto por sección —
 * no una animación en cada tarjeta, que es justo lo que hace que una
 * página se sienta genérica.
 */
export function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('seen');
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('seen'); io.disconnect(); } },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}
