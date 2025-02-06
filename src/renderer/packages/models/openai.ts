import { Message } from 'src/shared/types'
import { ApiError, ChatboxAIAPIError } from './errors'
import Base, { onResultChange } from './base'

interface Options {
  openaiKey: string
  apiHost: string
  apiPath?: string
  model: Model | 'custom-model'
  openaiCustomModel?: string
  openaiReasoningEffort: string
  temperature: number
  topP: number
}

export interface AddFunctionType {
  name: string
  description: string
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

  getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.options.openaiKey}`,
      'Content-Type': 'application/json',
    }
    if (this.options.apiHost.includes('openrouter.ai')) {
      headers['HTTP-Referer'] = 'https://chatboxai.app'
      headers['X-Title'] = 'Chatbox AI'
    }
    return headers
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
        e.message.includes(
          'Invalid content type. image_url is only supported by certain models.'
        )
      ) {
        throw ChatboxAIAPIError.fromCodeName(
          'model_not_support_image',
          'model_not_support_image'
        )
      }
      throw e
    }
  }

  async _callChatCompletion(
    rawMessages: Message[],
    signal?: AbortSignal,
    onResultChange?: onResultChange
  ): Promise<string> {
    const model =
      this.options.model === 'custom-model'
        ? this.options.openaiCustomModel || ''
        : this.options.model

    rawMessages = injectModelSystemPrompt(model, rawMessages)

    const functionsEnabled = localStorage.getItem('functionsEnabled') === 'true'
    const storedFunctionsRaw = localStorage.getItem('functions') || '[]'
    const storedFunctions = functionsEnabled
      ? JSON.parse(storedFunctionsRaw)
      : []

    let tools = [];
    if (functionsEnabled && Array.isArray(storedFunctions) && storedFunctions.length > 0) {
      tools = storedFunctions.map(funcDef => ({
        type: "function",
        function: {
          name: funcDef.name,
          description: funcDef.description,
          parameters: JSON.parse(funcDef.description).function.parameters
        }
      })).filter(tool => 
        tool.function &&
        typeof tool.function.name === 'string' &&
        typeof tool.function.description === 'string' &&
        typeof tool.function.parameters === 'object'
      );
    }
        
    if (model.startsWith('o3')) {
      const messages = await populateReasoningMessage(rawMessages)
      const payload = {
        model,
        messages,
        reasoning_effort: this.options.openaiReasoningEffort,
        ...(tools.length > 0 ? { tools, tool_choice: 'auto' } : {})
      }
      return this.requestChatCompletionsNotStream(payload, signal, onResultChange)
    }

    if (model.startsWith('o1-mini') || model.startsWith('o1-preview')) {
      const messages = await populateReasoningMessage(rawMessages)
      return this.requestChatCompletionsNotStream(
        {
          model,
          messages,
        },
        signal,
        onResultChange
      )
    }

    if (model.startsWith('o')) {
      const messages = await populateReasoningMessage(rawMessages)
      return this.requestChatCompletionsNotStream(
        {
          model,
          messages,
          reasoning_effort: this.options.openaiReasoningEffort,
        },
        signal,
        onResultChange
      )
    }

    const messages = await populateGPTMessage(rawMessages)
    const payload = {
      messages,
      model,
      temperature: this.options.temperature,
      top_p: this.options.topP,
      ...(tools.length > 0 ? { tools, tool_choice: 'auto' } : {}),
      ...(this.options.model === 'gpt-4-vision-preview' ? { max_tokens: openaiModelConfigs['gpt-4-vision-preview'].maxTokens } : {}),
      ...(tools.length === 0 ? { stream: true } : {})
    }

    return tools.length > 0
      ? this.requestChatCompletionsNotStream(payload, signal, onResultChange)
      : this.requestChatCompletionsStream(payload, signal, onResultChange)
  }

  async requestChatCompletionsStream(
    requestBody: Record<string, any>,
    signal?: AbortSignal,
    onResultChange?: onResultChange
  ): Promise<string> {
    const apiPath = this.options.apiPath || '/v1/chat/completions'
    const response = await this.post(
      `${this.options.apiHost}${apiPath}`,
      this.getHeaders(),
      requestBody,
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

  async requestChatCompletionsNotStream(
    requestBody: Record<string, any>,
    signal?: AbortSignal,
    onResultChange?: onResultChange
  ): Promise<string> {

    console.log('Request payload:', JSON.stringify(requestBody, null, 2))
    const apiPath = this.options.apiPath || '/v1/chat/completions'
    const response = await this.post(
      `${this.options.apiHost}${apiPath}`,
      this.getHeaders(),
      requestBody,
      signal
    )
    const json = await response.json()
    if (json.error) {
      throw new ApiError(`Error from OpenAI: ${JSON.stringify(json)}`)
    }
    
    const message = json.choices[0].message;
    let result = '';
    
    if (message.tool_calls) {
      const toolCall = message.tool_calls[0];
      const functionCall = {
        name: toolCall.function.name,
        arguments: JSON.parse(toolCall.function.arguments),
      }
      result = `Function Call:\n${JSON.stringify(functionCall, null, 2)}`;
    } else if (message.content) {
      result = message.content;
    } else {
      throw new Error('Unexpected response format from OpenAI');
    }
    
    if (onResultChange) {
      onResultChange(result);
    }
    return result;
  }
  
  async callChatCompletionWithFunctions(
    rawMessages: Message[],
    functions: AddFunctionType[],
    signal?: AbortSignal,
    onResultChange?: onResultChange
  ): Promise<string> {
    if (!Array.isArray(functions) || functions.length === 0) {
      throw new Error('Functions must be provided as a non-empty array.')
    }
  
    const model =
      this.options.model === 'custom-model'
        ? this.options.openaiCustomModel || ''
        : this.options.model
    const messages = await populateGPTMessage(injectModelSystemPrompt(model, rawMessages))
  
    const tools = functions.map(f => ({
      type: "function",
      function: {
        name: f.name,
        description: f.description,
        parameters: JSON.parse(f.description).function.parameters
      }
    }));
  
    const payload: Record<string, any> = {
      model,
      messages,
      tools,
      tool_choice: "auto",
    }
  
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('Function call payload:', JSON.stringify(payload, null, 2))
      }
      return await this.requestChatCompletionsNotStream(payload, signal, onResultChange)
    } catch (error) {
      throw new Error(`Failed to process function call: ${error.message}`)
    }
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
    maxContextTokens: 4096,
  },
  'gpt-3.5-turbo-16k-0613': {
    maxTokens: 4096,
    maxContextTokens: 16385,
  },

  'gpt-4o-mini': {
    maxTokens: 4096,
    maxContextTokens: 128000,
  },
  'gpt-4o-mini-2024-07-18': {
    maxTokens: 4096,
    maxContextTokens: 128000,
  },

  'gpt-4o': {
    maxTokens: 4096,
    maxContextTokens: 128000,
  },
  'gpt-4o-2024-05-13': {
    maxTokens: 4096,
    maxContextTokens: 128000,
  },
  'gpt-4o-2024-08-06': {
    maxTokens: 16384,
    maxContextTokens: 128000,
  },
  'gpt-4o-2024-11-20': {
    maxTokens: 16384,
    maxContextTokens: 128000,
  },
  'chatgpt-4o-latest': {
    maxTokens: 16384,
    maxContextTokens: 128000,
  },

  'o1': {
    maxTokens: 100000,
    maxContextTokens: 200000,
  },
  'o1-2024-12-17': {
    maxTokens: 100000,
    maxContextTokens: 200000,
  },
  'o1-preview': {
    maxTokens: 32768,
    maxContextTokens: 128000,
  },
  'o1-preview-2024-09-12': {
    maxTokens: 32768,
    maxContextTokens: 128000,
  },
  'o1-mini': {
    maxTokens: 65536,
    maxContextTokens: 128000,
  },
  'o1-mini-2024-09-12': {
    maxTokens: 65536,
    maxContextTokens: 128000,
  },

  'o3-mini': {
    maxTokens: 100000,
    maxContextTokens: 200000,
  },
  'o3-mini-2025-01-31': {
    maxTokens: 100000,
    maxContextTokens: 200000,
  },

  'gpt-4': {
    maxTokens: 4096,
    maxContextTokens: 8192,
  },
  'gpt-4-turbo': {
    maxTokens: 4096,
    maxContextTokens: 128000,
  },
  'gpt-4-turbo-2024-04-09': {
    maxTokens: 4096,
    maxContextTokens: 128000,
  },
  'gpt-4-0613': {
    maxTokens: 4096,
    maxContextTokens: 8192,
  },
  'gpt-4-32k': {
    maxTokens: 4096,
    maxContextTokens: 32768,
  },
  'gpt-4-32k-0613': {
    maxTokens: 4096,
    maxContextTokens: 32768,
  },
  'gpt-4-1106-preview': {
    maxTokens: 4096,
    maxContextTokens: 128000,
  },
  'gpt-4-0125-preview': {
    maxTokens: 4096,
    maxContextTokens: 128000,
  },
  'gpt-4-turbo-preview': {
    maxTokens: 4096,
    maxContextTokens: 128000,
  },
  'gpt-4-vision-preview': {
    maxTokens: 4096,
    maxContextTokens: 128000,
  },

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

export async function populateGPTMessage(
  rawMessages: Message[]
): Promise<OpenAIMessage[]> {
  const messages: OpenAIMessage[] = rawMessages
    .filter((m) => m.content != null)
    .map((m) => ({
      role: m.role,
      content: m.content || '',
    }))
  return messages
}

export async function populateReasoningMessage(
  rawMessages: Message[]
): Promise<OpenAIMessage[]> {
  const messages: OpenAIMessage[] = rawMessages
    .filter((m) => m.content != null)
    .map((m) => ({
      role: m.role === 'system' ? 'user' : m.role,
      content: m.content || '',
    }))
  return messages
}

export function injectModelSystemPrompt(model: string, messages: Message[]) {
  const metadataPrompt = `
Current model: ${model}
Current date: ${new Date().toISOString()}

`
  let hasInjected = false
  return messages.map((m) => {
    if (m.role === 'system' && !hasInjected) {
      m = { ...m, content: metadataPrompt + m.content }
      hasInjected = true
    }
    return m
  })
}

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  name?: string
}
