/**
 * Entry: health HTTP + claim loop for Coolify checkion-v3:scan-worker.
 * Run: npx tsx --tsconfig apps/web/tsconfig.json apps/web/scripts/run-scan-worker.ts
 */

import http from 'node:http'
import { paths } from '../lib/paths'
import {
  runScanWorkerLoop,
  scanWorkerHealthPayload,
} from '../lib/scan/scan-worker-loop'

const port = Number(process.env.PORT?.trim() || paths.scanWorkerPort) || paths.scanWorkerPort

const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    const body = JSON.stringify(scanWorkerHealthPayload())
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(body)
    return
  }
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ ok: false, error: 'not_found' }))
})

server.listen(port, process.env.HOSTNAME?.trim() || '0.0.0.0', () => {
  console.info(`[checkion-scan-worker] health on :${port}`)
})

const ac = new AbortController()
process.on('SIGTERM', () => ac.abort())
process.on('SIGINT', () => ac.abort())

void runScanWorkerLoop(ac.signal).finally(() => {
  server.close()
  process.exit(0)
})
