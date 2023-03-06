import {ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum} from 'openai'
import { v4 as uuidv4 } from 'uuid';

export type Message = ChatCompletionRequestMessage & {
    id: string
}

export interface Session{
    id: string
    name: string
    messages: Message[]
}

export function createMessage(role: ChatCompletionRequestMessageRoleEnum = ChatCompletionRequestMessageRoleEnum.User, content: string = ''): Message {
    return {
        id: uuidv4(),
        content: content,
        role: role,
    }
}

export function createSession(name: string = "Untitled"): Session {
    return {
        id: uuidv4(),
        name: name,
        messages: [],
    }
}

export interface Settings {
    openaiKey?: string
}
