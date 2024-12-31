import { Typography, Box } from '@mui/material'
import { ModelSettings } from '../../../shared/types'
import { useTranslation } from 'react-i18next'
import { Accordion, AccordionSummary, AccordionDetails } from '../../components/Accordion'
import TemperatureSlider from '../../components/TemperatureSlider'
import PasswordTextField from '../../components/PasswordTextField'
import TextFieldReset from '@/components/TextFieldReset'
import GeminiModelSelect from '../../components/GeminiModelSelect'

interface ModelConfigProps {
    settingsEdit: ModelSettings
    setSettingsEdit: (settings: ModelSettings) => void
}

export default function GeminiSetting(props: ModelConfigProps) {
    const { settingsEdit, setSettingsEdit } = props
    const { t } = useTranslation()
    return (
        <Box>
            <PasswordTextField
                label={t('api key')}
                value={settingsEdit.geminiKey}
                setValue={(value) => {
                    setSettingsEdit({ ...settingsEdit, geminiKey: value })
                }}
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
            />
            <>
                <TextFieldReset
                    margin="dense"
                    label={t('api host')}
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={settingsEdit.geminiHost}
                    placeholder="https://generativelanguage.googleapis.com"
                    defaultValue='https://generativelanguage.googleapis.com'
                    onValueChange={(value) => {
                        value = value.trim()
                        if (value.length > 4 && !value.startsWith('http')) {
                            value = 'https://' + value
                        }
                        setSettingsEdit({ ...settingsEdit, geminiHost: value })
                    }}
                />
            </>
            <Accordion>
                <AccordionSummary aria-controls="panel1a-content">
                    <Typography>
                        {t('model')} & {t('token')}{' '}
                    </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <GeminiModelSelect
                        model={settingsEdit.geminiModel}
                        geminiCustomModel={settingsEdit.geminiCustomModel}
                        onChange={(model, geminiCustomModel) =>
                            setSettingsEdit({ ...settingsEdit, geminiModel: model, geminiCustomModel })
                        }
                        apiHost={settingsEdit.geminiHost}
                        apiKey={settingsEdit.geminiKey}
                    />

                    <TemperatureSlider
                        value={settingsEdit.temperature}
                        onChange={(value) => setSettingsEdit({ ...settingsEdit, temperature: value })}
                    />
                </AccordionDetails>
            </Accordion>
        </Box>
    )
} 