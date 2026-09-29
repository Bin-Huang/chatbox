import { SettingsService, type SettingsStoragePort } from '@chatbox/core'
import { describe, expect, test } from 'vitest'
import { createSettingsStore } from './createSettingsStore'

class MemorySettingsStorage implements SettingsStoragePort {
  value: unknown = null

  read() {
    return Promise.resolve(this.value)
  }

  write(value: unknown) {
    this.value = value
    return Promise.resolve()
  }

  remove() {
    this.value = null
    return Promise.resolve()
  }
}

describe('createSettingsStore', () => {
  test('projects hydration and routes compatibility setState through SettingsService', async () => {
    const storage = new MemorySettingsStorage()
    const service = new SettingsService(storage, { isDesktopLike: false })
    const store = createSettingsStore(service)

    await store.getState().hydrate()
    expect(store.getState().hydrationStatus).toBe('hydrated')

    store.setState({ language: 'ja' })
    store.setState((state) => {
      state.showWordCount = true
    })
    store.getState().setSettings((settings) => {
      settings.theme = 1
    })
    await service.flushPersistence()

    expect(service.getSettings()).toMatchObject({
      language: 'ja',
      showWordCount: true,
      theme: 1,
    })
    expect(storage.value).toMatchObject({
      language: 'ja',
      showWordCount: true,
      theme: 1,
      __version: 6,
    })

    store.getState().destroy()
    service.dispose()
  })
  test('preserves store actions when a settings update includes the projected state', async () => {
    const storage = new MemorySettingsStorage()
    const service = new SettingsService(storage, { isDesktopLike: false })
    const store = createSettingsStore(service)
    await store.getState().hydrate()
    const getSettings = store.getState().getSettings
    const hydrate = store.getState().hydrate

    service.updateSettings({ ...store.getState(), language: 'ja' })

    expect(store.getState().getSettings).toBe(getSettings)
    expect(store.getState().hydrate).toBe(hydrate)
    expect(store.getState().getSettings().language).toBe('ja')
    store.getState().setSettings({ theme: 1 })
    expect(store.getState().getSettings().theme).toBe(1)
    expect(store.getState().hydrationStatus).toBe('hydrated')
    await service.flushPersistence()
    store.getState().destroy()
    service.dispose()
  })
})
