import { Configuration, OpenAIApi, ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum } from './openai-node'
import { Message } from './types'

export async function replay(apiKey: string, host: string, msgs: Message[], onText?: (text: string) => void, onError?: (error: Error) => void) {
    if (msgs.length > 5) {
        msgs = msgs.slice(msgs.length - 5)
    }
    try {
        const messages: ChatCompletionRequestMessage[] = msgs.map(msg => ({ role: msg.role, content: msg.content }))
        const response = await fetch(`${host}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages,
                model: "gpt-3.5-turbo",
                stream: true
            })
        });
        if (!response.body) {
            throw new Error('No response body')
        }
        const reader = response.body.getReader();
        const d = new TextDecoder('utf8');
        let fullText = ''
        while (true) {
            const { value, done } = await reader.read();
            if (done) {
                break;
            } else {
                const raw = d.decode(value)
                let items = raw.split('\n\n')
                items = items.map(item => item.replace(/^data: /, '')).filter(item => item.length > 0).filter(item => item !== '[DONE]')
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
                            onText(fullText)
                        }
                    }
                }
            }
        }
        return fullText
    } catch (error) {
        if (onError) {
            onError(error)
        }
        throw error
    }
}
