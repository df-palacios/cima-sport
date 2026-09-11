/**
 * Construye la ruta de un archivo de public/ respetando la "base" con la que
 * se compiló (import.meta.env.BASE_URL). Lección de Cabra de León: los
 * archivos de public/ referenciados como texto fijo ("/images/x.jpg") NO
 * heredan la subcarpeta solos — Vite solo ajusta los assets que él mismo
 * compila (los .js/.css con hash).
 */
export function publicUrl(path) {
  const base = import.meta.env.BASE_URL || '/';
  return base.replace(/\/$/, '') + '/' + path.replace(/^\//, '');
}
