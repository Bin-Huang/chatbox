import React from 'react';
import './App.css';
import Block from './Block'
import * as client from './client'
import * as hooks from './hooks'
import SessionItem from './SessionItem'
import {
    Toolbar, AppBar, Card, Box,
    List, ListSubheader, ListItem, ListItemButton, ListItemText, ListItemAvatar, MenuList,
    Avatar, IconButton, Button, Stack, Grid, MenuItem, ListItemIcon, Typography, Divider,
    Dialog, DialogContent, DialogActions, DialogTitle, DialogContentText, TextField,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Session, createSession, Message, createMessage } from './types'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ChatIcon from '@mui/icons-material/Chat';
import useStore from './store'
import SettingWindow from './SettingWindow'

const { useEffect, useState } = React

function App() {
    const store = useStore()
    const [sessions, _setSessions] = hooks.useLocalStorage<Session[]>("openai_sessions", [createSession()])
    const [currentSession, _setCurrentSession] = useState<Session>(sessions[0])

    const [openSettingWindow, setOpenSettingWindow] = React.useState(false);

    const switchCurrentSession = (session: Session) => {
        _setCurrentSession(session)
    }
    const saveCurrentSession = (session: Session) => {
        _setCurrentSession(session)
        let isNew = true
        const newSessions = sessions.map((s) => {
            if (s.id === session.id) {
                isNew = false
                return session
            }
            return s
        })
        if (isNew) {
            newSessions.push(session)
        }
        _setSessions(newSessions)
    }
    const updateCurrrentMessages = (messages: Message[]) => {
        saveCurrentSession({ ...currentSession, messages })
    }

    return (
        <Grid container spacing={2} sx={{ background: "#FFFFFF" }}>
            <Grid item xs={4}>
                <Toolbar variant="dense">
                    <IconButton edge="start" color="inherit" aria-label="menu" sx={{ mr: 2 }}>
                        <ChatIcon />
                    </IconButton>
                    <Typography variant="h6" color="inherit" component="div">
                        ChatBox
                    </Typography>
                    <Divider />
                </Toolbar>
                <Divider />
                <MenuList
                    sx={{ width: '100%', maxWidth: 360, bgcolor: '#F7F7F7' }}
                    component="nav"
                    aria-labelledby="nested-list-subheader"
                    subheader={
                        <ListSubheader component="div" id="nested-list-subheader">
                            Nested List Items
                        </ListSubheader>
                    }
                >
                    {
                        sessions.map((session, ix) => (
                            <SessionItem selected={currentSession.id === session.id}
                                session={session}
                                switchMe={() => switchCurrentSession(session)}
                                deleteMe={() => {
                                    const newSessions = sessions.filter((s) => s.id !== session.id)
                                    if (newSessions.length === 0) {
                                        newSessions.push(createSession())
                                    }
                                    _setSessions(newSessions)
                                    if (currentSession.id === session.id) {
                                        switchCurrentSession(newSessions[0])
                                    }
                                }}
                                copyMe={() => {
                                    const newSession = createSession(session.name + ' Copyed')
                                    newSession.messages = session.messages
                                    sessions.splice(ix + 1, 0, newSession)
                                    saveCurrentSession(newSession)
                                }}
                                updateMe={(updated) => {
                                    const newSessions = sessions.map((s) => {
                                        if (s.id === updated.id) {
                                            return updated
                                        }
                                        return s
                                    })
                                    _setSessions(newSessions)
                                }}
                            />
                        ))
                    }

                    <MenuItem onClick={() => {
                        saveCurrentSession(createSession())
                    }}
                    >
                        <ListItemIcon>
                            <IconButton><AddCircleOutlineIcon fontSize="small" /></IconButton>
                        </ListItemIcon>
                        <ListItemText>
                            New Session
                        </ListItemText>
                        <Typography variant="body2" color="text.secondary">
                            ⌘N
                        </Typography>
                    </MenuItem>
                    <MenuItem onClick={() => {
                        setOpenSettingWindow(true)
                    }}
                    >
                        <ListItemIcon>
                            <IconButton><AddCircleOutlineIcon fontSize="small" /></IconButton>
                        </ListItemIcon>
                        <ListItemText>
                            Settings
                        </ListItemText>
                        <Typography variant="body2" color="text.secondary">
                            ⌘N
                        </Typography>
                    </MenuItem>
                </MenuList>
            </Grid>
            <Grid item xs={8}>
                <Box sx={{ height: '90vh', bgcolor: '#F7F7F7' }}>
                    <Toolbar variant="dense" >
                        <IconButton edge="start" color="inherit" aria-label="menu" sx={{ mr: 2 }}>
                            <ChatIcon />
                        </IconButton>
                        <Typography variant="h6" color="inherit" component="div">
                            {currentSession.name}
                        </Typography>
                        <Divider />
                    </Toolbar>
                    <Box sx={{ height: '80vh' }} >
                        <List
                            sx={{
                                width: '100%',
                                "height": '80vh',
                                bgcolor: 'background.paper',
                                overflow: 'auto',
                                '& ul': { padding: 0 },
                            }}
                        >
                            {
                                currentSession.messages.map((msg) => (
                                    <Block msg={msg} setMsg={(updated) => {
                                        const newMsgs = currentSession.messages.map((m) => {
                                            if (m.id === updated.id) {
                                                return updated
                                            }
                                            return m
                                        })
                                        updateCurrrentMessages(newMsgs)
                                    }}
                                        delMsg={() => {
                                            const newMsgs = currentSession.messages.filter((m) => m.id !== msg.id)
                                            updateCurrrentMessages(newMsgs)
                                        }}
                                    />
                                ))
                            }
                        </List>
                    </Box>
                    <Box >
                        <MessageInput onSubmit={async (newMsg: Message) => {
                            const msgs = [...currentSession.messages, newMsg]
                            updateCurrrentMessages(msgs)
                            const msg = await client.replay(store.settings.openaiKey, msgs)
                            updateCurrrentMessages([...msgs, msg])
                        }} />
                    </Box>
                </Box>
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
    );
}

export default App;

function MessageInput(props: {
    onSubmit: (newMsg: Message) => void
}) {
    const [messageText, setMessageText] = useState<string>('')
    return (
        <form
            onSubmit={() => props.onSubmit(createMessage('user', messageText))}
        >
            <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                    label="Message"
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value)}
                    fullWidth
                />
                <Button type="submit" variant="contained">
                    Send
                </Button>
            </Stack>
        </form>
    )
}
