import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { requestPairing, getStatus } from './pairing-manager.js'
import { normalizePhone } from './phone.js'

// Persistent DevArth-Bot backend.
// Run this on a host that keeps a long-lived Node process (Railway, Render,
// a VPS, Fly.io, etc.) — Baileys needs a persistent socket, so it cannot run
// on serverless. Point the Next.js frontend at it via BOT_BACKEND_URL.

const PORT = Number(process.env.PORT || 8080)
const API_KEY = process.env.BOT_API_KEY || ''
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*'

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '16kb' }))
app.use(
  cors({
    origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(',').map((s) => s.trim()),
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'x-api-key'],
  }),
)

const limiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/', limiter)

// Optional shared-secret gate. When BOT_API_KEY is set, the frontend proxy
// must forward it as x-api-key (it does automatically from BOT_API_KEY).
app.use('/api/', (req, res, next) => {
  if (!API_KEY) return next()
  if (req.get('x-api-key') === API_KEY) return next()
  return res.status(401).json({ error: 'Unauthorized.' })
})

// Attach the existing bot's message handler once a number is linked.
// Loaded lazily and defensively so incomplete command modules can never
// take down the pairing service.
let botHandler = null
async function loadBotHandler() {
  if (botHandler !== null) return botHandler
  try {
    const mod = await import('../utils/events/messageHandler.js')
    botHandler = mod.default || mod.handleIncomingMessage || false
    if (botHandler) console.log('✅ Bot message handler attached')
  } catch (err) {
    botHandler = false
    console.warn(
      '⚠️  Running in pairing-only mode (bot command handler unavailable):',
      err?.message,
    )
  }
  return botHandler
}

async function onConnected(sock) {
  const handler = await loadBotHandler()
  if (handler) {
    sock.ev.on('messages.upsert', (m) => {
      try {
        handler(sock, m)
      } catch (err) {
        console.error('handler error:', err?.message)
      }
    })
  }
}

app.get('/', (_req, res) => {
  res.json({ name: 'DevArth-Bot pairing server', status: 'ok' })
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() })
})

app.post('/api/pairing', async (req, res) => {
  const normalized = normalizePhone(req.body?.phoneNumber ?? '')
  if (!normalized.ok) return res.status(400).json({ error: normalized.error })

  try {
    const result = await requestPairing(normalized.value, onConnected)
    if (result.status === 'connected' && !result.code) {
      return res.json({ status: 'connected', code: null, expiresAt: result.expiresAt })
    }
    if (!result.code) {
      return res
        .status(502)
        .json({ error: 'WhatsApp did not return a pairing code. Try again.' })
    }
    return res.json(result)
  } catch (err) {
    console.error('pairing error:', err?.message)
    return res
      .status(502)
      .json({ error: 'Failed to generate a pairing code. Please try again.' })
  }
})

app.get('/api/status', (req, res) => {
  const normalized = normalizePhone(String(req.query.phone ?? ''))
  if (!normalized.ok) return res.status(400).json({ error: normalized.error })
  return res.json(getStatus(normalized.value))
})

app.listen(PORT, () => {
  console.log(`🚀 DevArth-Bot pairing server listening on :${PORT}`)
})
