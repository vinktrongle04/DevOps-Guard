// ============================================================
// useScanHistory — Custom React Hook
// Fetches /scan-history.json and returns historical scan data
// for the trend sparkline chart in the Dashboard.
// ============================================================

import { useState, useEffect } from 'react'

export function useScanHistory() {
  const [history, setHistory] = useState([])
  const [status,  setStatus]  = useState('idle')

  useEffect(() => {
    const load = async () => {
      setStatus('loading')
      try {
        const res  = await fetch(`/scan-history.json?t=${Date.now()}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        // Ensure chronological order
        setHistory([...data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)))
        setStatus('ready')
      } catch {
        setStatus('error')
      }
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
