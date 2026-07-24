import { describe, it, expect } from 'vitest'
import { resolveProvider } from './index.js'
import { mapLimit } from './concurrency.js'

describe('resolveProvider', () => {
  it('defaults to ollama when aiVerifier is unset (zero-config backward compat)', () => {
    const provider = resolveProvider(undefined)
    expect(provider.name).toBe('ollama')
    expect(provider.isCloud).toBe(false)
  })

  it('defaults to ollama when provider key is unset', () => {
    const provider = resolveProvider({})
    expect(provider.name).toBe('ollama')
  })

  it('returns null for provider: "off"', () => {
    expect(resolveProvider({ provider: 'off' })).toBeNull()
  })

  it('returns null for an unknown provider name', () => {
    expect(resolveProvider({ provider: 'not-a-real-provider' })).toBeNull()
  })

  it('returns null for anthropic with no API key configured or in env', () => {
    const original = process.env.ANTHROPIC_API_KEY
    delete process.env.ANTHROPIC_API_KEY
    try {
      expect(resolveProvider({ provider: 'anthropic' })).toBeNull()
    } finally {
      if (original !== undefined) process.env.ANTHROPIC_API_KEY = original
    }
  })

  it('resolves anthropic when an API key is explicitly configured', () => {
    const provider = resolveProvider({ provider: 'anthropic', apiKey: 'sk-ant-test' })
    expect(provider.name).toBe('anthropic')
    expect(provider.isCloud).toBe(true)
    expect(provider.isConfigured()).toBe(true)
  })

  it('resolves anthropic from the ANTHROPIC_API_KEY env var when config has no key', () => {
    const original = process.env.ANTHROPIC_API_KEY
    process.env.ANTHROPIC_API_KEY = 'sk-ant-from-env'
    try {
      const provider = resolveProvider({ provider: 'anthropic' })
      expect(provider.isConfigured()).toBe(true)
    } finally {
      if (original === undefined) delete process.env.ANTHROPIC_API_KEY
      else process.env.ANTHROPIC_API_KEY = original
    }
  })

  it('resolves openai when an API key is explicitly configured', () => {
    const provider = resolveProvider({ provider: 'openai', apiKey: 'sk-test' })
    expect(provider.name).toBe('openai')
    expect(provider.isCloud).toBe(true)
  })
})

describe('cloud providers never auto-ping', () => {
  it('anthropic checkAvailability only checks isConfigured(), makes no network call', async () => {
    const provider = resolveProvider({ provider: 'anthropic', apiKey: 'sk-ant-test' })
    const availability = await provider.checkAvailability()
    expect(availability).toEqual({ available: true })
  })

  it('estimateCost scales with call count', () => {
    const provider = resolveProvider({ provider: 'anthropic', apiKey: 'sk-ant-test' })
    const cost1 = provider.estimateCost(1)
    const cost10 = provider.estimateCost(10)
    expect(cost10.estimatedUsd).toBeCloseTo(cost1.estimatedUsd * 10, 10)
  })
})

describe('mapLimit', () => {
  it('processes every item exactly once', async () => {
    const items = Array.from({ length: 20 }, (_, i) => i)
    const seen = []
    await mapLimit(items, 4, async n => {
      seen.push(n)
    })
    expect(seen.sort((a, b) => a - b)).toEqual(items)
  })

  it('never runs more than `limit` workers concurrently', async () => {
    let active = 0
    let maxActive = 0
    const items = Array.from({ length: 10 }, (_, i) => i)
    await mapLimit(items, 3, async () => {
      active++
      maxActive = Math.max(maxActive, active)
      await new Promise(r => setTimeout(r, 5))
      active--
    })
    expect(maxActive).toBeLessThanOrEqual(3)
  })

  it("isolates a failing item — one rejection doesn't stop the batch", async () => {
    const items = [1, 2, 3, 4, 5]
    const processed = []
    await mapLimit(items, 2, async n => {
      if (n === 3) throw new Error('boom')
      processed.push(n)
    })
    expect(processed.sort()).toEqual([1, 2, 4, 5])
  })
})
