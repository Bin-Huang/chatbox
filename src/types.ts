import { ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum } from './utils/openai-node/api'
import { v4 as uuidv4 } from 'uuid';
import { ThemeMode } from './theme';

export type Message = OpenAIMessage & {
    id: string;
    cancel?: () => void;
    tags?: string[];
}

export function messageHasTag(msg: Message, tag: string = "Untitled"): boolean {
    if (!msg.tags) {
        return false
    }

    return msg.tags.indexOf(tag) > -1
}

export interface Plugin {
    id: string;
    schema_version: string;
    name_for_model: string;
    name_for_human: string;
    description_for_model: string;
    description_for_human: string;
    auth: {
        type: string;
        authorization_type: string;
        authorization_token?: string;
    };
    api: {
        type: string;
        url: string;
        has_user_authentication: boolean;
    };
    logo_url: string;
    contact_email: string;
    legal_info_url: string;
}

export interface Session {
    id: string
    name: string
    messages: Message[]
    model: string
    pluginIDs?: string[]
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
