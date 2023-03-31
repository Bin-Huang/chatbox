import { ChatCompletionRequestMessage } from './utils/openai-node/api';
import { Message } from './types';
import * as wordCount from './utils';

export interface OnTextCallbackResult {
    // response content
    text: string;
    // cancel for fetch
    cancel: () => void;
}

export async function replay(
    apiKey: string,
    host: string,
    maxContextSize: string,
    maxTokens: string,
    modelName: string,
    msgs: Message[],
    onText?: (option: OnTextCallbackResult) => void,
    onError?: (error: Error) => void,
) {
    if (msgs.length === 0) {
        throw new Error('No messages to replay')
    }
    const head = msgs[0].role === 'system' ? msgs[0] : undefined
    if (head) {
        msgs = msgs.slice(1)
    }

    const maxTokensNumber = Number(maxTokens)
    const maxLen = Number(maxContextSize)
    let totalLen = head ? wordCount.estimateTokens(head.content) : 0

    let prompts: Message[] = []
    for (let i = msgs.length - 1; i >= 0; i--) {
        const msg = msgs[i]
        const msgTokenSize: number = wordCount.estimateTokens(msg.content) + 100 // 100 作为预估的误差补偿
        if (msgTokenSize + totalLen > maxLen) {
            break
        }
        prompts = [msg, ...prompts]
        totalLen += msgTokenSize
    }
    if (head) {
        prompts = [head, ...prompts]
    }

    // fetch has been canceled
    let hasCancel = false;

    // abort signal for fetch
    const controller = new AbortController();
    const cancel = (): void => {
        hasCancel = true;
        controller.abort();
    };

    try {

        const messages: ChatCompletionRequestMessage[] = prompts.map(msg => ({ role: msg.role, content: msg.content }))
        const response = await fetch(`${host}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages,
                model: modelName,
                max_tokens: maxTokensNumber,
                stream: true
            }),
            signal: controller.signal,
        });

        if (!response.body) {
            throw new Error('No response body')
        }
        const reader = response.body.getReader();
        const d = new TextDecoder('utf8');
        let fullText = ''
        let partialData = '';
        while (true) {
            const { value, done } = await reader.read();
            if (done) {
                break;
            } else {
                const raw = d.decode(value)
                if (partialData == '') {
                    partialData = raw
                } else {
                    partialData += raw;
                }
                if (response.status !== 200) {
                    throw new Error(`Error from OpenAI: ${response.status} ${response.statusText} ${partialData}`)
                }
                const delimiterIndex = partialData.indexOf('\n\n');
                if (delimiterIndex === -1) {
                    continue;
                }
                let items = partialData.split('\n\n')
                partialData = ''
                items = items.map(item => item.replace(/^\s*data: /, '')).filter(item => item.length > 0).filter(item => item !== '[DONE]')
                const datas = items.map(item => {
                    let json: any
                    try {
                        json = JSON.parse(item)
                    } catch (error) {
                        throw new Error(`Error parsing item: ${item}.\nError Details: ${error}`)
                    }
                    if (json.error) {
                        throw new Error(`Error from OpenAI: ${JSON.stringify(json)}`)
                    }
                    return json
                })
                for (const data of datas) {
                    const text = data.choices[0]?.delta?.content
                    if (text !== undefined) {
                        fullText += text
                        if (onText) {
                            onText({
                                text: fullText,
                                cancel,
                            });
                        }
                    }
                }
            }
        }
        return fullText
    } catch (error) {
        // if a cancellation is performed
        // do not throw an exception
        // otherwise the content will be overwritten.
        if (hasCancel) {
            return;
        }

        if (onError) {
            onError(error as any)
        }
        throw error
    }
}
