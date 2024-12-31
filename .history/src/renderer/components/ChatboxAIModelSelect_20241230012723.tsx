import { Select, MenuItem, FormControl, InputLabel, TextField } from '@mui/material'
import { ChatboxAIModel, ModelSettings } from '../../shared/types'
import { useTranslation } from 'react-i18next'

export interface Props {
    value?: ChatboxAIModel | 'custom-model'
    customModel?: string
    onChange(value?: ChatboxAIModel | 'custom-model', customModel?: string): void
    className?: string
}

const chatboxAIModelLabelHash: { [key: string]: string } = {
    'chatboxai-3.5': 'Chatbox AI 3.5',
    'chatboxai-4': 'Chatbox AI 4',
}

export default function ChatboxAIModelSelect(props: Props) {
    const { t } = useTranslation()
    return (
        <FormControl fullWidth variant="outlined" margin="dense" className={props.className}>
            <InputLabel htmlFor="model-select">{t('model')}</InputLabel>
            <Select
                label={t('model')}
                id="model-select"
                value={props.value || 'chatboxai-3.5'}
                onChange={(e) => props.onChange(e.target.value as ChatboxAIModel | 'custom-model', props.customModel)}
            >
                {Object.entries(chatboxAIModelLabelHash).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                        {label}
                    </MenuItem>
                ))}
                <MenuItem key="custom-model" value={'custom-model'}>
                    {t('Custom Model')}
                </MenuItem>
            </Select>
            {props.value === 'custom-model' && (
                <TextField
                    margin="dense"
                    label={t('Custom Model Name')}
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={props.customModel || ''}
                    onChange={(e) =>
                        props.onChange(props.value, e.target.value.trim())
                    }
                />
            )}
        </FormControl>
    )
}
