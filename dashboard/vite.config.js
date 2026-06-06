import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],

  // Dev mode: serve .devops-guard/ data as static assets for local development
  // Build mode: DO NOT copy data files into the bundle — the CLI server serves them
  publicDir: command === 'serve' ? '../.devops-guard' : false,

  build: {
    // Output built dashboard into the core package so it ships with the CLI
    outDir: path.resolve(__dirname, '../packages/core/dashboard-dist'),
    emptyOutDir: true,
  },
}))
