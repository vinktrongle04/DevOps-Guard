// ============================================================
// utils/colors.js — Shared terminal color utilities
// Used across all DevOps-Guard core modules
// ============================================================

export const COLORS = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  cyan:    '\x1b[36m',
  white:   '\x1b[37m',
}

/**
 * Wraps text in ANSI color codes.
 * @param {keyof COLORS} color
 * @param {string} text
 */
export function paint(color, text) {
  return `${COLORS[color] ?? ''}${text}${COLORS.reset}`
}

/**
 * Prints a colored line to stdout.
 * @param {keyof COLORS} color
 * @param {string} msg
 */
export function log(color, msg) {
  console.log(paint(color, msg))
}

/**
 * Prints a section header.
 * @param {string} title
 */
export function section(title) {
  console.log()
  log('cyan', `${COLORS.bold}  ${title}`)
  log('cyan', '  ' + '─'.repeat(60))
}

/**
 * Prints a banner divider.
 * @param {'cyan'|'red'|'green'|'yellow'} color
 */
export function divider(color = 'cyan') {
  log(color, '━'.repeat(64))
}
