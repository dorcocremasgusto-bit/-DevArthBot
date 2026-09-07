import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from 'baileys'
import pino from 'pino'
import path from 'path'
import fs from 'fs'

// How long a freshly issued pairing code stays usable (seconds).
const CODE_TTL_SECONDS = 180
const SESSIONS_DIR = path.join(process.cwd(), 'sessions')

// digits -> { sock, status, code, codeExpiresAt }
const sessions = new Map()

function ensureSessionsDir() {
  if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true })
}

function sessionPath(digits) {
  return path.join(SESSIONS_DIR, digits)
}

/**
 * Create (or reuse) a Baileys socket for a given phone number and request a
 * real WhatsApp pairing code. Mirrors the logic used in Digix/Crew.js.
 */
export async function requestPairing(digits) {
  ensureSessionsDir()

  const existing = sessions.get(digits)
  // Reuse a still-valid code so repeated clicks don't spam WhatsApp.
  if (existing && existing.code && existing.codeExpiresAt > Date.now() && existing.status !== 'connected') {
    return {
      pairingCode: existing.code,
      expiresIn: Math.max(1, Math.round((existing.codeExpiresAt - Date.now()) / 1000)),
    }
  }

  // Tear down a stale socket before starting fresh.
  if (existing?.sock) {
    try { existing.sock.end(new Error('restart')) } catch {}
  }

  const { version } = await fetchLatestBaileysVersion()
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath(digits))

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    markOnlineOnConnect: true,
    logger: pino({ level: 'silent' }),
    keepAliveIntervalMs: 10000,
    connectTimeoutMs: 60000,
    generateHighQualityLinkPreview: true,
  })

  const record = { sock, status: 'waiting', code: null, codeExpiresAt: 0 }
  sessions.set(digits, record)

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update
    if (connection === 'open') {
      record.status = 'connected'
      record.code = null
    } else if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode
      if (statusCode === DisconnectReason.loggedOut) {
        record.status = 'failed'
      } else if (record.status !== 'connected') {
        record.status = 'waiting'
      }
    }
  })

  // Request the real pairing code once the socket is initialised and the
  // number is not already registered.
  if (!state.creds.registered) {
    await new Promise((r) => setTimeout(r, 3000))
    const code = await sock.requestPairingCode(digits, 'DEVKLAUS')
    record.code = code
    record.codeExpiresAt = Date.now() + CODE_TTL_SECONDS * 1000
    record.status = 'waiting'
    return { pairingCode: code, expiresIn: CODE_TTL_SECONDS }
  }

  // Already registered/connected.
  record.status = 'connected'
  return { pairingCode: null, alreadyConnected: true }
}

export function getStatus(digits) {
  const record = sessions.get(digits)
  if (!record) return 'waiting'
  return record.status
}
