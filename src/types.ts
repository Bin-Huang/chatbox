import { v4 as uuidv4 } from 'uuid';
import { ThemeMode } from './theme';

export type Message = OpenAIMessage & {
    id: string;
    cancel?: () => void;
    generating?: boolean
    model?: string
}

export interface Session{
    id: string
    name: string
    messages: Message[]
    starred?: boolean
}

export function createMessage(role: OpenAIRoleEnumType = OpenAIRoleEnum.User, content: string = ''): Message {
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
        messages: [
            {
                id: uuidv4(),
                role: 'system',
                content: 'You are a helpful assistant. You can help me by answering my questions. You can also ask me questions.'
            }
        ],
    }
}

export interface Settings {
    openaiKey: string
    apiHost: string
    model: string
    maxContextSize: string
    maxTokens: string
    showWordCount?: boolean
    showTokenCount?: boolean
    showModelName?: boolean
    theme: ThemeMode
    language: string
    fontSize: number
}

export const OpenAIRoleEnum = {
    System: 'system',
    User: 'user',
    Assistant: 'assistant'
} as const;

export type OpenAIRoleEnumType = typeof OpenAIRoleEnum[keyof typeof OpenAIRoleEnum]

export interface OpenAIMessage {
    'role': OpenAIRoleEnumType
    'content': string;
    'name'?: string;
}

export interface Config{
    uuid: string
}

export interface SponsorAd {
    text: string
    url: string
}
