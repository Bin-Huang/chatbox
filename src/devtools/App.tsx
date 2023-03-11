import React, { useRef } from 'react';
import './App.css';
import Block from './Block'
import * as client from './client'
import SessionItem from './SessionItem'
import {
    Toolbar, AppBar, Card, Box, Badge,
    List, ListSubheader, ListItem, ListItemButton, ListItemText, ListItemAvatar, MenuList,
    Avatar, IconButton, Button, Stack, Grid, MenuItem, ListItemIcon, Typography, Divider,
    Dialog, DialogContent, DialogActions, DialogTitle, DialogContentText, TextField,
} from '@mui/material';
import { Session, createSession, Message, createMessage } from './types'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ChatIcon from '@mui/icons-material/Chat';
import useStore, { openLink } from './store'
import SettingWindow from './SettingWindow'
import ChatConfigWindow from './ChatConfigWindow'
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

const { useEffect, useState } = React

function App() {
    const store = useStore()

    const [needCheckUpdate, setNeedCheckUpdate] = useState(true)

    const [needScroll, setNeedScroll] = useState(false)
    const listRef = useRef<any>(null)
    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight
        }
        setNeedScroll(false)
    }, [needScroll, store.currentSession])

    const [openSettingWindow, setOpenSettingWindow] = React.useState(false);

    useEffect(() => {
        if (store.needSetting) {
            setOpenSettingWindow(true)
        }
    }, [store.needSetting])

    const [configureChatConfig, setConfigureChatConfig] = React.useState<Session | null>(null);

    const generate = async (session: Session, promptMsgs: Message[], targetMsg: Message) => {
        const msg = createMessage('assistant', '...')
        await client.replay(
            store.settings.openaiKey,
            store.settings.apiHost,
            promptMsgs,
            (text) => {
                for (let i = 0; i < session.messages.length; i++) {
                    if (session.messages[i].id === targetMsg.id) {
                        session.messages[i] = {
                            ...session.messages[i],
                            content: text,
                        }
                        break
                    }
                }
                store.updateChatSession(session)
            },
            (err) => {
                for (let i = 0; i < session.messages.length; i++) {
                    if (session.messages[i].id === targetMsg.id) {
                        session.messages[i] = {
                            ...session.messages[i],
                            content: 'API Request Failed: \n```\n' + err.message + '\n```',
                        }
                        break
                    }
                }
                store.updateChatSession(session)
            }
        )
    }

    return (
        <Box sx={{
            height: '100%',
            width: '100%',
        }}>
            <Grid container spacing={2} sx={{
                background: "#FFFFFF",
                height: '100%',
            }}>
                <Grid item xs={3}
                    sx={{
                        height: '100%',
                    }}
                >
                    <Stack
                        sx={{
                            bgcolor: '#F7F7F7',
                            height: '100%',
                            padding: '20px 0',
                        }}
                        spacing={2}
                    >
                        <Toolbar variant="dense">
                            <IconButton edge="start" color="inherit" aria-label="menu" sx={{ mr: 2 }}>
                                <ChatIcon />
                            </IconButton>
                            <Typography variant="h5" color="inherit" component="div">
                                ChatBox
                            </Typography>
                        </Toolbar>

                        <Divider />

                        <MenuList
                            sx={{
                                width: '100%',
                                // bgcolor: 'background.paper',
                                bgcolor: '#F7F7F7',
                                position: 'relative',
                                overflow: 'auto',
                                // height: '30vh',
                                height: '60vh',
                                '& ul': { padding: 0 },
                            }}
                            subheader={
                                <ListSubheader component="div"
                                    sx={{
                                        bgcolor: '#F7F7F7',
                                    }}
                                >
                                    CHAT
                                </ListSubheader>
                            }
                        >
                            {
                                store.chatSessions.map((session, ix) => (
                                    <SessionItem selected={store.currentSession.id === session.id}
                                        session={session}
                                        switchMe={() => {
                                            store.switchCurrentSession(session)
                                            document.getElementById('message-input')?.focus() // better way?
                                        }}
                                        deleteMe={() => store.deleteChatSession(session)}
                                        copyMe={() => {
                                            const newSession = createSession(session.name + ' Copyed')
                                            newSession.messages = session.messages
                                            store.createChatSession(newSession, ix)
                                        }}
                                        editMe={() => setConfigureChatConfig(session)}
                                    />
                                ))
                            }
                        </MenuList>

                        {/* <MenuList
                            sx={{
                                width: '100%',
                                // bgcolor: 'background.paper',
                                bgcolor: '#F7F7F7',
                                position: 'relative',
                                overflow: 'auto',
                                height: '30vh',
                                '& ul': { padding: 0 },
                            }}
                            component="nav"
                            aria-labelledby="nested-list-subheader"
                            subheader={
                                <ListSubheader component="div"
                                    sx={{
                                        bgcolor: '#F7F7F7',
                                    }}
                                >
                                    Chat
                                </ListSubheader>
                            }

                        >
                            {
                                store.chatSessions.map((session, ix) => (
                                    <SessionItem selected={store.currentSession.id === session.id}
                                        session={session}
                                        switchMe={() => store.switchCurrentSession(session)}
                                        deleteMe={() => store.deleteChatSession(session)}
                                        copyMe={() => {
                                            const newSession = createSession(session.name + ' Copyed')
                                            newSession.messages = session.messages
                                            store.createChatSession(newSession, ix)
                                        }}
                                        updateMe={(updated) => store.updateChatSession(updated)}
                                    />
                                ))
                            }
                        </MenuList> */}

                        <Divider />

                        <MenuItem onClick={() => store.createEmptyChatSession()} >
                            <ListItemIcon>
                                <IconButton><AddIcon fontSize="small" /></IconButton>
                            </ListItemIcon>
                            <ListItemText>
                                New Chat
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
                                Settings
                            </ListItemText>
                            <Typography variant="body2" color="text.secondary">
                                {/* ⌘N */}
                            </Typography>
                        </MenuItem>

                        <MenuItem onClick={() => {
                            setNeedCheckUpdate(false)
                            openLink('https://github.com/Bin-Huang/chatbox/releases')
                        }}>
                            <ListItemIcon>
                                <IconButton>
                                    <InfoOutlinedIcon fontSize="small" />
                                </IconButton>
                            </ListItemIcon>
                            <ListItemText>
                                <Badge color="primary" variant="dot" invisible={!needCheckUpdate} sx={{ paddingRight: '8px' }} >
                                    <Typography color="GrayText">
                                        Version: {store.version}
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
                        // bgcolor: '#F7F7F7',
                        padding: '20px 0',
                    }} spacing={2}>
                        <Toolbar variant="dense">
                            <IconButton edge="start" color="inherit" aria-label="menu" sx={{ mr: 2 }}>
                                <ChatBubbleOutlineOutlinedIcon />
                            </IconButton>
                            <Typography variant="h6" color="inherit" component="div" noWrap>
                                {store.currentSession.name}
                            </Typography>
                        </Toolbar>
                        <Divider />
                        <List
                            ref={listRef}
                            sx={{
                                width: '100%',
                                height: '80%',
                                bgcolor: 'background.paper',
                                overflow: 'auto',
                                '& ul': { padding: 0 },
                            }}
                        >
                            {
                                store.currentSession.messages.map((msg, ix) => (
                                    <Block msg={msg}
                                        setMsg={(updated) => {
                                            const newMsgs = store.currentSession.messages.map((m) => {
                                                if (m.id === updated.id) {
                                                    return updated
                                                }
                                                return m
                                            })
                                            store.updateChatSession({ ...store.currentSession, messages: newMsgs })
                                        }}
                                        delMsg={() => {
                                            const newMsgs = store.currentSession.messages.filter((m) => m.id !== msg.id)
                                            store.updateChatSession({ ...store.currentSession, messages: newMsgs })
                                        }}
                                        refreshMsg={() => {
                                            const promptMsgs = store.currentSession.messages.slice(0, ix)
                                            generate(store.currentSession, promptMsgs, msg)
                                        }}
                                    />
                                ))
                            }
                        </List>
                        <Box>
                            <MessageInput onSubmit={async (newUserMsg: Message) => {
                                store.currentSession.messages.push(newUserMsg)
                                const promptsMsgs = [...store.currentSession.messages]
                                const newAssistantMsg = createMessage('assistant', '....')
                                store.currentSession.messages.push(newAssistantMsg)
                                store.updateChatSession(store.currentSession)
                                generate(store.currentSession, promptsMsgs, newAssistantMsg)
                                setNeedScroll(true)
                            }} />
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
            </Grid>
        </Box >
    );
}

export default App;

function MessageInput(props: {
    onSubmit: (newMsg: Message) => void
}) {
    const [messageText, setMessageText] = useState<string>('')
    const submit = (event?: any) => {
        if (event) {
            event.preventDefault()
        }
        if (messageText.length === 0) {
            return
        }
        props.onSubmit(createMessage('user', messageText))
        setMessageText('')
    }
    return (
        <form onSubmit={submit}>
            <Stack direction="column" spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                        multiline
                        label="Prompt"
                        value={messageText}
                        onChange={(event) => setMessageText(event.target.value)}
                        fullWidth
                        autoFocus
                        id='message-input'
                        onKeyDown={(event) => {
                            if (event.keyCode === 13 && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
                                event.preventDefault()
                                submit()
                                return
                            }
                        }}
                    />
                    <Button type='submit' variant="contained" size='large'>
                        SEND
                    </Button>
                </Stack>
                <Typography variant='caption' style={{ opacity: 0.3 }}>[Enter] send, [Shift+Enter] line break</Typography>
            </Stack>
        </form>
    )
}
