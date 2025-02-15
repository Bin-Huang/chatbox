import {
    Button,
    Paper,
    Badge,
    Box,
    Dialog,
    DialogContent,
    DialogActions,
    DialogTitle,
    useTheme,
} from '@mui/material'
import iconPNG from '../static/icon.png'
import { useTranslation } from 'react-i18next'
import platform from '../packages/platform'
import useVersion from '../hooks/useVersion'
import * as atoms from '../stores/atoms'
import { useAtomValue } from 'jotai'

interface Props {
    open: boolean
    close(): void
}

export default function AboutWindow(props: Props) {
    const { t } = useTranslation()
    const theme = useTheme()
    const language = useAtomValue(atoms.languageAtom)
    const versionHook = useVersion()
    return (
        <Dialog open={props.open} onClose={props.close} fullWidth>
            <DialogTitle>{t('About Chatbox')}</DialogTitle>
            <DialogContent>
                <Box sx={{ textAlign: 'center', padding: '0 20px' }}>
                    <img src={iconPNG} style={{ width: '100px', margin: 0, display: 'inline-block' }} />
                    <h3 style={{ margin: '4px 0 5px 0' }}>Chatbox
                        {
                            /\d/.test(versionHook.version)
                                ? `(v${versionHook.version})`
                                : ''
                        }
                    </h3>
                    <p className="p-0 m-0">{t('about-slogan')}</p>
                    <p className="p-0 m-0 opacity-60 text-xs">{t('about-introduction')}</p>
                </Box>
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                    }}
                    className='mt-1'
                >
                    <Badge color="primary" variant="dot" invisible={!versionHook.needCheckUpdate}
                        sx={{ margin: '4px' }}
                    >
                        <Button
                            variant="outlined"
                            onClick={() => platform.openLink(`https://chatboxai.app/redirect_app/check_update/${language}`)}
                        >
                            {t('Check Update')}
                        </Button>
                    </Badge>
                    <Button
                        variant="outlined"
                        sx={{ margin: '4px' }}
                        onClick={() => platform.openLink(`https://chatboxai.app/redirect_app/homepage/${language}`)}
                    >
                        {t('Homepage')}
                    </Button>
                    <Button
                        variant="outlined"
                        sx={{ margin: '4px' }}
                        onClick={() => platform.openLink(`https://chatboxai.app/redirect_app/feedback/${language}`)}
                    >
                        {t('Feedback')}
                    </Button>
                    <Button
                        variant="outlined"
                        sx={{ margin: '4px' }}
                        onClick={() => platform.openLink(`https://chatboxai.app/redirect_app/faqs/${language}`)}
                    >
                        {t('FAQs')}
                    </Button>
                </Box>
                <Paper
                    elevation={2}
                    className="font-light text-xs m-2 py-1 px-4"
                    sx={{
                        backgroundColor: 'paper',
                    }}
                >
                    <div className='my-1'>
                        <b>Benn:</b>
                    </div>
                    <div className='my-1'>
                        <span>{t('Auther Message')}</span>
                    </div>
                    <div className='my-1'>
                        <a
                            className='underline font-normal cursor-pointer mr-4' style={{ color: theme.palette.primary.main }}
                            onClick={() => platform.openLink(`https://chatboxai.app/redirect_app/donate/${language}`)}
                        >
                            {t('Donate')}
                        </a>
                        <a
                            className='underline font-normal cursor-pointer mr-4' style={{ color: theme.palette.primary.main }}
                            onClick={() => platform.openLink(`https://chatboxai.app/redirect_app/author/${language}`)}
                        >
                            {t('Follow me on Twitter(X)')}
                        </a>
                        {/* <Button
                            variant="text"
                            onClick={() =>
                                api.openLink(`https://chatboxai.app/redirect_app/become_sponsor/${language}`)
                            }
                        >
                            {t('Or become a sponsor')}
                        </Button> */}
                    </div>
                </Paper>
                {/* <Box>
                    <h4 className="text-center mb-1 mt-2">{t('Changelog')}</h4>
                    <Box className="px-6">
                        <Markdown>{i18n.changelog()}</Markdown>
                    </Box>
                </Box> */}
            </DialogContent>
            <DialogActions>
                <Button onClick={props.close}>{t('close')}</Button>
            </DialogActions>
        </Dialog>
    )
}
