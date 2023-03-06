import React from 'react';
import './App.css';
import Block from './Block'
import * as client from './client'
import * as hooks from './hooks'
import SessionItem from './SessionItem'
import {
    List, ListSubheader, ListItem, ListItemButton, ListItemText, ListItemAvatar, MenuList,
    Avatar, IconButton, Button, Stack, Grid, MenuItem, ListItemIcon, Typography, Divider,
    Dialog, DialogContent, DialogActions, DialogTitle, DialogContentText, TextField,
} from '@mui/material';
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

    const [msgEdit, setMsgEdit] = useState<Message>(createMessage())


    const attemptAddEditMsg = () => {
        if (isMessageEmpty(msgEdit)) {
            return currentSession.messages
        }
        const newMsgs = [...currentSession.messages, msgEdit]
        updateCurrrentMessages(newMsgs)
        setMsgEdit(createMessage())
        return newMsgs
    }

    return (
        <Grid container spacing={2} sx={{ background: "#FFFFFF" }}>
            <Grid item xs={2}>
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
                    <Divider />

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
                <Stack spacing={1}>
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
                </Stack>
                <Block msg={msgEdit} setMsg={setMsgEdit} />
                <button onClick={attemptAddEditMsg}>Add</button>
                <button onClick={async () => {
                    const msgs = attemptAddEditMsg()
                    const msg = await client.replay(msgs)
                    updateCurrrentMessages([...msgs, msg])
                }}>Replay</button>
            </Grid>
            <Grid item xs={2}>
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

function isMessageEmpty(msg: Message): boolean {
    return !msg.content
}

export default App;
