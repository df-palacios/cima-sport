import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const SoundContext = createContext(null);

/**
 * Motor de sonido real: cuelume (https://github.com/Danilaa1/cuelume),
 * el mismo paquete que usan el portafolio y Rifa Navidad — así la paleta
 * sonora es coherente entre proyectos, no una imitación hecha a mano.
 * Sintetizado con Web Audio, sin archivos, cero dependencias.
 *
 * Se carga en diferido (import dinámico) para no sumarlo al bundle inicial,
 * y todo cae en no-ops silenciosos si por lo que sea no carga — el sitio
 * nunca debe romperse por culpa del sonido.
 */
const noop = () => {};
let api = null;
let pending = null;

function load() {
  if (api) return Promise.resolve(api);
  if (!pending) {
    pending = import('cuelume')
      .then((mod) => { api = mod; return mod; })
      .catch(() => { api = { play: noop, setEnabled: noop }; return api; });
  }
  return pending;
}

/**
 * Qué cue de cuelume corresponde a cada interacción de la tienda. "toggle"
 * es el que le gusta a Diego — sobrio, dos golpes secos, dan la sensación
 * de un switch físico cambiando de estado — y aquí se usa exactamente para
 * eso: tema, sonido y el menú, igual que en el portafolio.
 */
const CUES = {
  tap: 'tick',       // clics generales: enlaces, tarjetas, botones de texto
  toggle: 'toggle',  // tema, silenciar sonido, abrir/cerrar menú
  add: 'chime',      // agregar al carrito
  remove: 'droplet', // quitar del carrito, bajar cantidad
  success: 'success',// pedido confirmado, cuenta creada, cobro registrado
  error: 'error',    // validaciones fallidas
  swipe: 'page',      // navegar la galería, el hero, las miniaturas
};

export function SoundProvider({ children }) {
  const [enabled, setEnabled] = useState(() => localStorage.getItem('cima_sound') !== 'off');

  useEffect(() => {
    localStorage.setItem('cima_sound', enabled ? 'on' : 'off');
    load().then((mod) => mod.setEnabled?.(enabled));
  }, [enabled]);

  const play = useCallback((cue = 'tap') => {
    if (!enabled) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const nombre = CUES[cue] || 'tick';

    // Si cuelume ya está cargado, se llama de forma SÍNCRONA dentro del
    // mismo gesto del usuario — pasar por un .then() aquí hace que el
    // navegador descarte el sonido en algunos clics por su política de
    // autoplay (la misma lección que ya se aprendió en el portafolio).
    if (api) { try { api.play?.(nombre); } catch { /* silencio */ } return; }
    load().then((mod) => { try { mod.play?.(nombre); } catch { /* silencio */ } });
  }, [enabled]);

  return (
    <SoundContext.Provider value={{ play, enabled, toggle: () => setEnabled((v) => !v) }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  return useContext(SoundContext) || { play: () => {}, enabled: false, toggle: () => {} };
}
