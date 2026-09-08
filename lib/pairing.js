import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
} from 'baileys'
import pino from 'pino'
import path from 'path'
import fs from 'fs'

/**
 * Real WhatsApp pairing backend for DevArth-Bot MD.
 *
 * This reuses the exact same Baileys stack as the bot (see Digix/Crew.js):
 * multi-file auth state per number + sock.requestPairingCode() to obtain a
 * genuine 8-character WhatsApp pairing code. Nothing here is mocked.
 */

// Branded custom pairing code (must be 8 uppercase alphanumeric chars),
// matching the identity used by the bot in Digix/Crew.js.
const CUSTOM_PAIRING_CODE = 'DEVKLAUS'

// Where per-number credentials live. The repo already ships sessions under
// sessionData/pairings/<number>, so we keep that layout.
const PAIRINGS_DIR = path.join('sessionData', 'pairings')

// Live sessions kept in memory: number -> { status, code, sock, createdAt }
const sessions = new Map()

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

function normalizeNumber(raw) {
  return String(raw ?? '').replace(/[^0-9]/g, '')
}

/**
 * Start (or reuse) a real Baileys pairing session for a phone number and
 * return a genuine WhatsApp pairing code.
 */
export async function startPairing(rawNumber) {
  const number = normalizeNumber(rawNumber)

  if (number.length < 8 || number.length > 15) {
    throw new Error('Numéro WhatsApp invalide. Utilise l’indicatif pays, sans le « + ».')
  }

  // Reuse a still-valid pending session instead of spinning up a new socket.
  const existing = sessions.get(number)
  if (existing && existing.code && existing.status !== 'connected' && existing.status !== 'failed') {
    return { number, code: existing.code, status: existing.status }
  }

  // Clean up any dead socket for this number before starting fresh.
  if (existing?.sock) {
    try {
      existing.sock.ev.removeAllListeners('connection.update')
      existing.sock.end?.(undefined)
    } catch {
      /* ignore */
    }
  }

  const sessionDir = path.join(PAIRINGS_DIR, number)
  fs.mkdirSync(sessionDir, { recursive: true })

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir)

  let version
  try {
    ;({ version } = await fetchLatestBaileysVersion())
  } catch {
    version = undefined // Baileys falls back to a bundled version.
  }

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    markOnlineOnConnect: true,
    browser: Browsers.ubuntu('DevArth-Bot MD'),
    keepAliveIntervalMs: 10000,
    connectTimeoutMs: 60000,
    generateHighQualityLinkPreview: true,
  })

  const session = { number, status: 'connecting', code: null, sock, createdAt: Date.now() }
  sessions.set(number, session)

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update

    if (connection === 'open') {
      session.status = 'connected'
      console.log(`[v0] Pairing success — ${number} connected to WhatsApp`)
      return
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode
      if (statusCode === DisconnectReason.loggedOut || statusCode === DisconnectReason.forbidden) {
        session.status = 'failed'
        console.log(`[v0] Pairing failed for ${number} (status ${statusCode})`)
      } else if (session.status !== 'connected') {
        // Transient drop while the user is still entering the code.
        session.status = 'connecting'
      }
    }
  })

  // Only unregistered numbers can request a pairing code.
  if (!state.creds.registered) {
    await delay(1500)
    try {
      const code = await sock.requestPairingCode(number, CUSTOM_PAIRING_CODE)
      session.code = code
    } catch (e) {
      sessions.delete(number)
      try {
        sock.end?.(undefined)
      } catch {
        /* ignore */
      }
      throw new Error('WhatsApp a refusé la génération du code. Réessaie dans un instant.')
    }
  } else {
    // Credentials already exist: this device is (or is becoming) linked.
    session.status = 'connected'
  }

  return { number, code: session.code, status: session.status }
}

/**
 * Return the live connection status for a number, read straight from the
 * in-memory Baileys session.
 */
export function getSession(rawNumber) {
  const number = normalizeNumber(rawNumber)
  const session = sessions.get(number)
  if (!session) return null
  return { number, status: session.status, code: session.code }
}
