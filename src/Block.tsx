import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import MenuItem from '@mui/material/MenuItem';
import {
    IconButton, Divider, ListItem, Typography, Grid, TextField, Menu, MenuProps, Tooltip,
    ButtonGroup,
} from '@mui/material';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import PersonIcon from '@mui/icons-material/Person';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SettingsIcon from '@mui/icons-material/Settings';
import MarkdownIt from 'markdown-it'
import mdKatex from '@traptitech/markdown-it-katex'
import hljs from 'highlight.js'
import 'katex/dist/katex.min.css'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import CheckIcon from '@mui/icons-material/Check';
import EditIcon from '@mui/icons-material/Edit';
import { styled, alpha } from '@mui/material/styles';
import StopIcon from '@mui/icons-material/Stop';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import * as wordCount from './utils'
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import 'github-markdown-css/github-markdown-light.css'
import mila from 'markdown-it-link-attributes';
import { useTranslation, getI18n } from 'react-i18next';
import { Message, OpenAIRoleEnum, OpenAIRoleEnumType } from './types';
import ReplayIcon from '@mui/icons-material/Replay';
import CopyAllIcon from '@mui/icons-material/CopyAll';
import './styles/Block.scss'

// copy button html content
// join at markdown-it parsed
const getCodeCopyButtonHTML = () => {
    return `<div class="copy-action">${getI18n().t('copy')}</div>`;
};

const md = new MarkdownIt({
    linkify: true,
    breaks: true,
    highlight: (str: string, lang: string, attrs: string): string => {
        let content = str
        if (lang && hljs.getLanguage(lang)) {
            try {
                content = hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
            } catch (e) {
                console.log(e)
                return str
            }
        } else {
            content = md.utils.escapeHtml(str)
        }

        // join actions html string
        lang = (lang || 'txt').toUpperCase()
        return [
            '<div class="code-block-wrapper">',
            `<div class="code-header"><span class="code-lang">${lang}</span><div class="copy-action">${getI18n().t('copy')}</div></div>`,
            '<pre class="hljs code-block">',
            `<code>${content}</code>`,
            '</pre>',
            '</div>',
        ].join('');
    },
});

md.use(mdKatex, { blockClass: 'katexmath-block rounded-md p-[10px]', errorColor: ' #cc0000' })
md.use(mila, { attrs: { target: "_blank", rel: "noopener" } })

export interface Props {
    id?: string
    msg: Message
    showWordCount: boolean
    showTokenCount: boolean
    showModelName: boolean
    modelName: string
    setMsg: (msg: Message) => void
    delMsg: () => void
    refreshMsg: () => void
    copyMsg: () => void
    quoteMsg: () => void
}

function _Block(props: Props) {
    const { t } = useTranslation()
    const { msg, setMsg } = props;
    const [isHovering, setIsHovering] = useState(false)
    const [isEditing, setIsEditing] = useState(false)

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
    };

    // stop action
    const onStop = useCallback(() => {
        msg?.cancel?.();
    }, [msg]);

    const onRefresh = useCallback(() => {
        onStop();
        props.refreshMsg();
    }, [onStop, props.refreshMsg]);

    const tips: string[] = []
    if (props.showModelName) {
        tips.push(`model: ${props.modelName}`)
    }
    if (props.showWordCount) {
        tips.push(`word count: ${wordCount.countWord(msg.content)}`)
    }
    if (props.showTokenCount) {
        tips.push(`token estimate: ${wordCount.estimateTokens(msg.content)}`)
    }
    return (
        <ListItem
            id={props.id}
            key={msg.id}
            onMouseEnter={() => {
                setIsHovering(true)
            }}
            onMouseOver={() => {
                setIsHovering(true)
            }}
            onMouseLeave={() => {
                setIsHovering(false)
            }}
            sx={{
                padding: '1rem 28px 0.6rem 28px',
            }}
            className={[
                'msg-block',
                msg.generating ? 'rendering' : 'render-done',
                msg?.role === OpenAIRoleEnum.Assistant ? 'assistant-msg' : 'user-msg',
            ].join(' ')}
        >
            <Grid container spacing={2}>
                <Grid item >
                    {
                        isEditing ? (
                            <Select
                                value={msg.role}
                                onChange={(e: SelectChangeEvent) => {
                                    setMsg && setMsg({ ...msg, role: e.target.value as OpenAIRoleEnumType })
                                }}
                                size='small'
                                id={msg.id + 'select'}
                            >
                                <MenuItem value={OpenAIRoleEnum.System}>
                                    <Avatar ><SettingsIcon /></Avatar>
                                </MenuItem>
                                <MenuItem value={OpenAIRoleEnum.User}>
                                    <Avatar><PersonIcon /></Avatar>
                                </MenuItem>
                                <MenuItem value={OpenAIRoleEnum.Assistant}>
                                    <Avatar><SmartToyIcon /></Avatar>
                                </MenuItem>
                            </Select>
                        ) : (
                            <Box sx={{ marginTop: '8px' }}>
                                {
                                    {
                                        assistant: <Avatar><SmartToyIcon /></Avatar>,
                                        user: <Avatar><PersonIcon /></Avatar>,
                                        system: <Avatar><SettingsIcon /></Avatar>
                                    }[msg.role]
                                }
                            </Box>
                        )
                    }
                </Grid>
                <Grid item xs={11} sm container>
                    <Grid item xs container direction="column" spacing={2}>
                        <Grid item xs>
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
                                        id={msg.id + 'input'}
                                    />
                                ) : (
                                    <Box
                                        sx={{
                                            wordBreak: 'break-word',
                                        }}
                                        className='msg-content'
                                        dangerouslySetInnerHTML={{ __html: md.render(msg.content) }}
                                    />
                                )
                            }
                            <Typography variant="body2" sx={{ opacity: 0.5 }} >
                                {
                                    tips.join(', ')
                                }
                            </Typography>

                            {
                                (isHovering && !isEditing) || msg.generating ? (
                                    <ButtonGroup variant="contained" aria-label="outlined primary button group">
                                        {
                                            msg.generating
                                                ? (
                                                    <Tooltip title={t('stop generating')} placement='top' >
                                                        <IconButton aria-label="edit" color='warning' onClick={onStop} >
                                                            <StopIcon fontSize='small' />
                                                        </IconButton>
                                                    </Tooltip>
                                                )
                                                : (
                                                    <Tooltip title={t("regenerate")} placement='top' >
                                                        <IconButton aria-label="edit" color='primary' onClick={onRefresh} >
                                                            <ReplayIcon fontSize='small' />
                                                        </IconButton>
                                                    </Tooltip>
                                                )
                                        }
                                        <Tooltip title={t('edit')} placement='top' >
                                            <IconButton aria-label="edit" color='primary' onClick={() => {
                                                setIsHovering(false)
                                                setAnchorEl(null)
                                                setIsEditing(true)
                                            }} >
                                                <EditIcon fontSize='small' />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title={t('copy')} placement='top'>
                                            <IconButton aria-label="copy" color='primary' onClick={() => {
                                                props.copyMsg()
                                                setAnchorEl(null)
                                            }} >
                                                <CopyAllIcon fontSize='small' />
                                            </IconButton>
                                        </Tooltip>
                                        <IconButton onClick={handleClick} color='primary'>
                                            <MoreVertIcon fontSize='small' />
                                        </IconButton>
                                        <StyledMenu
                                            MenuListProps={{
                                                'aria-labelledby': 'demo-customized-button',
                                            }}
                                            anchorEl={anchorEl}
                                            open={open}
                                            onClose={handleClose}
                                            key={msg.id + 'menu'}
                                        >
                                            <MenuItem key={msg.id + 'quote'} onClick={() => {
                                                setIsHovering(false)
                                                setAnchorEl(null)
                                                props.quoteMsg()
                                            }} disableRipple >
                                                <FormatQuoteIcon fontSize='small' />
                                                {t('quote')}
                                            </MenuItem>
                                            <Divider sx={{ my: 0.5 }} />
                                            <MenuItem key={msg.id + 'del'} onClick={() => {
                                                setIsEditing(false)
                                                setIsHovering(false)
                                                setAnchorEl(null)
                                                props.delMsg()
                                            }} disableRipple
                                            >
                                                <DeleteForeverIcon fontSize='small' />
                                                {t('delete')}
                                            </MenuItem>
                                        </StyledMenu>
                                    </ButtonGroup>
                                ) : (
                                    <Box sx={{ height: '33px' }}></Box>
                                )
                            }
                        </Grid>
                    </Grid>
                    <Grid item xs={1}>
                        {
                            isEditing && (
                                <>
                                    <IconButton onClick={() => setIsEditing(false)} size='large' color='primary' >
                                        <CheckIcon />
                                    </IconButton>
                                </>
                            )
                        }
                    </Grid>
                </Grid>
            </Grid>
        </ListItem>
    );
}

// <Divider variant="middle" light />
const StyledMenu = styled((props: MenuProps) => (
    <Menu
        elevation={0}
        anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
        }}
        transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
        }}
        {...props}
    />
))(({ theme }) => ({
    '& .MuiPaper-root': {
        borderRadius: 6,
        marginTop: theme.spacing(1),
        minWidth: 140,
        color:
            theme.palette.mode === 'light' ? 'rgb(55, 65, 81)' : theme.palette.grey[300],
        boxShadow:
            'rgb(255, 255, 255) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px',
        '& .MuiMenu-list': {
            padding: '4px 0',
        },
        '& .MuiMenuItem-root': {
            '& .MuiSvgIcon-root': {
                fontSize: 18,
                color: theme.palette.text.secondary,
                marginRight: theme.spacing(1.5),
            },
            '&:active': {
                backgroundColor: alpha(
                    theme.palette.primary.main,
                    theme.palette.action.selectedOpacity,
                ),
            },
        },
    },
}));

export default function Block(props: Props) {
    return useMemo(() => {
        return <_Block {...props} />
    }, [props.msg, props.showWordCount, props.showTokenCount, props.showModelName, props.modelName])
}
