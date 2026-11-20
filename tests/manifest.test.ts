import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// The Manifest v2 parser and loader checks run on the build
// (`npm run build && npm run check`, navide-plugin validate dist) and, on the
// staged copy, in the Navide repository.
const sourceDir = resolve(fileURLToPath(new URL('..', import.meta.url)))
const expectedMarketplace = {
  icon: 'assets/mini-ide.png',
  description: 'Edit workspace files, review changes and run AI CLI sessions in an independent IDE window.',
  license: 'MIT',
  repository: 'https://github.com/Navide-dev/navide-mini-ide',
  categories: ['productivity', 'development'],
}

describe('navide.mini-ide manifest', () => {
  it('declares its identity, Marketplace listing and window view', () => {
    const manifest = JSON.parse(readFileSync(`${sourceDir}/manifest.json`, 'utf8')) as {
      schemaVersion: number
      id: string
      version: string
      marketplace: unknown
      contributes?: { views?: Array<Record<string, unknown>> }
    }
    expect(manifest.schemaVersion).toBe(2)
    expect(manifest.id).toBe('navide.mini-ide')
    expect(manifest.version).toBe('1.0.10')
    expect(manifest.marketplace).toEqual(expectedMarketplace)
    expect(manifest.contributes?.views?.find((view) => view.id === 'window')).toMatchObject({
      id: 'window', kind: 'custom', location: 'window', entry: 'frontend/window/index.html',
    })
  })
})
