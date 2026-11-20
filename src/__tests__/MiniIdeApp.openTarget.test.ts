// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { i18n } from '@navide/plugin-ui/foundation'

const nav = {
  callCapability: vi.fn(async (_namespace: string, method: string) => ({
    reqId: 'test',
    ok: true,
    result: method === 'readEditorPreferences' ? { preferences: {} } : { found: false },
  })),
  on: vi.fn(() => vi.fn()),
  ready: vi.fn(),
  hideSelf: vi.fn(),
  registerReceiver: vi.fn(async () => ({ receiverId: 'receiver-1' })),
  listReceiverLeftContributions: vi.fn(async () => []),
  openReceiverLeft: vi.fn(async () => undefined),
  acceptExistingReceiverOffer: vi.fn(async () => ({ accepted: true, itemId: 'item-1' })),
  onReceiverOffer: vi.fn(() => vi.fn()),
  onReceiverEditorTarget: vi.fn(() => vi.fn()),
  onReceiverCloseGuard: vi.fn(() => vi.fn()),
  mountReceiver: vi.fn(async () => ({ itemId: 'item-1' })),
  requestCloseReceiver: vi.fn(async () => ({ closed: true as const })),
  requestCloseReceiverTransaction: vi.fn(async () => ({ closed: true as const })),
  abortReceiverItem: vi.fn(async () => undefined),
  onReceiverItemClosed: vi.fn(() => vi.fn()),
  disposeReceiver: vi.fn(async () => undefined),
  onOpenTarget: vi.fn((_listener: (target: Record<string, string>) => void) => vi.fn()),
}

;(globalThis as unknown as { nav: typeof nav }).nav = nav

let wrapper: VueWrapper | null = null

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  nav.onOpenTarget.mockClear()
  window.history.replaceState(null, '', '/')
})

async function mountWithQuery(query: string): Promise<VueWrapper> {
  window.history.replaceState(null, '', `/?${query}`)
  const MiniIdeApp = (await import('../MiniIdeApp.vue')).default
  wrapper = mount(MiniIdeApp, {
    shallow: true,
    attachTo: document.body,
    global: { mocks: { $t: (key: string) => key }, plugins: [i18n] },
  })
  await flushPromises()
  return wrapper
}

function openedPanes(w: VueWrapper): Array<{ workspacePath?: string; relPath?: string }> {
  return w.findAll('editor-pane-stub').map((pane) => ({
    workspacePath: pane.attributes('workspacepath'),
    relPath: pane.attributes('relpath'),
  }))
}

// An absolute target read as workspace-relative opened a "not a file" tab.
describe('MiniIdeApp absolute open targets', { timeout: 60_000 }, () => {
  it('opens an initial absolute path inside the workspace as its relative tab', async () => {
    const w = await mountWithQuery('workspace_path=%2Fws&filepath=%2Fws%2Fsrc%2Fa.ts')

    expect(openedPanes(w)).toEqual([{ workspacePath: '/ws', relPath: 'src/a.ts' }])
  })

  it('opens an initial absolute path outside the workspace under its own directory', async () => {
    const w = await mountWithQuery('workspace_path=%2Fws&filepath=%2Fetc%2Fhosts')

    expect(openedPanes(w)).toEqual([{ workspacePath: '/etc', relPath: 'hosts' }])
  })

  it('splits an absolute path delivered as an open target', async () => {
    const w = await mountWithQuery('workspace_path=%2Fws')
    const listener = nav.onOpenTarget.mock.calls[0]?.[0]
    expect(listener).toBeTypeOf('function')

    listener?.({ filepath: '/ws/src/b.ts' })
    listener?.({ filepath: '/other/c.ts' })
    await flushPromises()

    expect(openedPanes(w)).toEqual([
      { workspacePath: '/ws', relPath: 'src/b.ts' },
      { workspacePath: '/other', relPath: 'c.ts' },
    ])
  })

  it('keeps a relative target on the root the sender gave in file_ws', async () => {
    const w = await mountWithQuery('workspace_path=%2Fws')
    nav.onOpenTarget.mock.calls[0]?.[0]?.({ filepath: 'notes.md', file_ws: '/elsewhere' })
    await flushPromises()

    expect(openedPanes(w)).toEqual([{ workspacePath: '/elsewhere', relPath: 'notes.md' }])
  })
})
