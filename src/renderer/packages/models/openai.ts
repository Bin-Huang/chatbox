import { Message } from 'src/shared/types'
import { ApiError, ChatboxAIAPIError } from './errors'
import Base, { onResultChange } from './base'

interface Options {
    openaiKey: string
    apiHost: string
    apiPath?: string
    model: Model | 'custom-model'
    openaiCustomModel?: string
    temperature: number
    topP: number
}

export default class OpenAI extends Base {
    public name = 'OpenAI'

    public options: Options
    constructor(options: Options) {
        super()
        this.options = options
        if (this.options.apiHost && this.options.apiHost.trim().length === 0) {
            this.options.apiHost = 'https://api.openai.com'
        }
        if (this.options.apiHost && this.options.apiHost.startsWith('https://openrouter.ai/api/v1')) {
            this.options.apiHost = 'https://openrouter.ai/api'
        }
        if (this.options.apiPath && !this.options.apiPath.startsWith('/')) {
            this.options.apiPath = '/' + this.options.apiPath
        }
    }

    async callChatCompletion(rawMessages: Message[], signal?: AbortSignal, onResultChange?: onResultChange): Promise<string> {
        try {
            return await this._callChatCompletion(rawMessages, signal, onResultChange)
        } catch (e) {
            if (e instanceof ApiError && e.message.includes('Invalid content type. image_url is only supported by certain models.')) {
                throw ChatboxAIAPIError.fromCodeName('model_not_support_image', 'model_not_support_image')
            }
            throw e
        }
    }

    async _callChatCompletion(rawMessages: Message[], signal?: AbortSignal, onResultChange?: onResultChange): Promise<string> {
        let messages = await populateOpenAIMessage(rawMessages, this.options.model)

        const model = this.options.model === 'custom-model'
            ? this.options.openaiCustomModel || ''
            : this.options.model
        messages = injectModelSystemPrompt(model, messages)

        const apiPath = this.options.apiPath || '/v1/chat/completions'
        const response = await this.post(
            `${this.options.apiHost}${apiPath}`,
            this.getHeaders(),
            {
                messages,
                model,
                max_tokens: this.options.model === 'gpt-4-vision-preview'
                    ? openaiModelConfigs['gpt-4-vision-preview'].maxTokens
                    : undefined,
                temperature: this.options.temperature,
                top_p: this.options.topP,
                stream: true,
            },
            signal
        )
        let result = ''
        await this.handleSSE(response, (message) => {
            if (message === '[DONE]') {
                return
            }
            const data = JSON.parse(message)
            if (data.error) {
                throw new ApiError(`Error from OpenAI: ${JSON.stringify(data)}`)
            }
            const text = data.choices[0]?.delta?.content
            if (text !== undefined) {
                result += text
                if (onResultChange) {
                    onResultChange(result)
                }
            }
        })
        return result
    }

    getHeaders() {
        const headers: Record<string, string> = {
            Authorization: `Bearer ${this.options.openaiKey}`,
            'Content-Type': 'application/json',
        }
        if (this.options.apiHost.includes('openrouter.ai')) {
            headers['HTTP-Referer'] = 'https://localhost:3000/'
        }
        return headers
    }

}

// Ref: https://platform.openai.com/docs/models/gpt-4
export const openaiModelConfigs = {
    'gpt-3.5-turbo': {
        maxTokens: 4096,
        maxContextTokens: 16_385,
    },
    'gpt-3.5-turbo-16k': {
        maxTokens: 4096,
        maxContextTokens: 16_385,
    },
    'gpt-3.5-turbo-1106': {
        maxTokens: 4096,
        maxContextTokens: 16_385,
    },
    'gpt-3.5-turbo-0125': {
        maxTokens: 4096,
        maxContextTokens: 16_385,
    },
    'gpt-3.5-turbo-0613': {
        maxTokens: 4096,
        maxContextTokens: 4_096,
    },
    'gpt-3.5-turbo-16k-0613': {
        maxTokens: 4096,
        maxContextTokens: 16_385,
    },

    'gpt-4o-mini': {
        maxTokens: 16_384,
        maxContextTokens: 128_000,
    },
    'gpt-4o-mini-2024-07-18': {
        maxTokens: 16_384,
        maxContextTokens: 128_000,
    },

    'gpt-4o': {
        maxTokens: 4_096,
        maxContextTokens: 128_000,
    },
    'gpt-4o-2024-05-13': {
        maxTokens: 4_096,
        maxContextTokens: 128_000,
    },
    'gpt-4o-2024-08-06': {
        maxTokens: 16_384,
        maxContextTokens: 128_000,
    },
    'chatgpt-4o-latest': {
        maxTokens: 16_384,
        maxContextTokens: 128_000,
    },

    'gpt-4': {
        maxTokens: 4_096,
        maxContextTokens: 8_192,
    },
    'gpt-4-turbo': {
        maxTokens: 4_096,
        maxContextTokens: 128_000,
    },
    'gpt-4-turbo-2024-04-09': {
        maxTokens: 4_096,
        maxContextTokens: 128_000,
    },
    'gpt-4-0613': {
        maxTokens: 4_096,
        maxContextTokens: 8_192,
    },
    'gpt-4-32k': {
        maxTokens: 4_096,
        maxContextTokens: 32_768,
    },
    'gpt-4-32k-0613': {
        maxTokens: 4_096,
        maxContextTokens: 32_768,
    },
    'gpt-4-1106-preview': {
        maxTokens: 4_096,
        maxContextTokens: 128_000,
    },
    'gpt-4-0125-preview': {
        maxTokens: 4_096,
        maxContextTokens: 128_000,
    },
    'gpt-4-turbo-preview': {
        maxTokens: 4_096,
        maxContextTokens: 128_000,
    },
    'gpt-4-vision-preview': {
        maxTokens: 4_096,
        maxContextTokens: 128_000,
    },

    // https://platform.openai.com/docs/models/continuous-model-upgrades
    'gpt-3.5-turbo-0301': {
        maxTokens: 4096,
        maxContextTokens: 4096,
    },
    'gpt-4-0314': {
        maxTokens: 4096,
        maxContextTokens: 8192,
    },
    'gpt-4-32k-0314': {
        maxTokens: 4096,
        maxContextTokens: 32768,
    },
}
export type Model = keyof typeof openaiModelConfigs
export const models = Array.from(Object.keys(openaiModelConfigs)).sort() as Model[]

export async function populateOpenAIMessage(rawMessages: Message[], model: Model | 'custom-model'): Promise<OpenAIMessage[]> {
    return populateOpenAIMessageText(rawMessages)
}

export async function populateOpenAIMessageText(rawMessages: Message[]): Promise<OpenAIMessage[]> {
    const messages: OpenAIMessage[] = rawMessages.map((m) => ({
        role: m.role,
        content: m.content,
    }))
    return messages
}

export function injectModelSystemPrompt(model: string, messages: OpenAIMessage[]) {
    for (const message of messages) {
        if (message.role === 'system') {
            if (typeof message.content == 'string') {
                message.content = `Current model: ${model}\n\n` + message.content
            }
            break
        }
    }
    return messages
}

export interface OpenAIMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
    name?: string
}
