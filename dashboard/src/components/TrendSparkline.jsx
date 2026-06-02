// ============================================================
// TrendSparkline — SVG sparkline chart for violation history
// Shows the trend of total security violations over time.
// Uses pure SVG — no external chart library needed.
// ============================================================

/**
 * @component TrendSparkline
 * @description Renders an SVG sparkline of historical security violation counts.
 * @param {Array}  history   - Array of scan snapshots from useScanHistory
 * @param {string} [field]   - Which field to plot (default: 'total')
 * @param {number} [width]   - SVG width in px (default: 240)
 * @param {number} [height]  - SVG height in px (default: 56)
 * @param {string} [color]   - Stroke color (default: '#6366f1')
 */
export default function TrendSparkline({
  history,
  field  = 'total',
  width  = 240,
  height = 56,
  color  = '#6366f1',
}) {
  if (!history || history.length < 2) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Collecting data…</span>
      </div>
    )
  }

  const values  = history.map(h => h[field] ?? 0)
  const minVal  = Math.min(...values)
  const maxVal  = Math.max(...values)
  const range   = maxVal - minVal || 1
  const pad     = 6

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (width - pad * 2)
    const y = pad + ((maxVal - v) / range) * (height - pad * 2)
    return [x, y]
  })

  const polyline = points.map(([x, y]) => `${x},${y}`).join(' ')

  // Area fill path
  const areaPath = [
    `M ${points[0][0]},${height}`,
    ...points.map(([x, y]) => `L ${x},${y}`),
    `L ${points[points.length - 1][0]},${height}`,
    'Z',
  ].join(' ')

  const lastPoint  = points[points.length - 1]
  const firstPoint = points[0]
  const isImproving = values[values.length - 1] < values[0]
  const dotColor = isImproving ? '#22c55e' : '#ef4444'

  return (
    <div style={{ position: 'relative' }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <path d={areaPath} fill="url(#sparkGrad)" />

        {/* Line */}
        <polyline
          points={polyline}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Start dot */}
        <circle cx={firstPoint[0]} cy={firstPoint[1]} r="3" fill="#64748b" />

        {/* End dot — color-coded by trend */}
        <circle cx={lastPoint[0]} cy={lastPoint[1]} r="4" fill={dotColor} />
        <circle cx={lastPoint[0]} cy={lastPoint[1]} r="7" fill={dotColor} opacity="0.2" />
      </svg>
    </div>
  )
}
