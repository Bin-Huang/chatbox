import { useEffect, useState } from 'react'
import {
    Button,
    Paper,
    Badge,
    Box,
    Divider,
    Dialog,
    DialogContent,
    DialogActions,
    DialogTitle,
    useTheme,
} from '@mui/material'
import iconPNG from '../static/icon.png'
import { useTranslation } from 'react-i18next'
import platform from '../packages/platform'
import * as remote from '../packages/remote'
import { SponsorAboutBanner } from '../../shared/types'
import * as i18n from '../i18n'
import useVersion from '../hooks/useVersion'
import * as atoms from '../stores/atoms'
import { useAtomValue } from 'jotai'
import Markdown from '@/components/Markdown'
import { trackingEvent } from '@/packages/event'

interface Props {
    open: boolean
    close(): void
}

export default function AboutWindow(props: Props) {
    const { t } = useTranslation()
    const theme = useTheme()
    const language = useAtomValue(atoms.languageAtom)
    const versionHook = useVersion()
    const [sponsorBanners, setSponsorBanners] = useState<SponsorAboutBanner[]>([])
    useEffect(() => {
        if (props.open) {
            remote.listSponsorAboutBanner().then(setSponsorBanners)
            trackingEvent('about_window', { event_category: 'screen_view' })
        } else {
            setSponsorBanners([])
        }
    }, [props.open])
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

                {sponsorBanners.length > 0 && (
                    <Divider sx={{ margin: '10px 0 5px 0', opacity: 0.8 }}>
                        {t('Special thanks to the following sponsors:')}
                    </Divider>
                )}
                <Box
                    sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        '& > :not(style)': {
                            m: 1,
                        },
                        justifyContent: 'center',
                        opacity: 0.8,
                    }}
                >
                    {sponsorBanners.map((item) => {
                        return (
                            <Paper
                                key={item.name}
                                elevation={1}
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    flexDirection: 'column',
                                    textAlign: 'center',
                                    autoflowY: 'auto',
                                    width: '100%',
                                    height: '128px',
                                }}
                            >
                                {item.type === 'picture' ? (
                                    <>
                                        <a href={item.link} target="_blank">
                                            <img
                                                style={{
                                                    maxWidth: '90%',
                                                    maxHeight: '100px',
                                                }}
                                                src={item.pictureUrl}
                                            />
                                        </a>
                                    </>
                                ) : (
                                    <>
                                        <a href={item.link} target="_blank">
                                            <img style={{ maxWidth: '140px' }} src={item.pictureUrl} />
                                        </a>
                                        <a href={item.link} target="_blank">
                                            <b>{item.title}</b>
                                        </a>
                                        <a href={item.link} target="_blank">
                                            <span>{item.description}</span>
                                        </a>
                                    </>
                                )}
                            </Paper>
                        )
                    })}
                </Box>
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
