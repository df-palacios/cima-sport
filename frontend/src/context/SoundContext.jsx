import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const SoundContext = createContext(null);

/**
 * Sonidos sintetizados con Web Audio — sin archivos de audio, así no pesan
 * nada en la carga. Mismo enfoque que en Cabra de León, con timbres propios
 * para una tienda: el "tap" es seco y corto, y agregar al carrito tiene una
 * pequeña tercera ascendente que se siente como confirmación.
 *
 * Volúmenes deliberadamente bajos: el sonido acompaña, no interrumpe.
 */
const CUES = {
  tap:     { type: 'triangle', freqs: [520],            dur: 0.05, gain: 0.05 },
  add:     { type: 'sine',     freqs: [523, 659, 784],  dur: 0.16, gain: 0.07 },
  remove:  { type: 'sine',     freqs: [420, 320],       dur: 0.12, gain: 0.05 },
  success: { type: 'sine',     freqs: [523, 784, 1047], dur: 0.24, gain: 0.08 },
  error:   { type: 'square',   freqs: [200, 160],       dur: 0.15, gain: 0.04 },
  swipe:   { type: 'sine',     freqs: [700],            dur: 0.06, gain: 0.025 },
};

export function SoundProvider({ children }) {
  const [enabled, setEnabled] = useState(() => localStorage.getItem('cima_sound') !== 'off');
  const ctxRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('cima_sound', enabled ? 'on' : 'off');
  }, [enabled]);

  const play = useCallback((cue = 'tap') => {
    if (!enabled) return;
    // Respeta a quien pidió menos movimiento/estímulo en su sistema.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const spec = CUES[cue] || CUES.tap;
    try {
      if (!ctxRef.current) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctxRef.current = new AC();
      }
      const ctx = ctxRef.current;
      // Los navegadores suspenden el audio hasta que hay un gesto del usuario.
      if (ctx.state === 'suspended') ctx.resume();

      spec.freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = spec.type;
        osc.frequency.value = freq;
        const start = ctx.currentTime + i * (spec.dur / spec.freqs.length) * 0.7;
        const end = start + spec.dur;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(spec.gain, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, end);
        osc.connect(gain).connect(ctx.destination);
        osc.start(start);
        osc.stop(end + 0.02);
      });
    } catch {
      // Si el navegador bloquea el audio, la interfaz sigue funcionando igual.
    }
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
