import { Message } from 'src/shared/types'
import { ApiError } from './errors'
import Base, { onResultChange } from './base'

interface Options {
    featherlessKey: string
    apiHost: string
    apiPath?: string
    featherlessModel: Model | 'custom-model'
    featherlessCustomModel?: string
    temperature: number
    topP: number
}

export default class FeatherlessAI extends Base {
    public name = 'FeatherlessAI'
    public options: Options

    constructor(options: Options) {
        super()
        this.options = options
        this.options.apiHost = 'https://api.featherless.ai' // Hardcoded API host

        // Validate the model before proceeding to ensure only FeatherlessAI models are used
        if (!this.isValidModel(this.options.featherlessModel)) {
            throw new Error(`Invalid model: ${this.options.featherlessModel}. Only FeatherlessAI models are supported.`);
        }
    }

    // Ensure the model is from FeatherlessAI
    isValidModel(model: string): boolean {
        return model in featherlessModelConfigs || model === 'custom-model';
    }

    async callChatCompletion(
        rawMessages: Message[],
        signal?: AbortSignal,
        onResultChange?: onResultChange
    ): Promise<string> {
        let messages = await populateFeatherlessMessage(rawMessages, this.options.featherlessModel)

        const model = this.options.featherlessModel === 'custom-model' ? this.options.featherlessCustomModel || '' : this.options.featherlessModel
        messages = injectModelSystemPrompt(model, messages)

        const apiPath = this.options.apiPath || '/v1/chat/completions'
        const response = await this.post(
            `${this.options.apiHost}${apiPath}`,
            this.getHeaders(),
            {
                messages,
                model,
                max_tokens:
                    this.options.featherlessModel === 'custom-model'
                        ? undefined
                        : featherlessModelConfigs[this.options.featherlessModel].maxTokens,
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
                throw new ApiError(`Error from FeatherlessAI: ${JSON.stringify(data)}`)
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
        }
        return headers
    }
}

// Model configuration for FeatherlessAI
export const featherlessModelConfigs = {
    'anthracite-org/magnum-v2-72b': { maxTokens: 4096 },
    'TheDrummer/Rocinante-12B-v1.1': { maxTokens: 4096 },
    'MarinaraSpaghetti/NemoMix-Unleashed-12B': { maxTokens: 4096 },
    'alpindale/magnum-72b-v1': { maxTokens: 4096 },
    'alpindale/WizardLM-2-8x22B': { maxTokens: 4096 },
    'Sao10K/L3-70B-Euryale-v2.1': { maxTokens: 4096 },
    'Sao10K/L3-70B-Euryale-v2.2': { maxTokens: 4096 },
    'TheDrummer/Rocinante-12B-v1': { maxTokens: 4096 },
    'nothingiisreal/MN-12B-Starcannon-v3': { maxTokens: 4096 },
    'PygmalionAI/mythalion-13b': { maxTokens: 4096 },
}
export type Model = keyof typeof featherlessModelConfigs
export const models = Array.from(Object.keys(featherlessModelConfigs)).sort() as Model[]

export async function populateFeatherlessMessage(
    rawMessages: Message[],
    model: Model | 'custom-model'
): Promise<FeatherlessMessage[]> {
    return populateFeatherlessMessageText(rawMessages)
}

export async function populateFeatherlessMessageText(rawMessages: Message[]): Promise<FeatherlessMessage[]> {
    const messages: FeatherlessMessage[] = rawMessages.map((m) => ({
        role: m.role,
        content: m.content,
    }))
    return messages
}

export function injectModelSystemPrompt(model: string, messages: FeatherlessMessage[]) {
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

export interface FeatherlessMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
    name?: string
}
