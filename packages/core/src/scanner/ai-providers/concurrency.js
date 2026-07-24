// ============================================================
// concurrency.js — bounded-concurrency batch runner
// ============================================================
// No new dependency (no p-limit) — a shared cursor with N pulling
// workers. Each worker's failure is isolated so one rejected call can't
// abort the whole batch (Promise.all would otherwise reject immediately
// while sibling workers are still mid-flight).
// ============================================================

export async function mapLimit(items, limit, worker) {
  let cursor = 0

  async function run() {
    while (cursor < items.length) {
      const idx = cursor++
      try {
        await worker(items[idx], idx)
      } catch {
        // Isolate per-item failures — the caller's worker should already
        // handle its own errors (e.g. defaulting to a safe verdict), this
        // is belt-and-suspenders so one bad item never drops the batch.
      }
    }
  }

  const workerCount = Math.max(1, Math.min(limit, items.length))
  await Promise.all(Array.from({ length: workerCount }, run))
}
