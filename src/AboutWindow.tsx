import React, { useEffect, useState } from 'react';
import {
    Button, Paper, Badge, Box, Divider,
    Dialog, DialogContent, DialogActions, DialogTitle, DialogContentText, TextField, Stack,
} from '@mui/material';
import iconPNG from './icon.png'
import { useTranslation } from 'react-i18next'
import * as api from './api'
import * as remote from './remote'
import { SponsorAboutBanner } from './types';

interface Props {
    open: boolean
    version: string
    lang: string
    close(): void
}

export default function AboutWindow(props: Props) {
    const { t } = useTranslation()
    const [sponsorBanners, setSponsorBanners] = useState<SponsorAboutBanner[]>([])
    useEffect(() => {
        if (props.open) {
            remote.listSponsorAboutBanner().then(setSponsorBanners)
        } else {
            setSponsorBanners([])
        }
    }, [props.open])
    return (
        <Dialog open={props.open} onClose={props.close} fullWidth>
            <DialogTitle>{t('About Chatbox')}</DialogTitle>
            <DialogContent>
                <Box sx={{ textAlign: 'center', padding: '0 20px' }}>
                    <img src={iconPNG} style={{ width: '100px', margin: 0 }} />
                    <h3 style={{ margin: '4px 0 5px 0' }}>Chatbox(v{props.version})</h3>
                    <span>
                        {t('Your Ultimate Copilot on the Desktop. Chatbox is a free and open-source desktop application and devtools for GPT. Made by')}
                        <a href={`https://chatboxapp.xyz/redirect_app/author/${props.lang}`} target='_blank'> Benn Huang </a>
                        {t('and the community.')}
                    </span>
                </Box>
                <Stack spacing={2} direction="row" sx={{ justifyContent: 'center', marginTop: '10px' }}>
                    <Badge color="primary" variant="dot" invisible={false}>
                        <Button variant="outlined"
                            onClick={() => api.openLink(`https://chatboxapp.xyz/redirect_app/check_update/${props.lang}`)}
                        >
                            {t('Check Update')}
                        </Button>
                    </Badge>
                    <Button variant="outlined"
                        onClick={() => api.openLink(`https://chatboxapp.xyz/redirect_app/homepage/${props.lang}`)}
                    >
                        {t('Homepage')}
                    </Button>
                    <Button variant="outlined"
                        onClick={() => api.openLink(`https://chatboxapp.xyz/redirect_app/feedback/${props.lang}`)}
                    >
                        {t('Feedback')}
                    </Button>
                    <Button variant="outlined"
                        onClick={() => api.openLink(`https://chatboxapp.xyz/redirect_app/roadmap/${props.lang}`)}
                    >
                        {t('Roadmap')}
                    </Button>
                </Stack>
                <Paper elevation={3} sx={{ padding: '10px 10px 5px 10px', backgroundColor: 'paper', marginTop: '30px' }}>
                    <span>{t("I made Chatbox for my own use and it's great to see so many people enjoying it! If you'd like to support development, a donation would be greatly appreciated, though it is entirely optional. Many thanks, Benn")}</span>
                    <Stack spacing={2} direction="row" >
                        <Button variant="text" onClick={() => api.openLink(`https://chatboxapp.xyz/redirect_app/donate/${props.lang}`)} >
                            {t('Donate')}
                        </Button>
                        <Button variant="text" onClick={() => api.openLink(`https://chatboxapp.xyz/redirect_app/become_sponsor/${props.lang}`)} >
                            {t('Or become a sponsor')}
                        </Button>
                    </Stack>
                </Paper>

                {
                    sponsorBanners.length > 0 && (
                        <Divider sx={{ margin: '10px 0 5px 0', opacity: 0.8 }}>
                            {t('Special thanks to the following sponsors:')}
                        </Divider>
                    )
                }
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
                    {
                        sponsorBanners.map((item) => {
                            return (
                                <Paper key={item.name} elevation={1} sx={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    flexDirection: 'column',
                                    textAlign: 'center',
                                    autoflowY: 'auto',
                                    width: '100%',
                                    height: '128px',
                                }}>
                                    {
                                        item.type === 'picture' ? (
                                            <>
                                                <a href={item.link} target='_blank'>
                                                    <img style={{ maxWidth: '90%', maxHeight: '100px' }} src={item.pictureUrl} />
                                                </a>
                                            </>
                                        ) : (
                                            <>
                                                <a href={item.link} target='_blank'>
                                                    <img style={{ maxWidth: '140px' }} src={item.pictureUrl} />
                                                </a>
                                                <a href={item.link} target='_blank'>
                                                    <b>{item.title}</b>
                                                </a>
                                                <a href={item.link} target='_blank'>
                                                    <span>{item.description}</span>
                                                </a>
                                            </>
                                        )
                                    }
                                </Paper>
                            )
                        })
                    }
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={props.close}>{t('close')}</Button>
            </DialogActions>
        </Dialog>
    );
}
