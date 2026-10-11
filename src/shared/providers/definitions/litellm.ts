import { ModelProviderEnum, ModelProviderType } from '../../types'
import { defineProvider } from '../registry'
import LiteLLM from './models/litellm'

const LITELLM_API_HOST = 'http://localhost:4000'

export const liteLLMProvider = defineProvider({
  id: ModelProviderEnum.LiteLLM,
  name: 'LiteLLM',
  type: ModelProviderType.OpenAI,
  urls: {
    website: 'https://www.litellm.ai/',
    apiKey: 'https://docs.litellm.ai/docs/proxy/virtual_keys',
    docs: 'https://docs.litellm.ai/docs/proxy/quick_start',
  },
  defaultSettings: {
    apiHost: LITELLM_API_HOST,
  },
  createModel: (config) => {
    return new LiteLLM(
      {
        apiKey: config.effectiveApiKey,
        apiHost: config.formattedApiHost || LITELLM_API_HOST,
        model: config.model,
        temperature: config.settings.temperature,
        topP: config.settings.topP,
        maxOutputTokens: config.settings.maxTokens,
        stream: config.settings.stream,
      },
      config.dependencies
    )
  },
  getDisplayName: (modelId, providerSettings) => {
    return `LiteLLM (${providerSettings?.models?.find((m) => m.modelId === modelId)?.nickname || modelId})`
  },
})
