import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { startPairing, getSession } from './lib/pairing.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PUBLIC_DIR = path.join(__dirname, 'public')
const PORT = process.env.PORT || 3000

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
}

function securityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
}

function sendJson(res, status, payload) {
  securityHeaders(res)
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(payload))
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
      if (data.length > 1e6) req.destroy()
    })
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {})
      } catch {
        resolve({})
      }
    })
  })
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split('?')[0])
  if (urlPath === '/') urlPath = '/index.html'

  // Prevent path traversal.
  const filePath = path.join(PUBLIC_DIR, path.normalize(urlPath))
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403)
    return res.end('Forbidden')
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      return res.end('Not found')
    }
    securityHeaders(res)
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' })
    res.end(content)
  })
}

const server = http.createServer(async (req, res) => {
  const { pathname, searchParams } = new URL(req.url, `http://${req.headers.host}`)

  // --- REAL pairing endpoint: number -> Baileys -> WhatsApp pairing code ---
  if (req.method === 'POST' && pathname === '/api/pair') {
    const body = await readBody(req)
    try {
      const result = await startPairing(body.number)
      return sendJson(res, 200, { ok: true, ...result })
    } catch (e) {
      console.error('[v0] /api/pair failed:', e?.message)
      return sendJson(res, 400, { ok: false, error: e?.message || 'Erreur inconnue du backend.' })
    }
  }

  // --- Real connection status straight from the live Baileys socket ---
  if (req.method === 'GET' && pathname === '/api/status') {
    try {
      const session = await getSession(searchParams.get('number'))
      if (!session) {
        return sendJson(res, 404, { ok: false, error: 'Aucune session pour ce numéro.' })
      }
      return sendJson(res, 200, { ok: true, ...session })
    } catch (e) {
      console.error('[v0] /api/status failed:', e?.message)
      return sendJson(res, 400, { ok: false, error: e?.message || 'Erreur inconnue du backend.' })
    }
  }

  if (req.method === 'GET' && pathname === '/api/health') {
    return sendJson(res, 200, { ok: true })
  }

  // Static frontend
  if (req.method === 'GET') {
    return serveStatic(req, res)
  }

  res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end('Method not allowed')
})

server.listen(PORT, () => {
  console.log(`[v0] DevArth-Bot pairing server listening on http://localhost:${PORT}`)
})
