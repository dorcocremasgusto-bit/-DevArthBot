import http from 'http'
import { requestPairing, getStatus } from './bot/pairingManager.js'

// Persistent WhatsApp pairing backend for DevArth-Bot.
// Deploy this on a host that allows long-lived processes (Railway, Render,
// Fly.io, a VPS, etc.) — NOT on Vercel serverless, which cannot keep the
// WhatsApp socket alive. Point the Vercel frontend at it with BOT_BACKEND_URL.

const PORT = process.env.PORT || 8080
const BOT_KEY = process.env.BOT_BACKEND_KEY
const ALLOWED_ORIGIN = process.env.FRONTEND_ORIGIN || '*'

const DIGITS_RE = /^[1-9]\d{7,14}$/

function toDigits(input) {
  if (typeof input !== 'string') return null
  const digits = input.replace(/\D/g, '')
  return DIGITS_RE.test(digits) ? digits : null
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-bot-key')
}

function json(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(body)
}

function authorized(req) {
  if (!BOT_KEY) return true
  return req.headers['x-bot-key'] === BOT_KEY
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', (c) => {
      data += c
      if (data.length > 1e6) req.destroy()
    })
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')) } catch { resolve(null) }
    })
  })
}

const server = http.createServer(async (req, res) => {
  setCors(res)

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const url = new URL(req.url, `http://${req.headers.host}`)

  if (url.pathname === '/health') {
    return json(res, 200, { ok: true })
  }

  if (!authorized(req)) {
    return json(res, 401, { message: 'Unauthorized' })
  }

  try {
    if (req.method === 'POST' && url.pathname === '/api/pairing') {
      const body = await readBody(req)
      const digits = toDigits(body?.digits) || toDigits(body?.phoneNumber)
      if (!digits) {
        return json(res, 400, { message: 'Invalid phone number.' })
      }
      const result = await requestPairing(digits)
      if (!result.pairingCode && result.alreadyConnected) {
        return json(res, 200, { pairingCode: null, alreadyConnected: true })
      }
      return json(res, 200, {
        pairingCode: result.pairingCode,
        expiresIn: result.expiresIn,
      })
    }

    if (req.method === 'GET' && url.pathname === '/api/status') {
      const digits = toDigits(url.searchParams.get('phoneNumber'))
      if (!digits) return json(res, 400, { status: 'failed' })
      return json(res, 200, { status: getStatus(digits) })
    }

    return json(res, 404, { message: 'Not found' })
  } catch (err) {
    console.error('[server] error:', err?.message || err)
    return json(res, 500, { message: 'Internal error while processing the request.' })
  }
})

server.listen(PORT, () => {
  console.log(`DevArth-Bot pairing backend listening on :${PORT}`)
})
