import React, { createContext, useState, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────
// ThemeContext — DevOps-Guard Dark Theme System
// ─────────────────────────────────────────────────────────────

const defaultTheme = {
  mode: 'dark',
  primaryColor: '#6366f1',
  fontFamily: 'Inter, system-ui, sans-serif',
};

const darkPalette = {
  bg: '#1a1a2e',
  bgSecondary: '#1e1e2e',
  bgTertiary: '#252540',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  accent: '#6366f1',
  accentHover: '#818cf8',
  border: '#2a2a3e',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
};

const lightPalette = {
  bg: '#f8fafc',
  bgSecondary: '#ffffff',
  bgTertiary: '#f1f5f9',
  text: '#1e293b',
  textMuted: '#64748b',
  accent: '#6366f1',
  accentHover: '#4f46e5',
  border: '#e2e8f0',
  success: '#16a34a',
  warning: '#d97706',
  error: '#dc2626',
  info: '#2563eb',
};

export const ThemeContext = createContext({
  ...defaultTheme,
  palette: darkPalette,
  toggleMode: () => {},
});

/**
 * ThemeProvider
 *
 * Provides theme configuration (mode, colors, palette) to the
 * entire DevOps-Guard component tree.
 */
export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(defaultTheme.mode);

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const palette = mode === 'dark' ? darkPalette : lightPalette;

  const value = {
    mode,
    primaryColor: defaultTheme.primaryColor,
    fontFamily: defaultTheme.fontFamily,
    palette,
    toggleMode,
  };

  // ❌ React 18 pattern: <Context.Provider> → React 19 dùng <Context value={...}>
  // In React 19 you can render <ThemeContext value={value}> directly
  // without the .Provider suffix.
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export default ThemeContext;
