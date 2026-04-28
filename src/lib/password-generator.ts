/**
 * Genera una contrasena aleatoria de 16 caracteres por defecto, con al menos
 * 1 minuscula, 1 mayuscula, 1 numero y 1 signo. Usa crypto.getRandomValues
 * para seguridad real.
 */
const UPPER = 'ABCDEFGHIJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const DIGITS = '23456789';
// Sin '+', '=', '/' — esos chars se mangean al copiar/pegar via formularios
// y URLs (+ se vuelve espacio en form-encoded, = es padding base64, / es path).
const SYMBOLS = '!@#$%&*?_-';
const ALL = UPPER + LOWER + DIGITS + SYMBOLS;

function pick(set: string): string {
  const rand = new Uint32Array(1);
  crypto.getRandomValues(rand);
  return set[rand[0] % set.length];
}

export function generatePassword(length = 16): string {
  if (length < 4) length = 4;
  const out = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SYMBOLS)];
  for (let i = out.length; i < length; i++) out.push(pick(ALL));
  // Fisher-Yates con crypto
  for (let i = out.length - 1; i > 0; i--) {
    const r = new Uint32Array(1);
    crypto.getRandomValues(r);
    const j = r[0] % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.join('');
}
