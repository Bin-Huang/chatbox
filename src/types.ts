import { ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum } from './utils/openai-node/api'
import { v4 as uuidv4 } from 'uuid';
import { ThemeMode } from './theme';

export type Message = ChatCompletionRequestMessage & {
    id: string;
    cancel?: () => void;
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

export function createMessage(role: ChatCompletionRequestMessageRoleEnum = ChatCompletionRequestMessageRoleEnum.User, content: string = ''): Message {
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
