import { Message } from 'src/shared/types'
import { ApiError } from './errors'
import Base, { onResultChange } from './base'

interface Options {
    geminiKey: string
    apiHost: string
    apiPath?: string
    model: Model | 'custom-model'
    geminiCustomModel?: string
    temperature: number
}

export default class Gemini extends Base {
    public name = 'Gemini'

    public options: Options
    constructor(options: Options) {
        super()
        this.options = options
        if (this.options.apiHost && this.options.apiHost.trim().length === 0) {
            this.options.apiHost = 'https://generativelanguage.googleapis.com'
        }
    }

    async callChatCompletion(
        rawMessages: Message[],
        signal?: AbortSignal,
        onResultChange?: onResultChange
    ): Promise<string> {
        const messages = await populateGeminiMessage(rawMessages)
        const model = this.options.model === 'custom-model'
            ? this.options.geminiCustomModel || ''
            : this.options.model

        const response = await this.post(
            `${this.options.apiHost}/v1beta/models/${model}:streamGenerateContent`,
            this.getHeaders(),
            {
                contents: messages,
                generationConfig: {
                    temperature: this.options.temperature,
                },
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
                throw new ApiError(`Error from Gemini: ${JSON.stringify(data)}`)
            }
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text
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
        return {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.options.geminiKey,
        }
    }

    async listModels(): Promise<string[]> {
        const res = await this.get(`${this.options.apiHost}/v1beta/models`, {
            headers: this.getHeaders(),
        })
        const json = await res.json()
        if (!json.models) {
            throw new ApiError(JSON.stringify(json))
        }
        return json.models
            .filter((m: any) => m.name.includes('gemini'))
            .map((m: any) => m.name.split('/').pop())
    }
}

export const geminiModelConfigs = {
    'gemini-pro': {
        maxTokens: 32768,
        maxContextTokens: 32768,
    },
    'gemini-pro-vision': {
        maxTokens: 32768,
        maxContextTokens: 32768,
    },
}

export type Model = keyof typeof geminiModelConfigs
export const models = Object.keys(geminiModelConfigs) as Model[]

async function populateGeminiMessage(rawMessages: Message[]) {
    return rawMessages.map(m => ({
        role: m.role === 'assistant' ? 'model' : m.role,
        parts: [{
            text: m.content
        }]
    }))
} 