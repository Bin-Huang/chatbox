import React, { useRef } from 'react';
import './App.css';
import Block from './Block'
import * as client from './client'
import SessionItem from './SessionItem'
import {
    Toolbar, AppBar, Card, Box,
    List, ListSubheader, ListItem, ListItemButton, ListItemText, ListItemAvatar, MenuList,
    Avatar, IconButton, Button, Stack, Grid, MenuItem, ListItemIcon, Typography, Divider,
    Dialog, DialogContent, DialogActions, DialogTitle, DialogContentText, TextField,
} from '@mui/material';
import { Session, createSession, Message, createMessage } from './types'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ChatIcon from '@mui/icons-material/Chat';
import useStore from './store'
import SettingWindow from './SettingWindow'
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';

const { useEffect, useState } = React

function App() {
    const store = useStore()

    const listRef = useRef<any>(null)
    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight
        }
    }, [store.currentSession])

    const [openSettingWindow, setOpenSettingWindow] = React.useState(false);

    useEffect(() => {
        if (store.needSetting) {
            setOpenSettingWindow(true)
        }
    }, [store.needSetting])

    const generate = async (msgs: Message[]) => {
        const msg = await client.replay(store.settings.openaiKey, msgs)
        const newMessages = [...msgs, msg]
        store.updateChatSession({ ...store.currentSession, messages: newMessages })
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
                                        updateMe={(updated) => store.updateChatSession(updated)}
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
                                            const msgs = store.currentSession.messages.slice(0, ix)
                                            store.updateChatSession({ ...store.currentSession, messages: msgs })
                                            generate(msgs)
                                        }}
                                    />
                                ))
                            }
                        </List>
                        <Box>
                            <MessageInput onSubmit={async (newMsg: Message) => {
                                const newMessages = [...store.currentSession.messages, newMsg]
                                store.updateChatSession({ ...store.currentSession, messages: newMessages })
                                generate(newMessages)
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
            </Grid>
        </Box>
    );
}

export default App;

function MessageInput(props: {
    onSubmit: (newMsg: Message) => void
}) {
    const [messageText, setMessageText] = useState<string>('')
    return (
        <form
            onSubmit={(event) => {
                event.preventDefault()
                props.onSubmit(createMessage('user', messageText))
                setMessageText('')
            }}
        >
            <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                    multiline
                    label="Prompt"
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value)}
                    fullWidth
                    autoFocus
                    id='message-input'
                />
                <Button type="submit" variant="contained">
                    Send
                </Button>
            </Stack>
        </form>
    )
}
