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
  // Directories to skip during scanning
  ignorePaths: [
    'node_modules', '.git', 'dist', 'build', 'coverage',
    '.devops-guard', 'kb', '.knowledge-base',
  ],
  // File extensions to scan
  extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.vue', '.svelte'],
  // Which rule categories to enable (null = all)
  rules: null,
  // Output directory for reports and knowledge graph
  outputDir: '.devops-guard',
  // Source directory to scan (relative to project root, null = root)
  srcDir: null,
  // Packages always considered "used" even if not imported in src/
  runtimeDeps: ['husky', 'vite', 'eslint', 'prettier', 'typescript'],
  // Severity threshold: only show violations at or above this level
  minSeverity: 'LOW',
  // Auto-fix behavior: 'off' | 'dry-run' | 'apply'
  fix: 'dry-run',
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

/**
 * Returns the absolute path to the output directory.
 * @param {string} projectRoot
 * @param {typeof DEFAULTS} config
 */
export function getOutputDir(projectRoot, config) {
  return path.resolve(projectRoot, config.outputDir)
}

/**
 * Ensures the output directory exists.
 * @param {string} outputDir
 */
export function ensureOutputDir(outputDir) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
}
