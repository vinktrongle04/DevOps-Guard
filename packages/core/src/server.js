#!/usr/bin/env node
// ============================================================
// server.js — DevOps-Guard Embedded Dashboard Server
// ============================================================
// Serves the pre-built React Dashboard alongside live scan data
// from the project's .devops-guard/ directory.
//
// Architecture:
//   /              → Static files from dashboard-dist/ (React SPA)
//   /api/*.json    → Proxied from .devops-guard/ in the host project
//
// Security:
//   - Binds to 127.0.0.1 only (no network exposure)
//   - Path traversal protection on all file reads
//   - Content-Type validation (only serves known MIME types)
//   - No eval, no dynamic code execution
//   - CORS disabled (same-origin only)
//
// Zero external dependencies — uses only Node.js built-in modules.
// ============================================================

import http     from 'http'
import fs       from 'fs'
import path     from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

// ─── CONFIGURATION ──────────────────────────────────────────
const DEFAULT_PORT = 8080
const HOST         = '127.0.0.1' // localhost only — never expose to network
const DASHBOARD_DIR = path.resolve(__dirname, '..', 'dashboard-dist')
const OPEN_DELAY_MS = 800

// ─── MIME TYPES (whitelist approach for security) ────────────
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.map':  'application/json',
}

// ─── SECURITY HEADERS ───────────────────────────────────────
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options':        'DENY',
  'Referrer-Policy':        'strict-origin-when-cross-origin',
  'Cache-Control':          'no-store',
}

// ─── HELPER: Safe path resolution (prevent traversal) ───────
function safePath(basedir, requestedPath) {
  const resolved = path.resolve(basedir, requestedPath)
  if (!resolved.startsWith(basedir)) return null // traversal blocked
  return resolved
}

// ─── HELPER: Serve a static file ────────────────────────────
function serveFile(res, filePath) {
  const ext  = path.extname(filePath).toLowerCase()
  const mime = MIME_TYPES[ext]
  if (!mime) {
    res.writeHead(403, SECURITY_HEADERS)
    res.end('Forbidden: unknown file type')
    return
  }

  try {
    const content = fs.readFileSync(filePath)
    res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': mime })
    res.end(content)
  } catch {
    res.writeHead(404, SECURITY_HEADERS)
    res.end('Not found')
  }
}

// ─── HELPER: Open browser (cross-platform) ──────────────────
async function openBrowser(url) {
  const { exec } = await import('child_process')
  const cmds = {
    win32:  `start "" "${url}"`,
    darwin: `open "${url}"`,
    linux:  `xdg-open "${url}"`,
  }
  const cmd = cmds[process.platform]
  if (cmd) exec(cmd, () => {}) // fire-and-forget
}

// ─── MAIN SERVER ────────────────────────────────────────────
export function startDashboard(options = {}) {
  const port    = options.port || DEFAULT_PORT
  const dataDir = path.resolve(options.dataDir || path.join(process.cwd(), '.devops-guard'))
  const noOpen  = options.noOpen || false

  // Validate that the dashboard build exists
  const indexPath = path.join(DASHBOARD_DIR, 'index.html')
  if (!fs.existsSync(indexPath)) {
    console.error('\n  ✗ Dashboard build not found.')
    console.error(`    Expected at: ${DASHBOARD_DIR}`)
    console.error('    Run "npm run build" in the dashboard/ directory first.\n')
    process.exit(1)
  }

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${HOST}:${port}`)
    const pathname = decodeURIComponent(url.pathname)

    // ─── API ROUTES: serve .devops-guard/ data ────────────
    if (pathname.startsWith('/api/')) {
      const jsonFile = pathname.replace('/api/', '')

      // Only allow .json files from the data directory
      if (!jsonFile.endsWith('.json') || jsonFile.includes('..')) {
        res.writeHead(403, SECURITY_HEADERS)
        res.end('Forbidden')
        return
      }

      const filePath = safePath(dataDir, jsonFile)
      if (!filePath) {
        res.writeHead(403, SECURITY_HEADERS)
        res.end('Forbidden: path traversal detected')
        return
      }

      if (fs.existsSync(filePath)) {
        serveFile(res, filePath)
      } else {
        // Return empty data shape instead of 404 for better UX
        res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': 'application/json; charset=utf-8' })
        if (jsonFile === 'scan-report.json') {
          res.end(JSON.stringify({
            meta: { generatedAt: null, scanDurationMs: 0, version: '0', rulesLoaded: 0 },
            summary: {
              totalSecurityViolations: 0, bySeverity: {}, unusedDependencies: 0,
              totalBloatKb: 0, timeSavedPerCommitMin: 0, gate1Status: 'N/A',
              gate2Status: 'N/A', srcFilesScanned: 0
            },
            violations: []
          }))
        } else if (jsonFile === 'scan-history.json') {
          res.end('[]')
        } else {
          res.writeHead(404, SECURITY_HEADERS)
          res.end('Not found')
        }
      }
      return
    }

    // ─── STATIC ASSETS: serve dashboard build ─────────────
    let filePath = safePath(DASHBOARD_DIR, pathname === '/' ? 'index.html' : pathname.slice(1))
    if (!filePath) {
      res.writeHead(403, SECURITY_HEADERS)
      res.end('Forbidden: path traversal detected')
      return
    }

    // SPA fallback: if file doesn't exist, serve index.html
    if (!fs.existsSync(filePath)) {
      filePath = indexPath
    }

    serveFile(res, filePath)
  })

  server.listen(port, HOST, () => {
    const url = `http://${HOST}:${port}`
    console.log()
    console.log('  \x1b[36m━'.repeat(60) + '\x1b[0m')
    console.log('  \x1b[1m\x1b[36m  🛡️  DevOps-Guard Dashboard\x1b[0m')
    console.log(`  \x1b[2m  Local:  ${url}\x1b[0m`)
    console.log(`  \x1b[2m  Data:   ${dataDir}\x1b[0m`)
    console.log('  \x1b[36m━'.repeat(60) + '\x1b[0m')
    console.log()
    console.log('  \x1b[2m  Press Ctrl+C to stop\x1b[0m')
    console.log()

    if (!noOpen) {
      setTimeout(() => openBrowser(url), OPEN_DELAY_MS)
    }
  })

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n  \x1b[2m  Shutting down dashboard server...\x1b[0m\n')
    server.close(() => process.exit(0))
  }
  process.on('SIGINT',  shutdown)
  process.on('SIGTERM', shutdown)

  return server
}
