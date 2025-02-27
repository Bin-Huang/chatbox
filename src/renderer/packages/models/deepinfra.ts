import { Message } from 'src/shared/types'
import { ApiError } from './errors'
import Base, { onResultChange } from './base'
import { siliconflowModelConfigs } from '@/packages/models/siliconflow'

interface Options {
    deepInfraKey: string
    deepInfraHost: string
    deepInfraModel: string
    deepInfraCustomModel?: string
    temperature: number
    topP: number
}

export const deepInfraModelConfigs = {
    'deepseek-ai/DeepSeek-V3': { maxTokens: 5000},
    'deepseek-ai/DeepSeek-R1': { maxTokens: 5000},
    'meta-llama/Meta-Llama-3.1-405B-Instruct': { maxTokens: 5000},
}

export type Model = keyof typeof deepInfraModelConfigs
export const deepInfraModels = Array.from(Object.keys(deepInfraModelConfigs)).sort() as Model[]

export default class Deepinfra extends Base {
    public name = 'Deepinfra'

    public options: Options
    constructor(options: Options) {
        super()
        this.options = options
        this.options.deepInfraHost = this.options.deepInfraHost || 'https://api.deepinfra.com/v1/openai'
    }

    async callChatCompletion(
        rawMessages: Message[],
        signal?: AbortSignal,
        onResultChange?: onResultChange
    ): Promise<string> {
        const messages = rawMessages.map((m) => ({
            role: m.role,
            content: m.content,
        }))

        console.log(this.options.deepInfraCustomModel)

        const response = await this.post(
            `${this.options.deepInfraHost}/chat/completions`,
            this.getHeaders(),
            {
                messages,
                model: this.options.deepInfraModel === 'custom-model' ? this.options.deepInfraCustomModel : this.options.deepInfraModel,
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
                throw new ApiError(`Error from PPIO: ${JSON.stringify(data)}`)
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

    async listModels(): Promise<string[]> {
        const res = await this.get(`${this.options}/models`, this.getHeaders())
        const json = await res.json()
        if (!json['data']) {
            throw new ApiError(JSON.stringify(json))
        }
        return json['data'].map((m: any) => m['id'])
    }

    getHeaders() {
        const headers: Record<string, string> = {
            Authorization: `Bearer ${this.options.deepInfraKey}`,
            'Content-Type': 'application/json',
        }
        return headers
    }

    async get(url: string, headers: Record<string, string>) {
        const res = await fetch(url, {
            method: 'GET',
            headers,
        })
        if (!res.ok) {
            const err = await res.text().catch((e) => null)
            throw new ApiError(`Status Code ${res.status}, ${err}`)
        }
        return res
    }
}