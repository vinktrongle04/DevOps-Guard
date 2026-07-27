// ============================================================
// utils/config.js — Configuration system
// Discovers and merges guard.config.js from project root
// with sensible defaults for zero-config usage.
// ============================================================

import fs   from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'

const CONFIG_FILES = ['guard.config.js', 'guard.config.mjs', '.guardrc.js']

/** @type {import('../../types.js').GuardConfig} */
const DEFAULTS = {
  // Directories to skip during scanning (shared by the security & dependency scanners)
  ignorePaths: [
    'node_modules', '.git', 'dist', 'build', 'dashboard-dist', '.husky', '.github',
    'coverage', 'public', 'kb', '.knowledge-base', '.gemini', 'docs',
    '.devops-guard',
  ],
  // File extensions the dependency scanner treats as source (import/require extraction)
  extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs'],
  // File extensions the security scanner treats as scannable for secrets — deliberately
  // separate from `extensions` above: widening one must not silently narrow the other
  // (e.g. secrets leak into .env/.json/.yaml just as often as .js).
  secretExtensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.env', '.yml', '.yaml', '.md', '.toml', '.cfg', '.ini', '.conf'],
  // Additional secret-detection rules, merged with the built-in rule set
  customRules: [],
  // Source directory to scan for dependency import-extraction (relative to project root,
  // null = auto-detect the first workspace with a src/, falling back to project root)
  srcDir: null,
  // Packages always considered "used" even if not imported in src/
  runtimeDeps: ['husky', 'vite', 'eslint', 'prettier', 'typescript'],
  // Severity threshold: only show violations at or above this level
  minSeverity: 'LOW',
  // Severity threshold that hard-blocks a commit/CI run
  failOnSeverity: 'HIGH',
  // AI Semantic Engine — verifies regex matches against surrounding code
  // context to filter out mock/test-fixture false positives.
  aiVerifier: {
    provider: 'ollama',        // 'ollama' | 'anthropic' | 'openai' | 'off'
    model: null,               // null = provider-specific default
    apiKey: null,               // explicit override; null = fall back to ANTHROPIC_API_KEY / OPENAI_API_KEY env var
    autoConfirm: false,         // skip the cloud-cost consent prompt (also settable via --yes / DEVOPS_GUARD_YES=1)
    concurrency: 5,             // bounded parallel verification calls
    ollama: { host: '127.0.0.1', port: 11434 },
  },
}

/**
 * Loads and merges project config with defaults.
 * @param {string} projectRoot - The project root directory (process.cwd())
 * @returns {Promise<typeof DEFAULTS>}
 */
export async function loadConfig(projectRoot) {
  for (const file of CONFIG_FILES) {
    const cfgPath = path.join(projectRoot, file)
    if (fs.existsSync(cfgPath)) {
      try {
        const mod = await import(pathToFileURL(cfgPath).href)
        const userConfig = mod.default ?? mod
        return { ...DEFAULTS, ...userConfig }
      } catch (err) {
        console.warn(`[devops-guard] Warning: Could not parse ${file}: ${err.message}`)
      }
    }
  }
  return { ...DEFAULTS }
}
