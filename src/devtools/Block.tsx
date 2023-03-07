import { useState } from 'react';
import { ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum } from 'openai';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import MenuItem from '@mui/material/MenuItem';
import { Button, ListItem, Typography, Grid, TextField } from '@mui/material';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import PersonIcon from '@mui/icons-material/Person';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import SettingsIcon from '@mui/icons-material/Settings';
import MarkdownIt from 'markdown-it'
import mdKatex from '@traptitech/markdown-it-katex'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'
import 'katex/dist/katex.min.css'

const md = new MarkdownIt({
    linkify: true,
    highlight: (str: string, lang: string, attrs: string): string => {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return '<pre class="hljs"><code>' +
                    hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
                    '</code></pre>';
            } catch (e) {
                console.log(e)
                return str
            }
        }
        return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
    }
});
md.use(mdKatex, { blockClass: 'katexmath-block rounded-md p-[10px]', errorColor: ' #cc0000' })

export type Message = ChatCompletionRequestMessage & {
    id: string
}

export interface Props {
    msg: Message
    setMsg?: (msg: Message) => void
    delMsg?: () => void
}

export default function Block(props: Props) {
    const { msg, setMsg } = props
    const [isEditing, setIsEditing] = useState(false)
    return (
        <ListItem
            onMouseEnter={() => {
                setIsEditing(true)
            }}
            onMouseLeave={() => {
                setIsEditing(false)
            }}
            sx={{
                padding: '22px 28px'
            }}
        >
            <Grid container spacing={2}>
                <Grid item>
                    {
                        isEditing ? (
                            <Select
                                value={msg.role}
                                onChange={(e: SelectChangeEvent) => {
                                    setMsg && setMsg({ ...msg, role: e.target.value as ChatCompletionRequestMessageRoleEnum })
                                }}
                                size='small'
                            >
                                <MenuItem value={ChatCompletionRequestMessageRoleEnum.System}>
                                    <Avatar ><SettingsIcon /></Avatar>
                                </MenuItem>
                                <MenuItem value={ChatCompletionRequestMessageRoleEnum.User}>
                                    <Avatar><PersonIcon /></Avatar>
                                </MenuItem>
                                <MenuItem value={ChatCompletionRequestMessageRoleEnum.Assistant}>
                                    <Avatar><SmartToyIcon /></Avatar>
                                </MenuItem>
                            </Select>
                        ) : (
                            {
                                assistant: <Avatar><SmartToyIcon /></Avatar>,
                                user: <Avatar><PersonIcon /></Avatar>,
                                system: <Avatar><SettingsIcon /></Avatar>
                            }[msg.role]
                        )
                    }
                </Grid>
                <Grid item xs={12} sm container>
                    <Grid item xs container direction="column" spacing={2}>
                        <Grid item xs>
                            <Typography gutterBottom variant="subtitle1" component="div">
                                {msg.role}
                            </Typography>
                            {
                                isEditing ? (
                                    <TextField
                                        style={{
                                            width: "100%",
                                        }}
                                        multiline
                                        placeholder="prompt"
                                        value={msg.content}
                                        onChange={(e) => { setMsg && setMsg({ ...msg, content: e.target.value }) }}
                                    />
                                ) : (
                                    <Box
                                        sx={{
                                            bgcolor: "Background",
                                        }}
                                        dangerouslySetInnerHTML={{ __html: md.render(msg.content) }}
                                    />
                                )
                            }
                            <Typography variant="body2" color="text.secondary">
                                100 tokens
                            </Typography>
                        </Grid>
                    </Grid>
                    <Grid item>
                        <Button onClick={props.delMsg}>
                            <HighlightOffIcon />
                        </Button>
                    </Grid>
                </Grid>
            </Grid>
        </ListItem>
    );
}

// <Divider variant="middle" light />