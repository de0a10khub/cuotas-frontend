/**
 * Traducciones de mensajes de error de Whop/Stripe a español.
 *
 * Estrategia:
 *   1. Match exacto en EXACT_MAP (rápido).
 *   2. Si no, buscar patrones (substring/regex) en PATTERNS.
 *   3. Si no hay match, devolver original (defensivo).
 *
 * Las traducciones cubren los errores más frecuentes vistos en producción
 * (BD: top 50 mensajes en op_mora_action_log, stripe_charges.failure_message,
 * stripe_charges.raw->outcome.seller_message, customer_installments.last_error).
 */

const EXACT_MAP: Record<string, string> = {
  // === Whop API (whop_response.error.message + result_payload.error) ===
  'This receipt has already been re-tried the maximum number of times':
    'Este recibo ya alcanzó el número máximo de reintentos. Genera un link de pago nuevo.',
  'You can only retry payments that are attached to a membership':
    'Solo se pueden reintentar pagos asociados a una membresía activa.',
  'You can only retry payments where the membership status is past due.':
    'Solo se pueden reintentar pagos cuya membresía esté en estado past_due.',
  'Your bank has declined this transaction. Please try a different card or contact your bank.':
    'Tu banco rechazó esta transacción. Prueba otra tarjeta o contacta con tu banco.',
  'For security reasons, this payment couldn\'t be processed. Please contact your bank for more information or try a different card.':
    'Por motivos de seguridad, el pago no pudo procesarse. Contacta con tu banco o prueba otra tarjeta.',
  'This card cannot be used for this payment. It may have restrictions or been reported lost/stolen. Please use a different card.':
    'Esta tarjeta no puede usarse. Puede tener restricciones o estar reportada como perdida/robada. Usa otra.',
  'This card was permanently declined (lost, stolen, expired, or closed). Please ask the customer to update their payment method.':
    'Tarjeta rechazada permanentemente (perdida, robada, caducada o cerrada). Pide al cliente que actualice su método de pago.',
  'Additional verification (3DS) is required for this payment. You may be redirected to your bank\'s website or receive a text/app notification to verify.':
    'Verificación 3DS requerida. El cliente debe confirmar el pago en su banco o app.',
  'Your card has insufficient funds to complete this purchase. Please use a different payment method or ensure your account has enough balance.':
    'Tu tarjeta no tiene fondos suficientes. Usa otra o asegúrate de tener saldo.',
  'You\'ve exceeded your card\'s daily transaction limit or available balance. Please try again tomorrow or use a different card.':
    'Has superado el límite diario de la tarjeta o el saldo disponible. Inténtalo mañana o usa otra tarjeta.',
  'Your card issuer doesn\'t allow this type of transaction. Please use a different card or contact your bank to enable this.':
    'Tu emisor de tarjeta no permite este tipo de transacción. Usa otra o contacta con tu banco.',
  'Your bank could not verify your identity through 3D Secure. This typically happens when incorrect verification details (e.g. SMS code) are entered.':
    'El banco no pudo verificar la identidad por 3D Secure. Suele pasar cuando los datos de verificación (código SMS) son incorrectos.',

  // === Stripe failure_message ===
  'Your card was declined.': 'Tu tarjeta fue rechazada.',
  'Your card was declined for making repeated attempts too frequently or exceeding its amount limit.':
    'Tu tarjeta fue rechazada por demasiados intentos seguidos o por superar el límite.',
  'Your card has insufficient funds.': 'Tu tarjeta no tiene fondos suficientes.',
  'Your card does not support this type of purchase.': 'Tu tarjeta no admite este tipo de compra.',
  'Your card number is incorrect.': 'El número de tarjeta es incorrecto.',
  'Invalid account.': 'Cuenta inválida.',
  'Your card was declined. You can call your bank for details.':
    'Tu tarjeta fue rechazada. Llama a tu banco para más detalles.',
  'Your card has expired.': 'Tu tarjeta ha caducado.',
  'The payment failed.': 'El pago falló.',
  'An error occurred while processing your card. Try again in a little bit.':
    'Error procesando la tarjeta. Inténtalo en unos minutos.',
  'The customer has insufficient funds with the payment provider. Retry attempts might succeed after the customer takes action.':
    'El cliente no tiene fondos. Los reintentos pueden funcionar tras acción del cliente.',
  'Your card\'s security code is incorrect.': 'El código de seguridad (CVC) es incorrecto.',
  'The payment failed: Additional verification required from Link consumer. Please ask your customer to log into link.com to verify their account.':
    'El pago falló: verificación adicional requerida del cliente Link. Pide que inicie sesión en link.com.',

  // === Stripe outcome.seller_message ===
  'Payment complete.': 'Pago completado.',
  'The bank did not return any further details with this decline.':
    'El banco rechazó sin más detalles.',
  'You previously attempted to charge this card. When the customer\'s bank declined that payment, it directed Stripe to block future attempts on this card.':
    'Intento anterior rechazado por el banco. Stripe bloqueó futuros cobros con esta tarjeta.',
  'Stripe blocked this Link payment because additional verification is required by the Link user. Please ask your customer to log into link.com to verify their account.':
    'Stripe bloqueó este pago Link: el cliente debe verificarse en link.com.',
  'Stripe blocked this payment as too risky.': 'Stripe bloqueó el pago por considerarlo de alto riesgo.',
  'A platform rule blocked this payment.': 'Una regla de la plataforma bloqueó este pago.',

  // === customer_installments.last_error ===
  'Whop membership canceled': 'Membresía Whop cancelada',
  'Whop membership canceled (synced)': 'Membresía Whop cancelada (sincronizado)',
  'Payment failed (Whop webhook: payment.failed)': 'Pago fallido (webhook Whop: payment.failed)',
  'Refunded on cancellation': 'Reembolsado al cancelar',
};

/** Mapeo de decline codes de bancos (substring patterns). */
const DECLINE_CODES: Record<string, string> = {
  card_velocity_exceeded: 'demasiados intentos seguidos',
  insufficient_funds: 'fondos insuficientes',
  transaction_not_allowed: 'transacción no permitida',
  do_not_honor: 'rechazo genérico (do_not_honor)',
  try_again_later: 'inténtalo más tarde',
  incorrect_number: 'número de tarjeta incorrecto',
  invalid_account: 'cuenta inválida',
  call_issuer: 'contactar con el emisor',
  stolen_card: 'tarjeta reportada como robada',
  lost_card: 'tarjeta reportada como perdida',
  expired_card: 'tarjeta caducada',
  card_declined: 'tarjeta rechazada',
  generic_decline: 'rechazo genérico',
  pickup_card: 'tarjeta retenida por el banco',
  service_not_allowed: 'servicio no permitido',
  fraudulent: 'rechazada por sospecha de fraude',
};

/** Patrones genéricos para casos no exactos. */
const PATTERNS: Array<[RegExp, string | ((m: RegExpMatchArray) => string)]> = [
  // "card_error: <mensaje>" — quitar prefijo y traducir el resto recursivamente
  [/^card_error:\s*(.+)$/i, (m) => translateError(m[1]) || m[1]],

  // "The bank returned the decline code `XXX`."
  [
    /The bank returned the decline code `([^`]+)`/i,
    (m) => `Banco rechazó: ${DECLINE_CODES[m[1]] || m[1]}`,
  ],

  // ERP/sync errors comunes
  [/Maximo de (\d+) intentos alcanzado\. Solo cobro manual\./, (m) => `Máximo de ${m[1]} intentos alcanzado. Solo cobro manual.`],
  [/^Order duplicado cancelado .+$/i, (m) => m[0]],  // ya en español
  [/There is no `default_payment_method` set/i, () => 'No hay método de pago predeterminado configurado en el cliente.'],

  // Whop API genérico de membership
  [/membership.*not found/i, () => 'Membresía no encontrada en Whop.'],
  [/^Whop v5 API error \((\d+) [^)]+\):/i, (m) => `Error API Whop (HTTP ${m[1]}).`],
  [/La respuesta del webhook no incluye una URL de contrato válida/i, (m) => m[0]],
  [/Respuesta no válida del ERP \(HTTP (\d+)\)/i, (m) => `Respuesta inválida del ERP (HTTP ${m[1]}). No es un JSON válido.`],
];

/**
 * Traduce un mensaje de error a español.
 * Devuelve null si la entrada no es string. Devuelve el original si no
 * se encuentra traducción (defensivo: nunca pierde info).
 */
export function translateError(text: string | null | undefined): string | null {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  // 1. Match exacto
  if (EXACT_MAP[trimmed]) return EXACT_MAP[trimmed];

  // 2. Patrones
  for (const [re, repl] of PATTERNS) {
    const m = trimmed.match(re);
    if (m) {
      return typeof repl === 'function' ? repl(m) : trimmed.replace(re, repl);
    }
  }

  // 3. Defensivo: original
  return trimmed;
}
