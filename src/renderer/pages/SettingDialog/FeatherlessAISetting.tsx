import { Typography, Box } from '@mui/material'
import { ModelSettings } from '../../../shared/types'
import { useTranslation } from 'react-i18next'
import { Accordion, AccordionSummary, AccordionDetails } from '../../components/Accordion'
import TemperatureSlider from '../../components/TemperatureSlider'
import TopPSlider from '../../components/TopPSlider'
import PasswordTextField from '../../components/PasswordTextField'
import MaxContextMessageCountSlider from '../../components/MaxContextMessageCountSlider'
import FeatherlessModelSelect from '../../components/FeatherlessModelSelect'
import TextFieldReset from '@/components/TextFieldReset'

interface ModelConfigProps {
    settingsEdit: ModelSettings
    setSettingsEdit: (settings: ModelSettings) => void
}

export default function FeatherlessAISetting(props: ModelConfigProps) {
    const { settingsEdit, setSettingsEdit } = props
    const { t } = useTranslation()
    return (
        <Box>
            <PasswordTextField
                label={t('api key')}
                value={settingsEdit.featherlessKey}
                setValue={(value) => {
                    setSettingsEdit({ ...settingsEdit, featherlessKey: value })
                }}
                placeholder="rc-xxxxxxxxxxxxxxxxxxxxxxxx"
            />
            <>
                <TextFieldReset
                    margin="dense"
                    label={t('api host')}
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={settingsEdit.apiHost}
                    placeholder="https://api.featherless.ai"
                    defaultValue="https://api.featherless.ai"
                    onValueChange={(value) => {
                        value = value.trim()
                        if (value.length > 4 && !value.startsWith('http')) {
                            value = 'https://' + value
                        }
                        setSettingsEdit({ ...settingsEdit, apiHost: value })
                    }}
                />
            </>
            <Accordion>
                <AccordionSummary aria-controls="panel1a-content">
                    <Typography>
                        {t('featherlessModel')} & {t('token')}{' '}
                    </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <FeatherlessModelSelect
                        model={settingsEdit.featherlessModel}
                        featherlessCustomModel={settingsEdit.featherlessCustomModel}
                        onChange={(featherlessModel, featherlessCustomModel) =>
                            setSettingsEdit({ ...settingsEdit, featherlessModel, featherlessCustomModel })
                        }
                    />

                    <TemperatureSlider
                        value={settingsEdit.temperature}
                        onChange={(value) => setSettingsEdit({ ...settingsEdit, temperature: value })}
                    />
                    <TopPSlider
                        topP={settingsEdit.topP}
                        setTopP={(v) => setSettingsEdit({ ...settingsEdit, topP: v })}
                    />
                    <MaxContextMessageCountSlider
                        value={settingsEdit.openaiMaxContextMessageCount}
                        onChange={(v) => setSettingsEdit({ ...settingsEdit, openaiMaxContextMessageCount: v })}
                    />
                </AccordionDetails>
            </Accordion>
        </Box>
    )
}
