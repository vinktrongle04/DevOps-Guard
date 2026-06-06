// ============================================================
// useScanHistory — Custom React Hook
// Fetches scan-history.json and returns historical scan data
// for the trend sparkline chart in the Dashboard.
//
// Data source detection:
//   - CLI server (devops-guard dashboard): /api/scan-history.json
//   - Vite dev server:                     /scan-history.json
// ============================================================

import { useState, useEffect } from 'react'

export function useScanHistory() {
  const [history, setHistory] = useState([])
  const [status,  setStatus]  = useState('idle')

  useEffect(() => {
    const load = async () => {
      setStatus('loading')

      // Try CLI server route first, fall back to Vite public
      const urls = ['/api/scan-history.json', '/scan-history.json']

      for (const url of urls) {
        try {
          const res = await fetch(`${url}?t=${Date.now()}`)
          if (!res.ok) continue
          const data = await res.json()
          setHistory([...data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)))
          setStatus('ready')
          return
        } catch {
          // try next URL
        }
      }

      setStatus('error')
    }
    load()
  }, [])

  // Derive trend: compare last vs second-to-last snapshot
  const trend = history.length >= 2
    ? history[history.length - 1].total - history[history.length - 2].total
    : 0

  const latestTotal    = history.length ? history[history.length - 1].total : null
  const earliestTotal  = history.length ? history[0].total : null
  const totalImproved  = earliestTotal !== null && latestTotal !== null
    ? earliestTotal - latestTotal
    : 0

  return { history, status, trend, latestTotal, earliestTotal, totalImproved }
}
