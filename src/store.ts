import { useState, useEffect } from 'react'
import { Settings, createSession, Session, createMessage, Message, messageHasTag, Plugin } from './types'
import * as defaults from './defaults'
import { v4 as uuidv4 } from 'uuid';
import { ThemeMode } from './theme';
import * as api from './api'
import { useTranslation } from "react-i18next";

// setting store

export function getDefaultSettings(): Settings {
    return {
        openaiKey: '',
        apiHost: 'https://api.openai.com',
        model: "gpt-3.5-turbo",
        maxContextSize: "4000",
        maxTokens: "2048",
        showWordCount: false,
        showTokenCount: false,
        showModelName: false,
        theme: ThemeMode.System,
        language: 'en',
    }
}

export const defaultPlugins: Plugin[] = [
    {
        "id": "chatgpt-retrieval-plugin",
        "schema_version": "v1",
        "name_for_model": "retrieval",
        "name_for_human": "Retrieval Plugin",
        "description_for_model": "Plugin for searching through the user's documents (such as files, emails, and more) to find answers to questions and retrieve relevant information. Use it whenever a user asks something that might be found in their personal information.",
        "description_for_human": "Search through your documents.",
        "auth": {
            "type": "user_http",
            "authorization_type": "Bearer",
            "authorization_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6Ik93ZW4gV3UiLCJpYXQiOjE1MTYyMzkwMjJ9.6Wai0ClBOxd40SUG0kaK7gn41N6ZVt4VM54Buzc5hUE",
        },
        "api": {
            "type": "openapi",
            "url": "http://127.0.0.1:8080",
            "has_user_authentication": false
        },
        "logo_url": "https://your-app-url.com/.well-known/logo.png",
        "contact_email": "hello@contact.com",
        "legal_info_url": "http://example.com/legal-info"
    }
]

export async function readSettings(): Promise<Settings> {
    const setting: Settings | undefined = await api.readStore('settings')
    if (!setting) {
        return getDefaultSettings()
    }
    // 兼容早期版本
    const settingWithDefaults = Object.assign({}, getDefaultSettings(), setting);

    return settingWithDefaults;
}

export async function writeSettings(settings: Settings) {
    if (!settings.apiHost) {
        settings.apiHost = getDefaultSettings().apiHost
    }
    console.log('writeSettings.apiHost', settings.apiHost)
    return api.writeStore('settings', settings)
}

// session store

export async function readSessions(settings: Settings): Promise<Session[]> {
    let sessions: Session[] | undefined = await api.readStore('chat-sessions')
    if (!sessions) {
        return defaults.sessions
    }
    if (sessions.length === 0) {
        return [createSession(settings.model)]
    }
    return sessions.map((s: any) => {
        // 兼容旧版本的数据
        if (!s.model) {
            s.model = getDefaultSettings().model
        }
        return s
    })
}

export async function writeSessions(sessions: Session[]) {
    return api.writeStore('chat-sessions', sessions)
}

// react hook

export default function useStore() {
    const { i18n } = useTranslation();

    const [version, _setVersion] = useState('unknown')
    useEffect(() => {
        api.getVersion().then((version: any) => {
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
            i18n.changeLanguage(settings.language).then();
        })
    }, [])
    const setSettings = (settings: Settings) => {
        _setSettings(settings)
        writeSettings(settings)
        i18n.changeLanguage(settings.language).then();
    }

    const [plugins, setPlugins] = useState<Plugin[]>(defaultPlugins)
    const installPlugin = (plugin: Plugin) => {
        setPlugins((plugins: Plugin[]) => {
            return plugins.concat(plugin)
        })
    }
    const uninstallPlugin = (pluginId: string) => {
        setPlugins((plugins: Plugin[]) => {
            return plugins.filter((plugin: Plugin) => { plugin.id !== pluginId })
        })
    }
    const getPluginByID = (plugins: Plugin[], pluginId: string): Plugin | undefined => {
        let result = plugins.filter(plugin => plugin.id === pluginId)
        if (result && result.length > 0) {
            return result[0]
        }

        return undefined
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

    const updateChatSessionPlugins = (session: Session) => {
        console.log("updatePluginSystemPromot:", session)

        if (session.pluginIDs && session.pluginIDs.length>0) {
            const messages = session.messages.filter(msg => msg.role === 'system' && !messageHasTag(msg, "plugin"))

            let pluginPromt = `为了完成你的任务，你可以使用插件提供的功能，这里有${session.pluginIDs.length}个插件: `

            for (let pluginId of session.pluginIDs) {
                let plugin = getPluginByID(plugins, pluginId)
                if (plugin) {
                    pluginPromt += `\n`
                    pluginPromt += `插件名称：${plugin.name_for_model} \n`
                    pluginPromt += `插件描述：${plugin.description_for_model} \n`
                }
            }

            messages.push(createMessage("system", pluginPromt), ...session.messages.filter(msg => msg.role !== 'system'))

            updateChatSession({ ...session, messages })
            return
        }

        updateChatSession(session)
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

    const [toasts, _setToasts] = useState<{ id: string, content: string }[]>([])
    const addToast = (content: string) => {
        const id = uuidv4()
        _setToasts([...toasts, { id, content }])
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
        updateChatSessionPlugins,
        deleteChatSession,
        createEmptyChatSession,

        plugins,
        installPlugin,
        uninstallPlugin,

        currentSession,
        switchCurrentSession,

        toasts,
        addToast,
        removeToast,
    }
}
