import { Configuration, OpenAIApi, ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum } from './openai-node'
import { v4 as uuidv4 } from 'uuid';

export async function replay(apiKey: string, msgs: ChatCompletionRequestMessage[]) {
    msgs = msgs.map((msg) => {
        return {
            content: msg.content,
            role: msg.role,
        }
    })
    const config = new Configuration({
        apiKey,
    });
    const openai = new OpenAIApi(config);
    try {
        const res = await openai.createChatCompletion({
            model: 'gpt-3.5-turbo',
            messages: msgs,
        })
        if (res.data.choices.length == 0) {
            throw new Error('No choices: ' + JSON.stringify(res.data))
        }
        const data = res.data.choices[0]
        return {
            id: uuidv4(),
            content: (data.message?.content || '').trim(),
            role: data.message?.role || ChatCompletionRequestMessageRoleEnum.Assistant,
        }
    } catch (error) {
        return {
            id: uuidv4(),
            content: 'API Request Failed: \n```\n' + error + '\n```',
            role: ChatCompletionRequestMessageRoleEnum.System
        }
    }
}