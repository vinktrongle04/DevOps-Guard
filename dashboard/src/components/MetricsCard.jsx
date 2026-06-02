import React, { useContext, useState, useEffect, useRef } from 'react';
import { ThemeContext } from '../contexts/ThemeContext';

// ─────────────────────────────────────────────────────────────
// MetricsCard — DevOps-Guard Dashboard KPI Card
// ─────────────────────────────────────────────────────────────

/**
 * Animated count-up hook.
 * Smoothly interpolates from 0 to `target` over `duration` ms.
 */
function useCountUp(target, duration = 1200) {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const numericTarget = typeof target === 'number' ? target : parseFloat(target);
    if (Number.isNaN(numericTarget)) {
      setCurrent(target); // non-numeric values are shown as-is
      return;
    }

    const isFloat = numericTarget % 1 !== 0;
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = eased * numericTarget;
      setCurrent(isFloat ? parseFloat(value.toFixed(1)) : Math.round(value));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return current;
}

const TREND_CONFIG = {
  up: { arrow: '↑', color: '#22c55e', label: 'Trending up' },
  down: { arrow: '↓', color: '#ef4444', label: 'Trending down' },
  stable: { arrow: '→', color: '#94a3b8', label: 'Stable' },
};

function MetricsCard({
  title = 'Metric',
  value = 0,
  unit = '',
  trend = 'stable',
  icon = '📊',
  subtitle = '',
}) {
  // ❌ React 18 pattern: useContext(Context) → React 19 dùng use(Context)
  // In React 19 you can call use(ThemeContext) instead of useContext.
  const { palette, fontFamily } = useContext(ThemeContext);

  const displayValue = useCountUp(value);
  const trendInfo = TREND_CONFIG[trend] || TREND_CONFIG.stable;

  const [isHovered, setIsHovered] = useState(false);

  // ── Styles ────────────────────────────────────────────────
  const styles = {
    card: {
      fontFamily,
      backgroundColor: palette.bgSecondary,
      border: `1px solid ${isHovered ? palette.accent : palette.border}`,
      borderRadius: 14,
      padding: '22px 24px',
      minWidth: 200,
      maxWidth: 280,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      transition: 'border-color .25s, box-shadow .25s, transform .2s',
      boxShadow: isHovered
        ? `0 8px 30px rgba(99,102,241,.18)`
        : '0 2px 12px rgba(0,0,0,.25)',
      transform: isHovered ? 'translateY(-2px)' : 'none',
      cursor: 'default',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    iconBadge: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: `${palette.accent}1a`,
      fontSize: 20,
      lineHeight: 1,
    },
    trendBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 12,
      fontWeight: 600,
      color: trendInfo.color,
      backgroundColor: `${trendInfo.color}18`,
      borderRadius: 8,
      padding: '3px 8px',
    },
    title: {
      fontSize: 13,
      fontWeight: 500,
      color: palette.textMuted,
      margin: 0,
      letterSpacing: '0.02em',
      textTransform: 'uppercase',
    },
    valueRow: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 6,
    },
    value: {
      fontSize: 32,
      fontWeight: 700,
      color: palette.text,
      lineHeight: 1,
      margin: 0,
      fontVariantNumeric: 'tabular-nums',
    },
    unit: {
      fontSize: 14,
      fontWeight: 500,
      color: palette.textMuted,
    },
    subtitle: {
      fontSize: 12,
      color: palette.textMuted,
      margin: 0,
      lineHeight: '17px',
    },
    divider: {
      height: 1,
      backgroundColor: palette.border,
      margin: '2px 0',
      border: 'none',
    },
  };

  return (
    <div
      style={styles.card}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="region"
      aria-label={`${title}: ${value}${unit}`}
    >
      {/* Top row: icon + trend */}
      <div style={styles.header}>
        <span style={styles.iconBadge} aria-hidden="true">
          {icon}
        </span>
        <span style={styles.trendBadge} title={trendInfo.label}>
          {trendInfo.arrow} {trend}
        </span>
      </div>

      {/* Title */}
      <p style={styles.title}>{title}</p>

      {/* Big number */}
      <div style={styles.valueRow}>
        <span style={styles.value}>{displayValue}</span>
        {unit && <span style={styles.unit}>{unit}</span>}
      </div>

      {/* Optional subtitle */}
      {subtitle && (
        <>
          <hr style={styles.divider} />
          <p style={styles.subtitle}>{subtitle}</p>
        </>
      )}
    </div>
  );
}

export default MetricsCard;
