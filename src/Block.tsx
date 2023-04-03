import { useEffect, useState, useRef ,useMemo, useCallback } from 'react';
import { ChatCompletionRequestMessageRoleEnum } from './utils/openai-node/api';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import MenuItem from '@mui/material/MenuItem';
import { Button, Divider, ListItem, Typography, Grid, TextField, Menu, MenuProps } from '@mui/material';
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
import RefreshIcon from '@mui/icons-material/Refresh';
import StopIcon from '@mui/icons-material/Stop';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import * as wordCount from './utils'
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import 'github-markdown-css/github-markdown-light.css'
import mila from 'markdown-it-link-attributes';
import { useTranslation, getI18n } from 'react-i18next';
import { Message } from './types';

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
        return [
            '<div class="code-block-wrapper">',
            getCodeCopyButtonHTML(),
            '<pre class="hljs" style="max-width: 50vw; overflow: auto">',
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

    // for debounce each render when 'props.msg' change
    const renderTimer = useRef<NodeJS.Timeout>();
    // rendering state
    // * its not real render done
    // * if need accurate state, should change `Message` interface
    // * and after request stream done, added `done` state to `Message`
    const [mayRendering, setMayRendering] = useState(true);

    // run at `props.msg` change
    // * why need this?
    // * this comp be rendered when state or props change
    // * copy action will fresh, because comp be rerender
    // * so this effect to control `copy button` shown at render stop
    useEffect(() => {
        clearTimeout(renderTimer.current);
        setMayRendering(true);

        renderTimer.current = setTimeout(() => {
            setMayRendering(false);
        }, 360);
    }, [msg]);

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
                padding: '22px 28px',
            }}
            className={mayRendering ? 'rendering' : 'render-done'}
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
                                id={msg.id + 'select'}
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
                <Grid item xs={11} sm container>
                    <Grid item xs container direction="column" spacing={2}>
                        <Grid item xs>
                            <Typography variant="overline" component="div">
                                {t(msg.role)}
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
                                        id={msg.id + 'input'}
                                    />
                                ) : (
                                    <Box
                                        dangerouslySetInnerHTML={{ __html: md.render(msg.content) }}
                                    />
                                )
                            }
                            <Typography variant="body2" sx={{opacity: 0.5}} >
                                {
                                    tips.join(', ')
                                }
                            </Typography>
                        </Grid>
                    </Grid>
                    <Grid item xs={1}>
                        {
                            isEditing ? (
                                <>
                                <Button onClick={() => setIsEditing(false)}>
                                    <CheckIcon fontSize='small' />
                                </Button>
                                </>
                            ) : (
                                isHovering && (
                                    <>
                                        {
                                            mayRendering
                                                ? (
                                                    <Button onClick={onStop}>
                                                        <StopIcon fontSize='small' />
                                                    </Button>
                                                )
                                                : (
                                                    <Button onClick={onRefresh}>
                                                        <RefreshIcon fontSize='small' />
                                                    </Button>
                                                )
                                        }
                                        <Button onClick={handleClick}>
                                            <MoreVertIcon />
                                        </Button>
                                        <StyledMenu
                                            MenuListProps={{
                                                'aria-labelledby': 'demo-customized-button',
                                            }}
                                            anchorEl={anchorEl}
                                            open={open}
                                            onClose={handleClose}
                                            key={msg.id + 'menu'}
                                        >
                                            <MenuItem key={msg.id + 'copy'} onClick={() => {
                                                props.copyMsg()
                                                setAnchorEl(null)
                                            }} disableRipple>
                                                <ContentCopyIcon />
                                                {t('copy')}
                                            </MenuItem>

                                            <MenuItem key={msg.id + 'edit'} onClick={() => {
                                                setIsHovering(false)
                                                setAnchorEl(null)
                                                setIsEditing(true)
                                            }} disableRipple>
                                                <EditIcon />
                                                {t('edit')}
                                            </MenuItem>
                                            <MenuItem key={msg.id + 'quote'} onClick={() => {
                                                setIsHovering(false)
                                                setAnchorEl(null)
                                                props.quoteMsg()
                                            }} disableRipple>
                                                <FormatQuoteIcon />
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
                                                <DeleteForeverIcon />
                                                {t('delete')}
                                            </MenuItem>
                                        </StyledMenu>
                                    </>)
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
