import React, { forwardRef, useContext, useState, useCallback } from 'react';
import { ThemeContext } from '../contexts/ThemeContext';

// ─────────────────────────────────────────────────────────────
// SearchBar — DevOps-Guard Global Search
// ─────────────────────────────────────────────────────────────

// ❌ React 18 pattern: forwardRef → React 19 hỗ trợ ref như prop thường
// In React 19 you can accept `ref` as a regular prop without wrapping
// the component in forwardRef.
const SearchBar = forwardRef(function SearchBar(
  { placeholder = 'Search pipelines, deployments, logs…', onSearch },
  ref,
) {
  // ❌ React 18 pattern: useContext(Context) → React 19 dùng use(Context)
  // In React 19 you can call use(ThemeContext) instead of useContext.
  const { palette, fontFamily } = useContext(ThemeContext);

  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = useCallback(
    (e) => {
      const value = e.target.value;
      setQuery(value);
      if (onSearch) onSearch(value);
    },
    [onSearch],
  );

  const handleClear = useCallback(() => {
    setQuery('');
    if (onSearch) onSearch('');
    // Re-focus the input after clearing
    if (ref && typeof ref === 'object' && ref.current) {
      ref.current.focus();
    }
  }, [onSearch, ref]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        handleClear();
      }
    },
    [handleClear],
  );

  // ── Styles ────────────────────────────────────────────────
  const styles = {
    wrapper: {
      fontFamily,
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      maxWidth: 480,
    },
    inputContainer: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      backgroundColor: palette.bgSecondary,
      border: `1.5px solid ${isFocused ? palette.accent : palette.border}`,
      borderRadius: 10,
      transition: 'border-color .2s, box-shadow .2s',
      boxShadow: isFocused
        ? `0 0 0 3px ${palette.accent}33`
        : '0 1px 3px rgba(0,0,0,.2)',
    },
    searchIcon: {
      position: 'absolute',
      left: 14,
      fontSize: 16,
      lineHeight: 1,
      pointerEvents: 'none',
      color: isFocused ? palette.accent : palette.textMuted,
      transition: 'color .2s',
    },
    input: {
      flex: 1,
      background: 'none',
      border: 'none',
      outline: 'none',
      color: palette.text,
      fontSize: 14,
      fontFamily,
      padding: '10px 36px 10px 40px',
      width: '100%',
      caretColor: palette.accent,
    },
    clearBtn: {
      position: 'absolute',
      right: 8,
      display: query ? 'flex' : 'none',
      alignItems: 'center',
      justifyContent: 'center',
      width: 24,
      height: 24,
      borderRadius: 6,
      border: 'none',
      background: palette.bgTertiary,
      color: palette.textMuted,
      fontSize: 14,
      cursor: 'pointer',
      transition: 'background .15s, color .15s',
    },
    shortcut: {
      position: 'absolute',
      right: query ? 38 : 10,
      display: 'flex',
      alignItems: 'center',
      gap: 3,
      pointerEvents: 'none',
      opacity: isFocused ? 0 : 0.5,
      transition: 'opacity .2s',
    },
    kbd: {
      fontSize: 10,
      fontFamily: 'monospace',
      color: palette.textMuted,
      backgroundColor: palette.bgTertiary,
      border: `1px solid ${palette.border}`,
      borderRadius: 4,
      padding: '1px 5px',
      lineHeight: '16px',
    },
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.inputContainer}>
        {/* Search icon */}
        <span style={styles.searchIcon} aria-hidden="true">
          🔍
        </span>

        {/* Input field — ref is forwarded here */}
        <input
          ref={ref}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={styles.input}
          aria-label="Search"
          spellCheck={false}
          autoComplete="off"
        />

        {/* Keyboard shortcut hint */}
        <span style={styles.shortcut}>
          <kbd style={styles.kbd}>⌘</kbd>
          <kbd style={styles.kbd}>K</kbd>
        </span>

        {/* Clear button */}
        <button
          style={styles.clearBtn}
          onClick={handleClear}
          tabIndex={-1}
          aria-label="Clear search"
          title="Clear (Esc)"
        >
          ✕
        </button>
      </div>
    </div>
  );
});

SearchBar.displayName = 'SearchBar';

export default SearchBar;
