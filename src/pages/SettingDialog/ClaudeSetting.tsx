import { Box, Typography } from '@mui/material'
import { ModelSettings } from '../../shared/types'
import { useTranslation } from 'react-i18next'
import TemperatureSlider from '../../components/TemperatureSlider'
import PasswordTextField from '../../components/PasswordTextField'
import MaxContextMessageCountSlider from '../../components/MaxContextMessageCountSlider'
import TextFieldReset from '@/components/TextFieldReset'
import { Accordion, AccordionSummary, AccordionDetails } from '../../components/Accordion'
import { useAtomValue } from 'jotai'
import SimpleSelect from '../../components/SimpleSelect'
import { ClaudeModel, claudeModels } from '../../packages/models/claude'

interface ModelConfigProps {
    settingsEdit: ModelSettings
    setSettingsEdit: (settings: ModelSettings) => void
}

export default function ClaudeSetting(props: ModelConfigProps) {
    const { settingsEdit, setSettingsEdit } = props
    const { t } = useTranslation()
    return (
        <Box>
            <PasswordTextField
                label={t('api key')}
                value={settingsEdit.claudeApiKey}
                setValue={(value) => {
                    setSettingsEdit({ ...settingsEdit, claudeApiKey: value })
                }}
            />
            <TextFieldReset
                margin="dense"
                label={t('api host')}
                type="text"
                fullWidth
                variant="outlined"
                value={settingsEdit.claudeApiHost}
                placeholder="https://api.anthropic.com"
                defaultValue="https://api.anthropic.com"
                onValueChange={(value) => {
                    value = value.trim()
                    if (value.length > 4 && !value.startsWith('http')) {
                        value = 'https://' + value
                    }
                    setSettingsEdit({ ...settingsEdit, claudeApiHost: value })
                }}
            />
            <SimpleSelect
                label={t('model')}
                value={settingsEdit.claudeModel}
                options={claudeModels.map((model) => ({
                    value: model,
                    label: model,
                }))}
                onChange={(value) =>
                    setSettingsEdit({ ...settingsEdit, claudeModel: value as ModelSettings['claudeModel'] })
                }
            />
            <Accordion>
                <AccordionSummary aria-controls="panel1a-content">
                    <Typography>
                        {t('model')} & {t('token')}{' '}
                    </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <MaxContextMessageCountSlider
                        value={settingsEdit.openaiMaxContextMessageCount}
                        onChange={(v) => setSettingsEdit({ ...settingsEdit, openaiMaxContextMessageCount: v })}
                    />
                    <TemperatureSlider
                        value={settingsEdit.temperature}
                        onChange={(v) => setSettingsEdit({ ...settingsEdit, temperature: v })}
                    />
                </AccordionDetails>
            </Accordion>
        </Box>
    )
}
