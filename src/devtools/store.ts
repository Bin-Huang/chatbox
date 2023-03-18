import { useState, useEffect } from 'react'
import { Settings, createSession, Session, Message } from './types'
import * as defaults from './defaults'
import * as openai from './openai-node'
import { v4 as uuidv4 } from 'uuid';
import { ThemeMode } from './theme';

// ipc

export const writeStore = (key: string, value: any) => {
    return (window as any).api.invoke('setStoreValue', key, value)
}
export const readStore = (key: string) => {
    return (window as any).api.invoke('getStoreValue', key)
}
export const getVersion = () => {
    return (window as any).api.invoke('getVersion')
}
export const openLink = (link: string) => {
    return (window as any).api.invoke('openLink', link)
}

export const shouldUseDarkColors = (): Promise<boolean> => {
    return api.invoke('shouldUseDarkColors');
};

// setting store

export function getDefaultSettings(): Settings {
    return {
        openaiKey: '',
        apiHost: 'https://api.openai.com',
        model: "gpt-3.5-turbo",
        maxContextSize: "inf",
        maxTokens: "2048",
        showWordCount: false,
        showTokenCount: false,
        showModelName: false,
        theme: ThemeMode.System,
    }
}

export async function readSettings(): Promise<Settings> {
    const setting = await readStore('settings')
    if (!setting) {
        return getDefaultSettings()
    }
    // 兼容早期版本
    if (!setting.apiHost) {
        setting.apiHost = getDefaultSettings().apiHost
    }
    if (!setting.model) {
        setting.model = getDefaultSettings().model
    }
    if (!setting.maxTokens) {
        setting.maxTokens = getDefaultSettings().maxTokens
    }
    if (!setting.maxContextSize) {
        setting.maxContextSize = getDefaultSettings().maxContextSize
    }
    if (setting.showWordCount === undefined) {
        setting.showWordCount = getDefaultSettings().showWordCount
    }
    if (setting.showTokenCount === undefined) {
        setting.showTokenCount = getDefaultSettings().showTokenCount
    }
    if (setting.showModelName === undefined) {
        setting.showModelName = getDefaultSettings().showModelName
    }
    if (setting.theme === undefined) {
        setting.theme = getDefaultSettings().theme;
    }
    return setting
}

export async function writeSettings(settings: Settings) {
    if (!settings.apiHost) {
        settings.apiHost = getDefaultSettings().apiHost
    }
    console.log('writeSettings.apiHost', settings.apiHost)
    openai.setHost(settings.apiHost)
    return writeStore('settings', settings)
}

// session store

export async function readSessions(settings: Settings): Promise<Session[]> {
    let sessions = await readStore('chat-sessions')
    if (!sessions) {
        return defaults.sessions
    }
    if (sessions.length === 0) {
        return [createSession(settings.model)]
    }
    return sessions
}

export async function writeSessions(sessions: Session[]) {
    return writeStore('chat-sessions', sessions)
}

// react hook

export default function useStore() {
    const [version, _setVersion] = useState('unknown')
    useEffect(() => {
        getVersion().then((version: any) => {
            _setVersion(version)
        })
    }, [])

    const [settings, _setSettings] = useState<Settings>(getDefaultSettings())
    const [needSetting, setNeedSetting] = useState(false)
    useEffect(() => {
        readSettings().then((settings) => {
            _setSettings(settings)
            if (settings.openaiKey === '') {
                setNeedSetting(true)
            }
        })
    }, [])
    const setSettings = (settings: Settings) => {
        _setSettings(settings)
        writeSettings(settings)
    }

    const [chatSessions, _setChatSessions] = useState<Session[]>([createSession(settings.model)])
    const [currentSession, switchCurrentSession] = useState<Session>(chatSessions[0])
    useEffect(() => {
        readSessions(settings).then((sessions: Session[]) => {
            _setChatSessions(sessions)
            switchCurrentSession(sessions[0])
        })
    }, [])
    const setSessions = (sessions: Session[]) => {
        _setChatSessions(sessions)
        writeSessions(sessions)
    }

    const deleteChatSession = (target: Session) => {
        const sessions = chatSessions.filter((s) => s.id !== target.id)
        if (sessions.length === 0) {
            sessions.push(createSession(settings.model))
        }
        if (target.id === currentSession.id) {
            switchCurrentSession(sessions[0])
        }
        setSessions(sessions)
    }
    const updateChatSession = (session: Session) => {
        const sessions = chatSessions.map((s) => {
            if (s.id === session.id) {
                return session
            }
            return s
        })
        setSessions(sessions)
        if (session.id === currentSession.id) {
            switchCurrentSession(session)
        }
    }
    const createChatSession = (session: Session, ix?: number) => {
        const sessions = [...chatSessions, session]
        setSessions(sessions)
        switchCurrentSession(session)
    }
    const createEmptyChatSession = () => {
        createChatSession(createSession(settings.model))
    }

    const setMessages = (session: Session, messages: Message[]) => {
        updateChatSession({
            ...session,
            messages,
        })
    }

    const [toasts, _setToasts] = useState<{id: string, content: string}[]>([])
    const addToast = (content: string) => {
        const id = uuidv4()
        _setToasts([...toasts, {id, content}])
    }
    const removeToast = (id: string) => {
        _setToasts(toasts.filter((t) => t.id !== id))
    }

    return {
        version,

        settings,
        setSettings,
        needSetting,

        chatSessions,
        createChatSession,
        updateChatSession,
        deleteChatSession,
        createEmptyChatSession,

        currentSession,
        switchCurrentSession,

        toasts,
        addToast,
        removeToast,
    }
}