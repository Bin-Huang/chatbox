import type { ProviderModelInfo } from 'src/shared/types'
import type { ModelDependencies } from 'src/shared/types/adapters'
import type { SentryScope } from 'src/shared/utils/sentry_adapter'
import { describe, expect, it, vi } from 'vitest'
import { getProviderDefinition, getSystemProviders } from '../index'
import { liteLLMProvider } from './litellm'
import LiteLLM from './models/litellm'

const mockScope: SentryScope = {
  setTag: vi.fn(),
  setExtra: vi.fn(),
}

function createDependencies(): ModelDependencies {
  return {
    request: {
      fetchWithOptions: vi.fn(),
      apiRequest: vi.fn(),
    },
    storage: {
      saveImage: vi.fn(),
      getImage: vi.fn(),
    },
    sentry: {
      captureException: vi.fn(),
      withScope: vi.fn((callback: (scope: SentryScope) => void) => callback(mockScope)),
    },
    getRemoteConfig: vi.fn(),
    platformType: 'desktop',
    oauth: {
      refreshCredential: vi.fn(),
      persistCredential: vi.fn(),
      clearCredential: vi.fn(),
    },
  }
}

const model: ProviderModelInfo = { modelId: 'gpt-6-luna' }

describe('LiteLLM provider definition', () => {
  it('registers the provider with the local proxy address and no built-in models', () => {
    expect(getProviderDefinition('litellm')).toBe(liteLLMProvider)
    expect(liteLLMProvider.name).toBe('LiteLLM')
    expect(liteLLMProvider.defaultSettings?.apiHost).toBe('http://localhost:4000')
    expect(liteLLMProvider.defaultSettings?.models).toBeUndefined()
    expect(getSystemProviders().some((provider) => provider.id === 'litellm')).toBe(true)
  })

  it('adds /v1 to the proxy address', () => {
    const instance = new LiteLLM({ apiKey: '', apiHost: 'http://localhost:4000', model }, createDependencies())
    expect(instance.options.apiHost).toBe('http://localhost:4000/v1')
  })

  it('keeps an apiHost that already ends with /v1', () => {
    const instance = new LiteLLM({ apiKey: '', apiHost: 'https://proxy.example.com/v1/', model }, createDependencies())
    expect(instance.options.apiHost).toBe('https://proxy.example.com/v1')
  })

  it('lists models from /v1/models with the virtual key', async () => {
    const customFetch = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.method).toBe('GET')
      expect(init?.headers).toMatchObject({ Authorization: 'Bearer sk-litellm' })
      const body = {
        object: 'list',
        data: [
          { id: 'gpt-6-luna', object: 'model', created: 0 },
          { id: 'text-embedding-3-large', object: 'model', created: 0 },
        ],
      }
      return Promise.resolve(
        new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
      )
    })
    const instance = new LiteLLM(
      { apiKey: 'sk-litellm', apiHost: 'http://localhost:4000', model, customFetch },
      createDependencies()
    )

    const models = await instance.listModels()

    expect(customFetch).toHaveBeenCalledWith('http://localhost:4000/v1/models', expect.anything())
    expect(models.map((m) => m.modelId)).toEqual(['gpt-6-luna', 'text-embedding-3-large'])
  })

  it('creates a model without an API key', () => {
    const instance = liteLLMProvider.createModel({
      settings: { provider: 'litellm', modelId: 'gpt-6-luna' },
      globalSettings: {},
      config: { uuid: '' },
      dependencies: createDependencies(),
      providerSetting: {},
      formattedApiHost: '',
      formattedApiPath: '',
      model,
      effectiveApiKey: '',
    } as unknown as Parameters<typeof liteLLMProvider.createModel>[0])

    expect(instance).toBeInstanceOf(LiteLLM)
    expect((instance as LiteLLM).options.apiHost).toBe('http://localhost:4000/v1')
    expect((instance as LiteLLM).options.apiKey).toBe('')
  })
})
