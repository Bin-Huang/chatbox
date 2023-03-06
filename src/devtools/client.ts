import { Configuration, OpenAIApi, ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum } from 'openai'
// import * as secret from './secret'
import { v4 as uuidv4 } from 'uuid';

const configuration = new Configuration({
    // TODO:
    // apiKey: secret.getSecret(),
});

export const openai = new OpenAIApi(configuration);

export async function replay(msgs: ChatCompletionRequestMessage[]) {
    msgs = msgs.map((msg) => {
        return {
            content: msg.content,
            role: msg.role,
        }
    })
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
}