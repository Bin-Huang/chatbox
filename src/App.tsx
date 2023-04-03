import React, { useRef } from 'react';
import Block from './Block'
import * as client from './client'
import SessionItem from './SessionItem'
import {
    Toolbar, Box, Badge, Snackbar,
    List, ListSubheader, ListItemText, MenuList,
    IconButton, Button, Stack, Grid, MenuItem, ListItemIcon, Typography, Divider,
    TextField,
} from '@mui/material';
import { Session, createSession, Message, createMessage } from './types'
import useStore from './store'
import SettingWindow from './SettingWindow'
import ChatConfigWindow from './ChatConfigWindow'
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import * as prompts from './prompts';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import CleanWidnow from './CleanWindow';
import * as api from './api';
import { ThemeSwitcherProvider } from './theme/ThemeSwitcher';
import { useTranslation } from "react-i18next";
import icon from './icon.png'

const { useEffect, useState } = React

function Main() {
    const { t } = useTranslation()
    const store = useStore()

    // 是否展示设置窗口
    const [openSettingWindow, setOpenSettingWindow] = React.useState(false);
    useEffect(() => {
        if (store.needSetting) {
            setOpenSettingWindow(true)
        }
    }, [store.needSetting])

    // 是否展示应用更新提示
    const [needCheckUpdate, setNeedCheckUpdate] = useState(true)

    const messageListRef = useRef<HTMLDivElement>(null)
    const messageScrollRef = useRef<{ msgId: string, smooth?: boolean } | null>(null)
    useEffect(() => {
        if (!messageScrollRef.current) {
            return
        }
        if (!messageListRef.current) {
            return
        }
        const container = messageListRef.current
        const element = document.getElementById(messageScrollRef.current.msgId)
        if (!container || !element) {
            return
        }
        const elementRect = element.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const isInsideLeft = elementRect.left >= containerRect.left;
        const isInsideRight = elementRect.right <= containerRect.right;
        const isInsideTop = elementRect.top >= containerRect.top;
        const isInsideBottom = elementRect.bottom <= containerRect.bottom;
        if (isInsideLeft && isInsideRight && isInsideTop && isInsideBottom) {
            return
        }
        // 平滑滚动
        element.scrollIntoView({
            behavior: messageScrollRef.current.smooth ? 'smooth' : 'auto',
            block: 'end',
            inline: 'nearest',
        })
    })
    // stop auto-scroll when user scroll
    useEffect(() => {
        if (!messageListRef.current) {
            return
        }
        messageListRef.current.addEventListener('wheel', function (e: any) {
            messageScrollRef.current = null
        });
    }, [])

    // 切换到当前会话，自动滚动到最后一条消息
    useEffect(() => {
        if (store.currentSession.messages.length === 0) {
            return
        }
        const last = store.currentSession.messages[store.currentSession.messages.length - 1]
        messageScrollRef.current = { msgId: last.id, smooth: false }
    }, [store.currentSession])

    // 会话名称自动生成
    useEffect(() => {
        if (
            store.currentSession.name === 'Untitled'
            && store.currentSession.messages.findIndex(msg => msg.role === 'assistant') !== -1
        ) {
            generateName(store.currentSession)
        }
    }, [store.currentSession.messages])

    const codeBlockCopyEvent = useRef((e: Event) => {
        const target: HTMLElement = e.target as HTMLElement;

        const isCopyActionClassName = target.className === 'copy-action';
        const isCodeBlockParent = target.parentElement?.className === 'code-block-wrapper';

        // check is copy action button
        if (!(isCopyActionClassName && isCodeBlockParent)) {
            return;
        }

        // got codes
        const content = target?.parentNode?.querySelector('code')?.innerText ?? '';

        // do copy
        // * thats lines copy from copy block content action
        navigator.clipboard.writeText(content);
        store.addToast(t('copied to clipboard'));
    });

    // bind code block copy event on mounted
    useEffect(() => {
        document.addEventListener('click', codeBlockCopyEvent.current);

        return () => {
            document.removeEventListener('click', codeBlockCopyEvent.current);
        };
    }, []);

    const [configureChatConfig, setConfigureChatConfig] = React.useState<Session | null>(null);

    const [sessionClean, setSessionClean] = React.useState<Session | null>(null);

    const generateName = async (session: Session) => {
        client.replay(
            store.settings.openaiKey,
            store.settings.apiHost,
            store.settings.maxContextSize,
            store.settings.maxTokens,
            session.model,
            prompts.nameConversation(session.messages.slice(0, 3)),
            ({ text: name }) => {
                name = name.replace(/['"“”]/g, '')
                session.name = name
                store.updateChatSession(session)
            },
            (err) => {
                console.log(err)
            }
        )
    }

    const generate = async (session: Session, promptMsgs: Message[], targetMsg: Message) => {
        messageScrollRef.current = { msgId: targetMsg.id, smooth: false }
        await client.replay(
            store.settings.openaiKey,
            store.settings.apiHost,
            store.settings.maxContextSize,
            store.settings.maxTokens,
            session.model,
            promptMsgs,
            ({ text, cancel }) => {
                for (let i = 0; i < session.messages.length; i++) {
                    if (session.messages[i].id === targetMsg.id) {
                        session.messages[i] = {
                            ...session.messages[i],
                            content: text,
                            cancel,
                        }

                        break;
                    }
                }
                store.updateChatSession(session)
            },
            (err) => {
                for (let i = 0; i < session.messages.length; i++) {
                    if (session.messages[i].id === targetMsg.id) {
                        session.messages[i] = {
                            ...session.messages[i],
                            content: t('api request failed:') + ' \n```\n' + err.message + '\n```',
                        }
                        break
                    }
                }
                store.updateChatSession(session)
            }
        )
        messageScrollRef.current = null
    }

    const [messageInput, setMessageInput] = useState('')
    useEffect(() => {
        document.getElementById('message-input')?.focus() // better way?
    }, [messageInput])

    const sessionListRef = useRef<HTMLDivElement>(null)
    const handleCreateNewSession = () => {
        store.createEmptyChatSession()
        if (sessionListRef.current) {
            sessionListRef.current.scrollTo(0, 0)
        }
    }

    return (
        <Box sx={{ height: '100vh' }}>
            <Grid container spacing={2} sx={{
                height: '100%',
            }}>
                <Grid item xs={3}
                    sx={{
                        height: '100%',
                    }}
                >
                    <Stack
                        sx={{
                            height: '100%',
                            padding: '20px 0',
                        }}
                        spacing={2}
                    >
                        <Toolbar variant="dense" sx={{
                            display: "flex",
                            alignItems: "flex-end",
                        }} >
                            <img src={icon} style={{
                                width: '35px',
                                height: '35px',
                                marginRight: '5px',
                            }} />
                            <Typography variant="h5" color="inherit" component="div">
                                Chatbox
                            </Typography>
                        </Toolbar>

                        <Divider />

                        <MenuList
                            sx={{
                                width: '100%',
                                // bgcolor: 'background.paper',
                                position: 'relative',
                                overflow: 'auto',
                                // height: '30vh',
                                height: '60vh',
                                '& ul': { padding: 0 },
                            }}
                            className="scroll"
                            subheader={
                                <ListSubheader component="div">
                                    {t('chat')}
                                </ListSubheader>
                            }
                            component="div"
                            ref={sessionListRef}
                            // dense
                        >
                            {
                                [...store.chatSessions].reverse().map((session, ix) => (
                                    <SessionItem key={session.id}
                                        selected={store.currentSession.id === session.id}
                                        session={session}
                                        switchMe={() => {
                                            store.switchCurrentSession(session)
                                            document.getElementById('message-input')?.focus() // better way?
                                        }}
                                        deleteMe={() => store.deleteChatSession(session)}
                                        copyMe={() => {
                                            const newSession = createSession(session.model, session.name + ' copied')
                                            newSession.messages = session.messages
                                            store.createChatSession(newSession, ix)
                                        }}
                                        editMe={() => setConfigureChatConfig(session)}
                                    />
                                ))
                            }
                        </MenuList>

                        <Divider />

                        <MenuItem onClick={handleCreateNewSession} >
                            <ListItemIcon>
                                <IconButton><AddIcon fontSize="small" /></IconButton>
                            </ListItemIcon>
                            <ListItemText>
                                {t('new chat')}
                            </ListItemText>
                            <Typography variant="body2" color="text.secondary">
                                {/* ⌘N */}
                            </Typography>
                        </MenuItem>
                        <MenuItem onClick={() => {
                            setOpenSettingWindow(true)
                        }}
                        >
                            <ListItemIcon>
                                <IconButton><SettingsIcon fontSize="small" /></IconButton>
                            </ListItemIcon>
                            <ListItemText>
                                {t('settings')}
                            </ListItemText>
                            <Typography variant="body2" color="text.secondary">
                                {/* ⌘N */}
                            </Typography>
                        </MenuItem>

                        <MenuItem onClick={() => {
                            setNeedCheckUpdate(false)
                            api.openLink('https://github.com/Bin-Huang/chatbox/releases')
                        }}>
                            <ListItemIcon>
                                <IconButton>
                                    <InfoOutlinedIcon fontSize="small" />
                                </IconButton>
                            </ListItemIcon>
                            <ListItemText>
                                <Badge color="primary" variant="dot" invisible={!needCheckUpdate} sx={{ paddingRight: '8px' }} >
                                    <Typography sx={{ opacity: 0.5 }}>
                                        {t('version')}: {store.version}
                                    </Typography>
                                </Badge>
                            </ListItemText>
                        </MenuItem>
                    </Stack>

                </Grid>
                <Grid item xs={9}
                    sx={{
                        height: '100%',
                    }}
                >
                    <Stack sx={{
                        height: '100%',
                        padding: '20px 0',
                    }} spacing={2}>
                        <Toolbar variant="dense">
                            <IconButton edge="start" color="inherit" aria-label="menu" sx={{ mr: 2 }}>
                                <ChatBubbleOutlineOutlinedIcon />
                            </IconButton>
                            <Typography variant="h6" color="inherit" component="div" noWrap sx={{ flexGrow: 1 }}>
                                {store.currentSession.name}
                            </Typography>
                            <IconButton edge="start" color="inherit" aria-label="menu" sx={{ mr: 2 }}
                                onClick={() => setSessionClean(store.currentSession)}
                            >
                                <CleaningServicesIcon />
                            </IconButton>
                        </Toolbar>
                        <Divider />
                        <List
                            className='scroll'
                            sx={{
                                width: '100%',
                                height: '80%',
                                bgcolor: 'background.paper',
                                overflow: 'auto',
                                '& ul': { padding: 0 },
                            }}
                            component="div"
                            ref={messageListRef}
                        >
                            {
                                store.currentSession.messages.map((msg, ix) => (
                                    <Block id={msg.id} key={msg.id} msg={msg}
                                        showWordCount={store.settings.showWordCount || false}
                                        showTokenCount={store.settings.showTokenCount || false}
                                        showModelName={store.settings.showModelName || false}
                                        modelName={store.currentSession.model}
                                        setMsg={(updated) => {
                                            store.currentSession.messages = store.currentSession.messages.map((m) => {
                                                if (m.id === updated.id) {
                                                    return updated
                                                }
                                                return m
                                            })
                                            store.updateChatSession(store.currentSession)
                                        }}
                                        delMsg={() => {
                                            store.currentSession.messages = store.currentSession.messages.filter((m) => m.id !== msg.id)
                                            store.updateChatSession(store.currentSession)
                                        }}
                                        refreshMsg={() => {
                                            if (msg.role === 'assistant') {
                                                const promptMsgs = store.currentSession.messages.slice(0, ix)
                                                generate(store.currentSession, promptMsgs, msg)
                                            } else {
                                                const promptsMsgs = store.currentSession.messages.slice(0, ix + 1)
                                                const newAssistantMsg = createMessage('assistant', '....')
                                                const newMessages = [...store.currentSession.messages]
                                                newMessages.splice(ix + 1, 0, newAssistantMsg)
                                                store.currentSession.messages = newMessages
                                                store.updateChatSession(store.currentSession)
                                                generate(store.currentSession, promptsMsgs, newAssistantMsg)
                                                messageScrollRef.current = { msgId: newAssistantMsg.id, smooth: true }
                                            }
                                        }}
                                        copyMsg={() => {
                                            navigator.clipboard.writeText(msg.content)
                                            store.addToast(t('copied to clipboard'))
                                        }}
                                        quoteMsg={() => {
                                            let input = msg.content.split('\n').map((line: any) => `> ${line}`).join('\n')
                                            input += '\n\n-------------------\n\n'
                                            setMessageInput(input)
                                        }}
                                    />
                                ))
                            }
                        </List>
                        <Box>
                            <MessageInput
                                messageInput={messageInput}
                                setMessageInput={setMessageInput}
                                onSubmit={async (newUserMsg: Message, needGenerating = true) => {
                                    if (needGenerating) {
                                        const promptsMsgs = [...store.currentSession.messages, newUserMsg]
                                        const newAssistantMsg = createMessage('assistant', '....')
                                        store.currentSession.messages = [...store.currentSession.messages, newUserMsg, newAssistantMsg]
                                        store.updateChatSession(store.currentSession)
                                        generate(store.currentSession, promptsMsgs, newAssistantMsg)
                                        messageScrollRef.current = { msgId: newAssistantMsg.id, smooth: true }
                                    } else {
                                        store.currentSession.messages = [...store.currentSession.messages, newUserMsg]
                                        store.updateChatSession(store.currentSession)
                                        messageScrollRef.current = { msgId: newUserMsg.id, smooth: true }
                                    }
                                }}
                            />
                        </Box>
                    </Stack>
                </Grid>

                <SettingWindow open={openSettingWindow}
                    settings={store.settings}
                    save={(settings) => {
                        store.setSettings(settings)
                        setOpenSettingWindow(false)
                    }}
                    close={() => setOpenSettingWindow(false)}
                />
                {
                    configureChatConfig !== null && (
                        <ChatConfigWindow open={configureChatConfig !== null}
                            session={configureChatConfig}
                            save={(session) => {
                                store.updateChatSession(session)
                                setConfigureChatConfig(null)
                            }}
                            close={() => setConfigureChatConfig(null)}
                        />
                    )
                }
                {
                    sessionClean !== null && (
                        <CleanWidnow open={sessionClean !== null}
                            session={sessionClean}
                            save={(session) => {
                                store.updateChatSession(session)
                                setSessionClean(null)
                            }}
                            close={() => setSessionClean(null)}
                        />
                    )
                }
                {
                    store.toasts.map((toast) => (
                        <Snackbar
                            key={toast.id}
                            open
                            onClose={() => store.removeToast(toast.id)}
                            message={toast.content}
                            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                        />
                    ))
                }
            </Grid>
        </Box >
    );
}

function MessageInput(props: {
    onSubmit: (newMsg: Message, needGenerating?: boolean) => void
    messageInput: string
    setMessageInput: (value: string) => void
}) {
    const { t } = useTranslation()
    const { messageInput, setMessageInput } = props
    const submit = (needGenerating = true) => {
        if (messageInput.length === 0) {
            return
        }
        props.onSubmit(createMessage('user', messageInput), needGenerating)
        setMessageInput('')
    }
    return (
        <form onSubmit={(e) => {
            e.preventDefault()
            submit()
        }}>
            <Stack direction="column" spacing={1} >
                <Grid container spacing={2}>
                    <Grid item xs>
                        <TextField
                            multiline
                            label="Prompt"
                            value={messageInput}
                            onChange={(event) => setMessageInput(event.target.value)}
                            fullWidth
                            maxRows={12}
                            autoFocus
                            id='message-input'
                            onKeyDown={(event) => {
                                if (event.keyCode === 13 && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
                                    event.preventDefault()
                                    submit()
                                    return
                                }
                                if (event.keyCode === 13 && event.ctrlKey) {
                                    event.preventDefault()
                                    submit(false)
                                    return
                                }
                            }}
                        />
                    </Grid>
                    <Grid item xs="auto">
                        <Button type='submit' variant="contained" size='large'
                            style={{ fontSize: '16px', padding: '10px 20px' }}>
                            {t('send')}
                        </Button>
                    </Grid>
                </Grid>
                <Typography variant='caption' style={{ opacity: 0.3 }}>{t('[Enter] send, [Shift+Enter] line break, [Ctrl+Enter] send without generating')}</Typography>
            </Stack>
        </form>
    )
}

export default function App() {
    return (
        <ThemeSwitcherProvider>
            <Main />
        </ThemeSwitcherProvider>
    )
}
