import { IMessage } from '../shared/types'

export function nameConversation(msgs: IMessage[], language: string): IMessage[] {
    const format = (msgs: string[]) => msgs.map((msg) => msg).join('\n\n---------\n\n')
    return [
        {
            id: '1',
            role: 'user',
            content: `Based on the chat history, give this conversation a name.
Keep it short - 10 characters max, no quotes.
Use ${language}.
Just provide the name, nothing else.

Here's the conversation:

\`\`\`
${
    format(msgs.slice(0, 5).map((msg) => msg.content.slice(0, 100))) // save tokens
}
\`\`\`

Name this conversation in 10 characters or less.
Use ${language}.
Only give the name, nothing else.

The name is:`,
        },
    ]
}
