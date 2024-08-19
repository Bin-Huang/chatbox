import { Typography, Box } from '@mui/material'
import { ModelSettings } from '../../../shared/types'
import { useTranslation } from 'react-i18next'
import { Accordion, AccordionSummary, AccordionDetails } from '../../components/Accordion'
import TemperatureSlider from '../../components/TemperatureSlider'
import TopPSlider from '../../components/TopPSlider'
import PasswordTextField from '../../components/PasswordTextField'
import MaxContextMessageCountSlider from '../../components/MaxContextMessageCountSlider'
import SiliconFlowModelSelect from '../../components/SiliconFlowModelSelect'

interface ModelConfigProps {
    settingsEdit: ModelSettings
    setSettingsEdit: (settings: ModelSettings) => void
}

export default function SiliconFlowSetting(props: ModelConfigProps) {
    const { settingsEdit, setSettingsEdit } = props
    const { t } = useTranslation()
    return (
        <Box>
            <PasswordTextField
                label={t('api key')}
                value={settingsEdit.siliconCloudKey}
                setValue={(value) => {
                    setSettingsEdit({ ...settingsEdit, siliconCloudKey: value })
                }}
                placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
            />
            <Accordion>
                <AccordionSummary aria-controls="panel1a-content">
                    <Typography>
                        {t('model')} & {t('token')}{' '}
                    </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <SiliconFlowModelSelect
                        model={settingsEdit.siliconCloudModel}
                        siliconflowCustomModel={settingsEdit.openaiCustomModel}
                        onChange={(siliconCloudModel, openaiCustomModel) =>
                            setSettingsEdit({ ...settingsEdit, siliconCloudModel, openaiCustomModel })
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
