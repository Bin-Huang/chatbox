import { Tooltip, Button, ButtonGroup, Card, Typography, Box } from '@mui/material'
import { ChatboxAILicenseDetail, ModelSettings } from '../../../shared/types'
import { Trans, useTranslation } from 'react-i18next'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import PasswordTextField from '../../components/PasswordTextField'
import ChatboxAIModelSelect from '../../components/ChatboxAIModelSelect'
import LinearProgress, { LinearProgressProps, linearProgressClasses } from '@mui/material/LinearProgress';
import { styled } from '@mui/material/styles';
import { Accordion, AccordionSummary, AccordionDetails } from '../../components/Accordion'
import React, { useState } from 'react'
import * as remote from '@/packages/remote'
import CircularProgress from '@mui/material/CircularProgress';
import platform from '@/packages/platform'
import { trackingEvent } from '@/packages/event'
import * as premiumActions from '@/stores/premiumActions'
import { useAtomValue } from 'jotai'
import { languageAtom } from '@/stores/atoms'

interface ModelConfigProps {
    settingsEdit: ModelSettings
    setSettingsEdit: (settings: ModelSettings) => void
}

export default function ChatboxAISetting(props: ModelConfigProps) {
    const { settingsEdit, setSettingsEdit } = props
    const { t } = useTranslation()
    const activated = premiumActions.useAutoValidate()
    const [loading, setLoading] = useState(false)
    const [tip, setTip] = useState<React.ReactNode | null>(null)
    const language = useAtomValue(languageAtom)

    const onInputChange = (value: string) => {
        setLoading(false)
        setTip(null)
        setSettingsEdit({ ...settingsEdit, licenseKey: value })
    }

    const activate = async () => {
        setLoading(true)
        try {
            const result = await premiumActions.activate(settingsEdit.licenseKey || '')
            if (!result.valid) {
                switch (result.error) {
                    case 'reached_activation_limit':
                        setTip(
                            <Box className='text-red-500'>
                                <Trans i18nKey="This license key has reached the activation limit, <a>click here</a> to manage license and devices to deactivate old devices."
                                    components={{ a: <a href={`https://chatboxai.app/redirect_app/manage_license/${language}`} target='_blank' rel='noreferrer' /> }}
                                />
                            </Box>
                        )
                        break;
                    case 'not_found':
                        setTip(
                            <Box className='text-red-500'>
                                {t('License not found, please check your license key')}
                            </Box>
                        )
                        break;
                    case 'expired':
                        setTip(
                            <Box className='text-red-500'>
                                {t('License expired, please check your license key')}
                            </Box>
                        )
                        break;
                }
            }
        } catch (e) {
            setTip(
                <Box className='text-red-500'>
                    {t('Failed to activate license, please check your license key and network connection')}
                    <br />
                    {(e as any).message}
                </Box>
            )
        }
        setLoading(false)
    }

    return (
        <Box>
            <Box>
                <PasswordTextField
                    label={t('Chatbox AI License')}
                    value={settingsEdit.licenseKey || ''}
                    setValue={onInputChange}
                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
                    disabled={activated}
                />
                <Box>
                    <ButtonGroup
                        disabled={loading}
                        sx={{ display: 'block', marginBottom: '15px' }}
                    >
                        {
                            activated && (
                                <>
                                    <span className='text-green-700 text-xs mr-2'>{t('License Activated')}</span>
                                    <Button variant='text' onClick={() => {
                                        premiumActions.deactivate()
                                        trackingEvent('click_deactivate_license_button', { event_category: 'user' })
                                    }}>
                                        {t('clean')}({t('Deactivate')})
                                    </Button>
                                </>
                            )
                        }
                        {
                            !activated && (
                                <Button variant={settingsEdit.licenseKey ? 'outlined' : "text"} onClick={activate}>
                                    {loading ? t('Activating...') : t('Activate License')}
                                </Button>
                            )
                        }
                    </ButtonGroup>
                </Box>
                {activated && (
                    <ChatboxAIModelSelect
                        value={settingsEdit.chatboxAIModel}
                        onChange={(v) => setSettingsEdit({ ...settingsEdit, chatboxAIModel: v })}
                    />
                )}
                <DetailCard licenseKey={settingsEdit.licenseKey} activated={activated} />
            </Box>
        </Box>
    )
}

// 详细信息卡片
function DetailCard(props: { licenseKey?: string, activated: boolean }) {
    const { licenseKey, activated } = props
    const { t } = useTranslation()
    return (
        <Card sx={{ marginTop: '20px', padding: '10px 14px' }} elevation={3}>
            {
                activated && (
                    <Box>
                        <Box className='mb-2'>
                            <ActivedButtonGroup />
                        </Box>
                        <LicenseDetail licenseKey={licenseKey} />
                    </Box>
                )
            }
            {
                !activated && (<InactivedButtonGroup />)
            }
            <Box className='mt-2' sx={{ opacity: activated ? '0.5' : undefined }}>
                <Typography>
                    {t('Chatbox AI offers a user-friendly AI solution to help you enhance productivity')}
                </Typography>
                <Box>
                    {[
                        t('Smartest AI-Powered Services for Rapid Access'),
                        t('Vision, Drawing, File Understanding and more'),
                        t('Hassle-free setup'),
                        t('Ideal for work and study')
                    ].map(
                        (item) => (
                            <Box key={item} sx={{ display: 'flex', margin: '4px 0' }}>
                                <CheckCircleOutlineIcon color={activated ? 'success' : 'action'} />
                                <b style={{ marginLeft: '5px' }}>{item}</b>
                            </Box>
                        )
                    )}
                </Box>
            </Box>
        </Card>
    )
}

function ActivedButtonGroup() {
    const { t } = useTranslation()
    const language = useAtomValue(languageAtom)
    return (
        <Box sx={{ marginTop: '10px' }}>
            <Button
                variant="outlined"
                sx={{ marginRight: '10px' }}
                onClick={() => {
                    platform.openLink(`https://chatboxai.app/redirect_app/manage_license/${language}`)
                    trackingEvent('click_manage_license_button', { event_category: 'user' })
                }}
            >
                {t('Manage License and Devices')}
            </Button>
            <Button
                variant='outlined'
                // color='warning'
                sx={{ marginRight: '10px' }}
                onClick={() => {
                    premiumActions.deactivate()
                    trackingEvent('click_deactivate_license_button', { event_category: 'user' })
                }}
            >
                {t('Deactivate')}
            </Button>
            <Button
                variant="text"
                sx={{ marginRight: '10px' }}
                onClick={() => {
                    platform.openLink('https://chatboxai.app/redirect_app/view_more_plans')
                    trackingEvent('click_view_more_plans_button', { event_category: 'user' })
                }}
            >
                {t('View More Plans')}
            </Button>
        </Box>
    )
}

function InactivedButtonGroup() {
    const { t } = useTranslation()
    const language = useAtomValue(languageAtom)
    return (
        <Box sx={{ marginTop: '10px' }}>
            <Button
                variant="outlined"
                sx={{ marginRight: '10px' }}
                onClick={() => {
                    platform.openLink('https://chatboxai.app/redirect_app/get_license')
                    trackingEvent('click_get_license_button', { event_category: 'user' })
                }}
            >
                {t('Get License')}
            </Button>
            <Button
                variant="text"
                sx={{ marginRight: '10px' }}
                onClick={() => {
                    platform.openLink(`https://chatboxai.app/redirect_app/manage_license/${language}`)
                    trackingEvent('click_retrieve_license_button', { event_category: 'user' })
                }}
            >
                {t('Retrieve License')}
            </Button>
        </Box>
    )
}

function BorderLinearProgress(props: LinearProgressProps) {
    return (<_BorderLinearProgress variant="determinate" {...props}
        color={
            props.value !== undefined && props.value <= 10
                ? 'error'
                : props.value !== undefined && props.value <= 20 ? 'warning' : 'inherit'
        }
    />)
}

const _BorderLinearProgress = styled(LinearProgress)(({ theme }) => ({
    height: 5,
    borderRadius: 5,
    [`&.${linearProgressClasses.colorPrimary}`]: {
    },
    [`& .${linearProgressClasses.bar}`]: {
        borderRadius: 5,
    },
}));

function LicenseDetail(props: { licenseKey?: string }) {
    const { licenseKey } = props
    const { t } = useTranslation()
    const [expanded, setExpanded] = useState<boolean>(false);
    const [licenseDetail, setLicenseDetail] = useState<ChatboxAILicenseDetail | null>(null)
    const onChange = (event: React.SyntheticEvent, newExpanded: boolean) => {
        setExpanded(newExpanded);
        if (!newExpanded) {
            setLicenseDetail(null)
            return
        }
        if (!licenseKey) {
            return
        }
        remote.getLicenseDetailRealtime({ licenseKey }).then((res) => {
            if (res) {
                setTimeout(() => {
                    setLicenseDetail(res)
                }, 200)
            }
        })
    }
    return (
        <Accordion expanded={expanded} onChange={onChange} className='mb-4'>
            <AccordionSummary>
                <div>
                    <span className='font-bold text-green-700 block'>
                        {t('License Activated')}!
                    </span>
                    <span className='opacity-50 text-xs font-light block'>
                        {t('Click to view license details and quota usage')}
                    </span>
                </div>
            </AccordionSummary>
            <AccordionDetails>
                {
                    licenseDetail ? (
                        <>
                            <Box className='grid grid-cols-2'>
                                <Tooltip title={`${(licenseDetail.remaining_quota_35 * 100).toFixed(2)} %`}>
                                    <Box className='mr-4 mb-4' >
                                        <Typography className=''>
                                            {t('Chatbox AI 3.5 Quota')}
                                        </Typography>
                                        <BorderLinearProgress className='mt-1' variant="determinate"
                                            value={Math.floor(licenseDetail.remaining_quota_35 * 100)} />
                                    </Box>
                                </Tooltip>
                                <Tooltip title={`${(licenseDetail.remaining_quota_4 * 100).toFixed(2)} %`}>
                                    <Box className='mr-4 mb-4' >
                                        <Typography className=''>
                                            {t('Chatbox AI 4 Quota')}
                                        </Typography>
                                        <BorderLinearProgress className='mt-1' variant="determinate"
                                            value={Math.floor(licenseDetail.remaining_quota_4 * 100)} />
                                    </Box>
                                </Tooltip>
                                <Tooltip title={`${licenseDetail.image_total_quota - licenseDetail.image_used_count} / ${licenseDetail.image_total_quota}`}>
                                    <Box className='mr-4 mb-4' >
                                        <Typography >
                                            {t('Chatbox AI Image Quota')}
                                        </Typography>
                                        <BorderLinearProgress className='mt-1' variant="determinate"
                                            value={Math.floor(licenseDetail.remaining_quota_image * 100)} />
                                    </Box>
                                </Tooltip>
                            </Box>
                            <Box className='grid grid-cols-2'>
                                <Box className='mr-4 mb-4' >
                                    <Typography className=''>
                                        {t('Quota Reset')}
                                    </Typography>
                                    <Typography className=''><span className='font-bold'>{
                                        new Date(licenseDetail.token_refreshed_time).toLocaleDateString()
                                    }</span></Typography>
                                </Box>
                                {
                                    licenseDetail.token_expire_time && (
                                        <Box className='mr-4 mb-4' >
                                            <Typography className=''>
                                                {t('License Expiry')}
                                            </Typography>
                                            <Typography className=''><span className='font-bold'>{
                                                new Date(licenseDetail.token_expire_time).toLocaleDateString()
                                            }</span></Typography>
                                        </Box>
                                    )
                                }
                                <Box className='mr-4 mb-4' >
                                    <Typography className=''>
                                        {t('License Plan Overview')}
                                    </Typography>
                                    <Typography>
                                        <span className='font-bold'>
                                            {licenseDetail.name}
                                        </span>
                                    </Typography>
                                </Box>
                            </Box>
                        </>
                    ) : (
                        <Box className='flex items-center justify-center'>
                            <CircularProgress />
                        </Box>

                    )
                }
            </AccordionDetails>
        </Accordion>
    )
}