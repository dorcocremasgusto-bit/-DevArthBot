export type PhoneResult =
  | { ok: true; value: string }
  | { ok: false; error: string }

/**
 * Normalize a user supplied WhatsApp number into the digits-only,
 * country-code-prefixed form that Baileys' requestPairingCode expects.
 * Removes spaces, dashes, parentheses, a leading "+" and a leading "00".
 */
export function normalizePhone(input: string): PhoneResult {
  if (typeof input !== 'string') {
    return { ok: false, error: 'Invalid phone number.' }
  }

  let digits = input.trim().replace(/[\s\-().]/g, '')
  digits = digits.replace(/^\+/, '')
  digits = digits.replace(/^00/, '')

  if (!/^\d+$/.test(digits)) {
    return { ok: false, error: 'Phone number must contain digits only.' }
  }
  if (digits.length < 8 || digits.length > 15) {
    return {
      ok: false,
      error: 'Enter a valid number with country code (8-15 digits).',
    }
  }

  return { ok: true, value: digits }
}
