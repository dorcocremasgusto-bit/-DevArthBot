import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from 'baileys'
import pino from 'pino'
import path from 'path'
import fs from 'fs'

// Real WhatsApp pairing sessions, one per phone number.
// This reuses the same Baileys primitives the existing bot uses in Digix/Crew.js.

const SESSIONS_DIR = path.resolve('sessions')
const PAIRING_TTL_MS = 2 * 60 * 1000 // pairing codes are short-lived on WhatsApp's side

/** @type {Map<string, any>} */
const sessions = new Map()

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

let cachedVersion = null
async function getVersion() {
  if (cachedVersion) return cachedVersion
  const { version } = await fetchLatestBaileysVersion()
  cachedVersion = version
  return version
}

/**
 * Request a real WhatsApp pairing code for a number.
 * @param {string} phone digits-only, country-code-prefixed number
 * @param {(sock:any, phone:string)=>void} [onConnected]
 */
export async function requestPairing(phone, onConnected) {
  const existing = sessions.get(phone)

  // Already linked — nothing to pair.
  if (existing?.status === 'connected') {
    return { status: 'connected', code: null, expiresAt: existing.expiresAt }
  }

  // A pending code that is still valid — return it rather than spamming WhatsApp.
  if (
    existing &&
    existing.code &&
    existing.status === 'waiting' &&
    existing.expiresAt > Date.now()
  ) {
    return {
      status: existing.status,
      code: existing.code,
      expiresAt: existing.expiresAt,
    }
  }

  // Tear down any stale socket before starting fresh.
  if (existing?.sock) {
    try {
      existing.sock.end(undefined)
    } catch {
      /* ignore */
    }
  }

  const version = await getVersion()
  const dir = path.join(SESSIONS_DIR, phone)
  ensureDir(dir)
  const { state, saveCreds } = await useMultiFileAuthState(dir)

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    markOnlineOnConnect: true,
    logger: pino({ level: 'silent' }),
    keepAliveIntervalMs: 10000,
    connectTimeoutMs: 60000,
    generateHighQualityLinkPreview: true,
    browser: ['DevArth-Bot', 'Chrome', '1.0.0'],
  })

  const session = {
    sock,
    status: 'waiting',
    code: null,
    expiresAt: 0,
  }
  sessions.set(phone, session)

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update

    if (connection === 'open') {
      session.status = 'connected'
      console.log(`✅ [${phone}] WhatsApp connection established`)
      if (typeof onConnected === 'function') {
        try {
          onConnected(sock, phone)
        } catch (err) {
          console.error(`❌ [${phone}] onConnected error:`, err?.message)
        }
      }
    } else if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode
      if (statusCode === DisconnectReason.loggedOut) {
        session.status = 'failed'
        console.log(`🚫 [${phone}] logged out`)
      } else if (session.status !== 'connected') {
        // Baileys often closes right after pairing (restartRequired); keep the
        // socket configuration and reconnect so the link can complete.
        console.log(`🔄 [${phone}] reconnecting (code ${statusCode})`)
        setTimeout(() => {
          if (sessions.get(phone) === session && session.status !== 'connected') {
            requestPairing(phone, onConnected).catch(() => {})
          }
        }, 3000)
      }
    }
  })

  // Ask WhatsApp for the real pairing code.
  let code = null
  if (!state.creds.registered) {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    code = await sock.requestPairingCode(phone)
    console.log(`📲 [${phone}] pairing code: ${code}`)
  } else {
    session.status = 'connected'
  }

  session.code = code
  session.expiresAt = Date.now() + PAIRING_TTL_MS
  return { status: session.status, code, expiresAt: session.expiresAt }
}

/** @param {string} phone */
export function getStatus(phone) {
  const s = sessions.get(phone)
  if (!s) return { status: 'unknown' }
  const expired = s.status === 'waiting' && s.expiresAt < Date.now()
  return { status: s.status, expired, expiresAt: s.expiresAt }
}
