import {
    Typography,
    Box,
} from '@mui/material'
import { Settings } from '../../../shared/types'
import { useTranslation } from 'react-i18next'
import { Accordion, AccordionSummary, AccordionDetails } from '../../components/Accordion'
import TextFieldReset from '../../components/TextFieldReset'
import { useAtom } from 'jotai'
import * as atoms from '../../stores/atoms'

interface Props {
    settingsEdit: Settings
    setSettingsEdit: (settings: Settings) => void
    onCancel: () => void
}

export default function AdvancedSettingTab(props: Props) {
    const { settingsEdit, setSettingsEdit } = props
    const { t } = useTranslation()
    return (
        <Box>
            <Accordion>
                <AccordionSummary aria-controls="panel1a-content">
                    <Typography>{t('Network Proxy')}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <TextFieldReset
                        label={t('Proxy Address')}
                        value={settingsEdit.proxy || ''}
                        onValueChange={(value) => {
                            setSettingsEdit({ ...settingsEdit, proxy: value.trim() })
                        }}
                        placeholder="socks5://127.0.0.1:6153"
                        fullWidth
                        margin="dense"
                        variant="outlined"
                    />
                </AccordionDetails>
            </Accordion>
            <Accordion>
                <AccordionSummary aria-controls="panel1a-content">
                    <Typography>{t('Error Reporting')}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <AnalyticsSetting />
                </AccordionDetails>
            </Accordion>
        </Box>
    )
}

export function AnalyticsSetting() {
    const { t } = useTranslation()
    return (
        <Box>
            <div>
                <p className='opacity-70'>
                    {t('Chatbox respects your privacy and only uploads anonymous error data and events when necessary. You can change your preferences at any time in the settings.')}
                </p>
            </div>
            <div className='my-2'>
                <AllowReportingAndTrackingCheckbox />
            </div>
        </Box>
    )
}

export function AllowReportingAndTrackingCheckbox(props: {
    className?: string
}) {
    const { t } = useTranslation()
    const [allowReportingAndTracking, setAllowReportingAndTracking] = useAtom(atoms.allowReportingAndTrackingAtom)
    return (
        <span className={props.className}>
            <input
                type='checkbox'
                checked={allowReportingAndTracking}
                onChange={(e) => setAllowReportingAndTracking(e.target.checked)}
            />
            {t('Enable optional anonymous reporting of crash and event data')}
        </span>
    )
}
