import React, { useEffect, useRef, useState, MutableRefObject } from 'react'
import { Stack, Grid, Button, ButtonGroup, MenuItem, ListItemIcon, Typography, Divider, TextField } from '@mui/material'
import { Message, createMessage } from '../stores/types'
import { useTranslation } from 'react-i18next'
import SendIcon from '@mui/icons-material/Send'

export default function InputBox(props: {
    onSubmit: (newMsg: Message, needGenerating?: boolean) => void
    quoteCache: string
    setQuotaCache(cache: string): void
    textareaRef: MutableRefObject<HTMLTextAreaElement | null>
}) {
    const { t } = useTranslation()
    const [messageInput, setMessageInput] = useState('')
    useEffect(() => {
        if (props.quoteCache !== '') {
            setMessageInput(props.quoteCache)
            props.setQuotaCache('')
            props.textareaRef?.current?.focus()
        }
    }, [props.quoteCache])
    const submit = (needGenerating = true) => {
        if (messageInput.trim() === '') {
            return
        }
        props.onSubmit(createMessage('user', messageInput), needGenerating)
        setMessageInput('')
    }
    useEffect(() => {
        function keyboardShortcut(e: KeyboardEvent) {
            if (e.key === 'i' && (e.metaKey || e.ctrlKey)) {
                props.textareaRef?.current?.focus()
            }
        }
        window.addEventListener('keydown', keyboardShortcut)
        return () => {
            window.removeEventListener('keydown', keyboardShortcut)
        }
    }, [])

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault()
                submit()
            }}
        >
            <Stack direction="column" spacing={1}>
                <Grid container spacing={1}>
                    <Grid item xs>
                        <TextField
                            inputRef={props.textareaRef}
                            multiline
                            label="Prompt"
                            value={messageInput}
                            onChange={(event) => setMessageInput(event.target.value)}
                            fullWidth
                            maxRows={12}
                            autoFocus
                            id="message-input"
                            onKeyDown={(event) => {
                                if (
                                    event.keyCode === 13 &&
                                    !event.shiftKey &&
                                    !event.ctrlKey &&
                                    !event.altKey &&
                                    !event.metaKey
                                ) {
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
                        <Button type="submit" variant="contained" size="large" style={{ padding: '15px 16px' }}>
                            <SendIcon />
                        </Button>
                    </Grid>
                </Grid>
                <Typography variant="caption" style={{ opacity: 0.3 }}>
                    {t('[Enter] send, [Shift+Enter] line break, [Ctrl+Enter] send without generating')}
                </Typography>
            </Stack>
        </form>
    )
}
