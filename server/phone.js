// Server-side mirror of lib/phone.ts — never trust the client.
export function normalizePhone(input) {
  if (typeof input !== 'string') {
    return { ok: false, error: 'Invalid phone number.' }
  }

  let digits = input.trim().replace(/[\s\-().]/g, '')
  digits = digits.replace(/^\+/, '').replace(/^00/, '')

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
