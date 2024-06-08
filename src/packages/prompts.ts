import { Message } from '../stores/types'

export function nameConversation(msgs: Message[]): Message[] {
    const format = (msgs: string[]) => msgs.map((msg) => msg).join('\n\n---------\n\n')
    return [
        {
            id: '1',
            role: 'system',
            content: `Name the conversation based on the chat records.
Provide a descriptive title that clearly and uniquely summarizes the main topic of the conversation, such as "2024 Sales Conf Speech Prep", "Best Sushi Restaurants in Paris", "Groundskeeper Resume Revision".
Keep it around 30 characters, in same language as conversation.
You only need to answer with the name.
The following is the conversation:

\`\`\`
${format(msgs.map((msg) => msg.content))}
\`\`\`

Provide a descriptive title that clearly and uniquely summarizes the main topic of the conversation, such as "2024 Sales Conf Speech Prep", "Best Sushi Restaurants in Paris", "Groundskeeper Resume Revision".
Keep it around 30 characters, in same language as conversation.
You only need to answer with the name.
The conversation is named:`,
        },
    ]
}
