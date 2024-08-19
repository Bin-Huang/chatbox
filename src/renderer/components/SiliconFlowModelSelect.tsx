import { Select, MenuItem, FormControl, InputLabel, TextField } from '@mui/material'
import { ModelSettings } from '../../shared/types'
import { useTranslation } from 'react-i18next'
import { models } from '../packages/models/siliconflow'

export interface Props {
    model: ModelSettings['model']
    siliconflowCustomModel: ModelSettings['openaiCustomModel']
    onChange(model: ModelSettings['model'], siliconflowCustomModel: ModelSettings['openaiCustomModel']): void
    className?: string
}

export default function SiliconFlowModelSelect(props: Props) {
    const { t } = useTranslation()
    return (
        <FormControl fullWidth variant="outlined" margin="dense" className={props.className}>
            <InputLabel htmlFor="model-select">{t('model')}</InputLabel>
            <Select
                label={t('model')}
                id="model-select"
                value={props.model}
                onChange={(e) => props.onChange(e.target.value as ModelSettings['model'], props.siliconflowCustomModel)}
            >
                {models.map((model) => (
                    <MenuItem key={model} value={model}>
                        {model}
                    </MenuItem>
                ))}
                <MenuItem key="custom-model" value={'custom-model'}>
                    {t('Custom Model')}
                </MenuItem>
            </Select>
            {props.model === 'custom-model' && (
                <TextField
                    margin="dense"
                    label={t('Custom Model Name')}
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={props.siliconflowCustomModel || ''}
                    onChange={(e) =>
                        props.onChange(props.model, e.target.value.trim())
                    }
                />
            )}
        </FormControl>
    )
}
