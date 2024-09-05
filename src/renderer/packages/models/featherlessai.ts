import { Message } from 'src/shared/types'
import { ApiError, ChatboxAIAPIError } from './errors'
import Base, { onResultChange } from './base'

interface Options {
    featherlessKey: string
    apiHost: string
    apiPath?: string
    model: Model | 'custom-model'
    openaiCustomModel?: string
    temperature: number
    topP: number
}

export default class FeatherlessAI extends Base {
    public name = 'FeatherlessAI'

    public options: Options
    constructor(options: Options) {
        super()
        this.options = options
        if (this.options.apiHost && this.options.apiHost.trim().length === 0) {
            this.options.apiHost = 'https://api.featerless.ai'
        }
        if (this.options.apiHost && this.options.apiHost.startsWith('https://openrouter.ai/api/v1')) {
            this.options.apiHost = 'https://openrouter.ai/api'
        }
        if (this.options.apiPath && !this.options.apiPath.startsWith('/')) {
            this.options.apiPath = '/' + this.options.apiPath
        }
    }

    async callChatCompletion(
        rawMessages: Message[],
        signal?: AbortSignal,
        onResultChange?: onResultChange
    ): Promise<string> {
        try {
            return await this._callChatCompletion(rawMessages, signal, onResultChange)
        } catch (e) {
            if (
                e instanceof ApiError &&
                e.message.includes('Invalid content type. image_url is only supported by certain models.')
            ) {
                throw ChatboxAIAPIError.fromCodeName('model_not_support_image', 'model_not_support_image')
            }
            throw e
        }
    }

    async _callChatCompletion(
        rawMessages: Message[],
        signal?: AbortSignal,
        onResultChange?: onResultChange
    ): Promise<string> {
        let messages = await populateOpenAIMessage(rawMessages, this.options.model)

        const model = this.options.model === 'custom-model' ? this.options.openaiCustomModel || '' : this.options.model
        messages = injectModelSystemPrompt(model, messages)

        const apiPath = this.options.apiPath || '/v1/chat/completions'
        const response = await this.post(
            `${this.options.apiHost}${apiPath}`,
            this.getHeaders(),
            {
                messages,
                model,
                max_tokens:
                    this.options.model === 'custom-model'
                        ? undefined
                        : openaiModelConfigs[this.options.model].maxTokens,
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
            Authorization: `Bearer ${this.options.featherlessKey}`,
            'Content-Type': 'application/json',
            'X-Title': 'chatbox',
        }
        if (this.options.apiHost.includes('openrouter.ai')) {
            headers['HTTP-Referer'] = 'https://localhost:3000/'
        }
        return headers
    }
}
//todo: implement the following functions
// Ref: https://platform.openai.com/docs/models/gpt-4
export const openaiModelConfigs = {
    'anthracite-org/magnum-v2-72b': {
        maxTokens: 4096,
        maxContextTokens: 4096,
    },
}
export type Model = keyof typeof openaiModelConfigs
export const models = Array.from(Object.keys(openaiModelConfigs)).sort() as Model[]

export async function populateOpenAIMessage(
    rawMessages: Message[],
    model: Model | 'custom-model'
): Promise<OpenAIMessage[]> {
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
