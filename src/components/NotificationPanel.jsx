import React, { forwardRef, useContext, useState } from 'react';
import { ThemeContext } from '../contexts/ThemeContext';

// ─────────────────────────────────────────────────────────────
// NotificationPanel — DevOps-Guard Alert Feed
// ─────────────────────────────────────────────────────────────

const MOCK_NOTIFICATIONS = [
  {
    id: 'notif-1',
    icon: '✅',
    title: 'Security scan passed',
    description: 'All 142 dependencies are free of known vulnerabilities.',
    timestamp: '2 min ago',
    type: 'success',
  },
  {
    id: 'notif-2',
    icon: '🚀',
    title: 'Build succeeded',
    description: 'Pipeline #1847 completed in 3m 22s — all stages green.',
    timestamp: '8 min ago',
    type: 'success',
  },
  {
    id: 'notif-3',
    icon: '💬',
    title: 'New PR review requested',
    description: 'feat/auth-rbac needs your review — 14 files changed.',
    timestamp: '15 min ago',
    type: 'info',
  },
  {
    id: 'notif-4',
    icon: '⚠️',
    title: 'Memory usage warning',
    description: 'Production pod memory at 87% — consider scaling.',
    timestamp: '32 min ago',
    type: 'warning',
  },
];

// ❌ React 18 pattern: forwardRef → React 19 hỗ trợ ref như prop thường
// In React 19 you can accept `ref` as a regular prop without wrapping
// the component in forwardRef.
const NotificationPanel = forwardRef(function NotificationPanel(
  { maxVisible = 4 },
  ref,
) {
  // ❌ React 18 pattern: useContext(Context) → React 19 dùng use(Context)
  // In React 19 you can call use(ThemeContext) instead of useContext.
  const { palette, fontFamily } = useContext(ThemeContext);

  const [dismissed, setDismissed] = useState([]);

  const visibleNotifications = MOCK_NOTIFICATIONS.filter(
    (n) => !dismissed.includes(n.id),
  ).slice(0, maxVisible);

  const handleDismiss = (id) => {
    setDismissed((prev) => [...prev, id]);
  };

  const typeColor = {
    success: palette.success,
    warning: palette.warning,
    error: palette.error,
    info: palette.info,
  };

  // ── Styles ────────────────────────────────────────────────
  const styles = {
    panel: {
      fontFamily,
      backgroundColor: palette.bgSecondary,
      border: `1px solid ${palette.border}`,
      borderRadius: 12,
      padding: '20px 0',
      width: '100%',
      maxWidth: 420,
      boxShadow: '0 4px 24px rgba(0,0,0,.35)',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px 14px',
      borderBottom: `1px solid ${palette.border}`,
      marginBottom: 8,
    },
    headerTitle: {
      fontSize: 15,
      fontWeight: 600,
      color: palette.text,
      margin: 0,
    },
    badge: {
      fontSize: 11,
      fontWeight: 700,
      color: '#fff',
      backgroundColor: palette.accent,
      borderRadius: 10,
      padding: '2px 8px',
      lineHeight: '18px',
    },
    list: {
      listStyle: 'none',
      margin: 0,
      padding: 0,
    },
    item: (type) => ({
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      padding: '12px 20px',
      borderLeft: `3px solid ${typeColor[type] || palette.accent}`,
      cursor: 'default',
      transition: 'background .15s',
    }),
    icon: {
      fontSize: 20,
      lineHeight: '24px',
      flexShrink: 0,
    },
    content: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      fontSize: 13,
      fontWeight: 600,
      color: palette.text,
      margin: 0,
      lineHeight: '20px',
    },
    desc: {
      fontSize: 12,
      color: palette.textMuted,
      margin: '2px 0 0',
      lineHeight: '17px',
    },
    time: {
      fontSize: 11,
      color: palette.textMuted,
      marginTop: 4,
    },
    dismissBtn: {
      background: 'none',
      border: 'none',
      color: palette.textMuted,
      fontSize: 16,
      cursor: 'pointer',
      padding: '0 2px',
      lineHeight: 1,
      flexShrink: 0,
      opacity: 0.6,
    },
    empty: {
      textAlign: 'center',
      padding: '32px 20px',
      color: palette.textMuted,
      fontSize: 13,
    },
  };

  return (
    <div ref={ref} style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.headerTitle}>Notifications</h3>
        <span style={styles.badge}>
          {visibleNotifications.length}
        </span>
      </div>

      {/* Notification list */}
      {visibleNotifications.length === 0 ? (
        <p style={styles.empty}>🎉 All clear — no new notifications.</p>
      ) : (
        <ul style={styles.list}>
          {visibleNotifications.map((notif) => (
            <li key={notif.id} style={styles.item(notif.type)}>
              <span style={styles.icon}>{notif.icon}</span>

              <div style={styles.content}>
                <p style={styles.title}>{notif.title}</p>
                <p style={styles.desc}>{notif.description}</p>
                <span style={styles.time}>{notif.timestamp}</span>
              </div>

              <button
                style={styles.dismissBtn}
                onClick={() => handleDismiss(notif.id)}
                title="Dismiss"
                aria-label={`Dismiss ${notif.title}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

NotificationPanel.displayName = 'NotificationPanel';

export default NotificationPanel;
