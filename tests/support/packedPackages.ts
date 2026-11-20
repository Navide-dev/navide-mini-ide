import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import type { TestProject } from 'vitest/node'

// Vitest globalSetup for the package boundary test: hands it the public
// @navide package tarballs exactly as package-lock.json resolved them (the
// Navide GitHub Release; npm ci has them in its cache already).

declare module 'vitest' {
  export interface ProvidedContext {
    publicPackageTarballs: Record<string, string>
  }
}

const packageRoot = resolve(import.meta.dirname, '../..')
const publicPackages = ['@navide/plugin-contracts', '@navide/plugin-sdk', '@navide/plugin-ui']

export default function setup(project: TestProject): () => void {
  const packDirectory = mkdtempSync(join(tmpdir(), 'navide-mini-ide-pack-'))
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const pack = (spec: string): string => join(packDirectory, execFileSync(npm, ['pack', spec, '--pack-destination', packDirectory, '--silent'], {
    cwd: packageRoot, encoding: 'utf8', shell: process.platform === 'win32',
  }).trim().split('\n').pop()!)
  const lock = JSON.parse(readFileSync(join(packageRoot, 'package-lock.json'), 'utf8')) as {
    packages: Record<string, { resolved?: string }>
  }
  const tarballs: Record<string, string> = {}
  for (const name of publicPackages) {
    const resolved = lock.packages[`node_modules/${name}`]?.resolved
    if (!resolved) throw new Error(`package-lock.json does not resolve ${name}`)
    tarballs[name] = pack(resolved)
  }
  project.provide('publicPackageTarballs', tarballs)
  return () => rmSync(packDirectory, { recursive: true, force: true })
}
