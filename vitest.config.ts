import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// Self-contained: the public @navide packages resolve from node_modules (the
// tarballs a Navide GitHub Release carries), not from a Navide checkout.
const excluded = ['**/node_modules/**', '**/dist/**']
const setupFiles = ['src/miniIdeMessages.ts']
const heavy = ['tests/packageBoundary.test.ts']
// Catalog checks read plugin-ui's own strings, which src/miniIdeMessages.ts
// would already have merged this plugin's strings into: they run without it.
const i18n = ['tests/i18n/**/*.test.ts']

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'node',
    globals: false,
    // Transform the public packages like source, as the Navide repository's
    // aliases did: vi.resetModules() then re-evaluates their module state.
    server: { deps: { inline: [/@navide\//] } },
    projects: [
      { extends: true, test: {
        name: 'navide-mini-ide', include: ['src/**/*.{test,spec}.ts'], exclude: excluded, setupFiles,
      } },
      { extends: true, test: {
        name: 'navide-mini-ide-artifacts', include: ['tests/**/*.{test,spec}.ts'], exclude: [...excluded, ...heavy, ...i18n], setupFiles,
      } },
      { extends: true, test: { name: 'navide-mini-ide-i18n', include: i18n, exclude: excluded } },
      // Builds a copy against the packed public packages; runs on its own fork.
      { extends: true, test: {
        name: 'navide-mini-ide-artifacts-heavy', include: heavy, exclude: excluded, setupFiles,
        globalSetup: ['tests/support/packedPackages.ts'],
        poolOptions: { forks: { singleFork: true } },
      } },
    ],
  },
})
