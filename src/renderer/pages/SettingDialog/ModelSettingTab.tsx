import { Divider, Box } from '@mui/material'
import { ModelProvider, ModelSettings } from '../../../shared/types'
import OpenAISetting from './OpenAISetting'
import ChatboxAISetting from './ChatboxAISetting'
import AIProviderSelect from '../../components/AIProviderSelect'
import { OllamaHostInput, OllamaModelSelect } from './OllamaSetting'
import SiliconFlowSetting from './SiliconFlowSetting'
import MaxContextMessageCountSlider from '@/components/MaxContextMessageCountSlider'
import TemperatureSlider from '@/components/TemperatureSlider'

interface ModelConfigProps {
    settingsEdit: ModelSettings
    setSettingsEdit: (settings: ModelSettings) => void
}

export default function ModelSettingTab(props: ModelConfigProps) {
    const { settingsEdit, setSettingsEdit } = props
    return (
        <Box>
            <AIProviderSelect
                settings={settingsEdit}
                setSettings={setSettingsEdit}
            />
            <Divider sx={{ marginTop: '10px', marginBottom: '24px' }} />
            {settingsEdit.aiProvider === ModelProvider.OpenAI && (
                <OpenAISetting settingsEdit={settingsEdit} setSettingsEdit={setSettingsEdit} />
            )}
            {settingsEdit.aiProvider === ModelProvider.ChatboxAI && (
                <ChatboxAISetting settingsEdit={settingsEdit} setSettingsEdit={setSettingsEdit} />
            )}
            {settingsEdit.aiProvider === ModelProvider.Ollama && (
                <>
                    <OllamaHostInput
                        ollamaHost={settingsEdit.ollamaHost}
                        setOllamaHost={(v) => setSettingsEdit({ ...settingsEdit, ollamaHost: v })}
                    />
                    <OllamaModelSelect
                        ollamaModel={settingsEdit.ollamaModel}
                        setOlamaModel={(v) => setSettingsEdit({ ...settingsEdit, ollamaModel: v })}
                        ollamaHost={settingsEdit.ollamaHost}
                    />
                    <MaxContextMessageCountSlider
                        value={settingsEdit.openaiMaxContextMessageCount}
                        onChange={(v) => setSettingsEdit({ ...settingsEdit, openaiMaxContextMessageCount: v })}
                    />
                    <TemperatureSlider
                        value={settingsEdit.temperature}
                        onChange={(v) => setSettingsEdit({ ...settingsEdit, temperature: v })}
                    />
                </>
            )}
             {settingsEdit.aiProvider === ModelProvider.SiliconFlow && (
                <SiliconFlowSetting settingsEdit={settingsEdit} setSettingsEdit={setSettingsEdit} />
            )}
        </Box>
    )
}
