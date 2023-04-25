import React, { useEffect, useRef, useState } from 'react';
import Block from './Block'
import * as client from './client'
import SessionItem from './SessionItem'
import {
    Toolbar, Box, Badge, Snackbar, Chip,
    List, ListSubheader, ListItemText, MenuList,
    IconButton, Button, Stack, Grid, MenuItem, ListItemIcon, Typography, Divider,
    TextField,
} from '@mui/material';
import { Session, createSession, Message, createMessage, SponsorAd } from './types'
import useStore from './store'
import SettingWindow from './SettingWindow'
import ChatConfigWindow from './ChatConfigWindow'
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import * as prompts from './prompts';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import Save from '@mui/icons-material/Save'
import CleanWidnow from './CleanWindow';
import AboutWindow from './AboutWindow';
import * as api from './api';
import { ThemeSwitcherProvider } from './theme/ThemeSwitcher';
import { useTranslation } from "react-i18next";
import icon from './icon.png'
import { save } from '@tauri-apps/api/dialog';
import { writeTextFile } from '@tauri-apps/api/fs';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import * as remote from './remote'
import "./ga"
import "./styles/App.scss"

import type { DragEndEvent } from '@dnd-kit/core';
import {
    DndContext,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    closestCenter,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { SortableItem } from './SortableItem';

function Main() {
    const { t } = useTranslation()
    const store = useStore()
    const sensors = useSensors(
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        }),
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 10,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const sortedSessions = sortSessions(store.chatSessions)
    function handleDragEnd(event: DragEndEvent) {
        const {active, over} = event;
        if (!over) {
            return
        }
        if (active.id !== over.id) {
            const oldIndex = sortedSessions.findIndex(({id}) => id === active.id);
            const newIndex = sortedSessions.findIndex(({id}) => id === over.id);
            const newReversed = arrayMove(sortedSessions, oldIndex, newIndex);
            store.setSessions(sortSessions(newReversed))
        }
    }
    

    // 是否展示设置窗口
    const [openSettingWindow, setOpenSettingWindow] = React.useState(false);
    useEffect(() => {
        if (store.needSetting) {
            setOpenSettingWindow(true)
        }
    }, [store.needSetting])

    // 是否展示相关信息的窗口
    const [openAboutWindow, setOpenAboutWindow] = React.useState(false);

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
        if (!messageListRef.current) {
            return
        }
        messageListRef.current.scrollTop = messageListRef.current.scrollHeight
    }, [store.currentSession.id])

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
        const isCodeBlockParent = target.parentElement?.parentElement?.className === 'code-block-wrapper';

        // check is copy action button
        if (!(isCopyActionClassName && isCodeBlockParent)) {
            return;
        }

        // got codes
        const content = target?.parentNode?.parentNode?.querySelector('code')?.innerText ?? '';

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

    const editCurrentSession = () => {
        setConfigureChatConfig(store?.currentSession)
    };
    const generateName = async (session: Session) => {
        client.replay(
            store.settings.openaiKey,
            store.settings.apiHost,
            store.settings.maxContextSize,
            store.settings.maxTokens,
            store.settings.model,
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
    const saveSession = async (session:Session) => {
        const filePath = await save({
            filters: [{
              name: 'Export',
              extensions: ['md']
            }]
          });
        if(filePath){
            const content = session.messages
                .map(msg => `**${msg.role}**:\n${msg.content}`)
                .join('\n\n--------------------\n\n')
            await writeTextFile(filePath!!, content)
        }
    }

    const generate = async (session: Session, promptMsgs: Message[], targetMsg: Message) => {
        messageScrollRef.current = { msgId: targetMsg.id, smooth: false }
        await client.replay(
            store.settings.openaiKey,
            store.settings.apiHost,
            store.settings.maxContextSize,
            store.settings.maxTokens,
            store.settings.model,
            promptMsgs,
            ({ text, cancel }) => {
                for (let i = 0; i < session.messages.length; i++) {
                    if (session.messages[i].id === targetMsg.id) {
                        session.messages[i] = {
                            ...session.messages[i],
                            content: text,
                            cancel,
                            model: store.settings.model,
                            generating: true
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
                            model: store.settings.model,
                            generating: false
                        }
                        break
                    }
                }
                store.updateChatSession(session)
            }
        )
        for (let i = 0; i < session.messages.length; i++) {
            if (session.messages[i].id === targetMsg.id) {
                session.messages[i] = {
                    ...session.messages[i],
                    generating: false
                }
                break
            }
        }
        store.updateChatSession(session)

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

    const [showSponsorAD, setShowSponsorAD] = useState(true)
    const [sponsorAD, setSponsorAD] = useState<SponsorAd | null>(null)
    useEffect(() => {
        (async () => {
            const ad = await remote.getSponsorAd()
            setSponsorAD(ad)
        })()
    }, [store.currentSession.id])

    return (
        <Box className='App'>
            <Grid container sx={{
                flexWrap: 'nowrap',
                height: '100%',
            }}>
                <Grid item
                    sx={{
                        height: '100%',
                        maxWidth: '210px',
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

                        <MenuList
                            sx={{
                                width: '100%',
                                position: 'relative',
                                overflow: 'auto',
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
                        >
                            <DndContext
                                modifiers={[restrictToVerticalAxis]}
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext items={sortedSessions} strategy={verticalListSortingStrategy}>
                                {
                                    sortedSessions.map((session, ix) => (
                                        <SortableItem key={session.id} id={session.id}>
                                            <SessionItem key={session.id}
                                                selected={store.currentSession.id === session.id}
                                                session={session}
                                                switchMe={() => {
                                                    store.switchCurrentSession(session)
                                                    document.getElementById('message-input')?.focus() // better way?
                                                }}
                                                deleteMe={() => store.deleteChatSession(session)}
                                                copyMe={() => {
                                                    const newSession = createSession(session.name + ' copied')
                                                    newSession.messages = session.messages
                                                    store.createChatSession(newSession, ix)
                                                }}
                                                switchStarred={() => {
                                                    store.updateChatSession({
                                                        ...session,
                                                        starred: !session.starred
                                                    })
                                                }}
                                                editMe={() => setConfigureChatConfig(session)}
                                            />
                                        </SortableItem>
                                    ))
                                }
                                </SortableContext>
                            </DndContext>
                        </MenuList>

                        <Divider />

                        <MenuList>
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

                            <MenuItem onClick={() => setOpenAboutWindow(true)}>
                                <ListItemIcon>
                                    <IconButton>
                                        <InfoOutlinedIcon fontSize="small" />
                                    </IconButton>
                                </ListItemIcon>
                                <ListItemText>
                                    <Badge color="primary" variant="dot" invisible={!store.needCheckUpdate}
                                    sx={{ paddingRight: '8px' }} >
                                        <Typography sx={{ opacity: 0.5 }}>
                                            {t('About')} ({store.version})
                                        </Typography>
                                    </Badge>
                                </ListItemText>
                            </MenuItem>
                        </MenuList>
                    </Stack>
                </Grid>
                <Grid item xs
                    sx={{
                        height: '100%',
                    }}
                >
                    <Stack sx={{
                        height: '100%',
                        padding: '20px 0',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                    }} >
                        <Box>
                            <Toolbar>
                                <IconButton edge="start" color="inherit" aria-label="menu" sx={{ mr: 2 }}>
                                    <ChatBubbleOutlineOutlinedIcon />
                                </IconButton>
                                <Typography variant="h6" color="inherit" component="div" noWrap sx={{ flexGrow: 1 }}>
                                    <span onClick={() => { editCurrentSession() }} style={{ cursor: 'pointer' }}>
                                        {store.currentSession.name}
                                    </span>
                                </Typography>
                                {
                                    showSponsorAD && sponsorAD && (
                                        <Chip size='small'
                                            icon={<CampaignOutlinedIcon />}
                                            sx={{
                                                maxWidth: '400px',
                                                height: 'auto',
                                                '& .MuiChip-label': {
                                                    display: 'block',
                                                    whiteSpace: 'normal',
                                                },
                                                borderRadius: '8px',
                                                marginRight: '25px',
                                            }}
                                            deleteIcon={<CancelOutlinedIcon />}
                                                    onDelete={() => setShowSponsorAD(false)}
                                                    onClick={() => api.openLink(sponsorAD.url)}
                                                    label={sponsorAD.text}
                                        />
                                    )
                                }
                                <IconButton edge="start" color="inherit" aria-label="menu" sx={{ mr: 2 }}
                                    onClick={() => setSessionClean(store.currentSession)}
                                >
                                    <CleaningServicesIcon />
                                </IconButton>
                                <IconButton edge="start" color="inherit" aria-label="menu" sx={{}}
                                    onClick={() => saveSession(store.currentSession)}
                                >
                                    <Save />
                                </IconButton>
                            </Toolbar>
                        </Box>
                        <List
                            className='scroll'
                            sx={{
                                width: '100%',
                                bgcolor: 'background.paper',
                                overflow: 'auto',
                                '& ul': { padding: 0 },
                                flexGrow: 2,
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
                        <Box sx={{ padding: '20px 0' }}>
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
                        if (settings.fontSize !== store.settings.fontSize) {
                            store.addToast(t('font size changed, effective after next launch'))
                        }
                    }}
                    close={() => setOpenSettingWindow(false)}
                />
                <AboutWindow open={openAboutWindow} version={store.version} lang={store.settings.language}
                    close={() => setOpenAboutWindow(false)}
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
                                sessionClean.messages.forEach((msg) => {
                                    msg?.cancel?.();
                                });

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

function sortSessions(sessions: Session[]): Session[] {
    let reversed: Session[] = []
    let pinned: Session[] = []
    for (const sess of sessions) {
        if (sess.starred) {
            pinned.push(sess)
            continue
        }
        reversed.unshift(sess)
    }
    return pinned.concat(reversed)
}

export default function App() {
    return (
        <ThemeSwitcherProvider>
            <Main />
        </ThemeSwitcherProvider>
    )
}
