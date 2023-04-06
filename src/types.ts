import { v4 as uuidv4 } from 'uuid';
import { ThemeMode } from './theme';

export type Message = OpenAIMessage & {
    id: string;
    cancel?: () => void;
}

export interface Session{
    id: string
    name: string
    messages: Message[]
    model: string
}

export function createMessage(role: OpenAIRoleEnumType = OpenAIRoleEnum.User, content: string = ''): Message {
    return {
        id: uuidv4(),
        content: content,
        role: role,
    }
}

export function createSession(modelName: string, name: string = "Untitled"): Session {
    return {
        id: uuidv4(),
        name: name,
        messages: [],
        model: modelName,
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
