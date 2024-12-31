import { Select, MenuItem, FormControl, InputLabel, TextField } from '@mui/material'
import { ModelSettings } from '../../shared/types'
import { useTranslation } from 'react-i18next'
import { useState, useEffect } from 'react'
import OpenAI from '../packages/models/openai'

export interface Props {
    model: ModelSettings['model']
    openaiCustomModel: ModelSettings['openaiCustomModel']
    onChange(model: ModelSettings['model'], openaiCustomModel: ModelSettings['openaiCustomModel']): void
    className?: string
    apiHost: string
    apiKey: string
}

export default function OpenAIModelSelect(props: Props) {
    const { t } = useTranslation()
    const [models, setModels] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchModels = async () => {
            if (!props.apiKey) {
                setLoading(false)
                return
            }
            try {
                const client = new OpenAI({
                    openaiKey: props.apiKey,
                    apiHost: props.apiHost,
                    model: props.model,
                    temperature: 0.7,
                    topP: 1,
                    openaiMaxContextMessageCount: 10000,
                })
                const modelList = await client.listModels()
                setModels(modelList)
                setError(null)
            } catch (e) {
                console.error('Failed to fetch models:', e)
                setError(t('Failed to fetch available models'))
            } finally {
                setLoading(false)
            }
        }
        fetchModels()
    }, [props.apiHost, props.apiKey])

    return (
        <FormControl fullWidth variant="outlined" margin="dense" className={props.className}>
            <InputLabel htmlFor="model-select">{t('model')}</InputLabel>
            <Select
                label={t('model')}
                id="model-select"
                value={props.model}
                onChange={(e) => props.onChange(e.target.value as ModelSettings['model'], props.openaiCustomModel)}
            >
                {loading ? (
                    <MenuItem disabled>{t('Loading models...')}</MenuItem>
                ) : error ? (
                    <MenuItem disabled>{error}</MenuItem>
                ) : (
                    <>
                        {models.map((model) => (
                            <MenuItem key={model} value={model}>
                                {model}
                            </MenuItem>
                        ))}
                        <MenuItem key="custom-model" value={'custom-model'}>
                            {t('Custom Model')}
                        </MenuItem>
                    </>
                )}
            </Select>
            {props.model === 'custom-model' && (
                <TextField
                    margin="dense"
                    label={t('Custom Model Name')}
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={props.openaiCustomModel || ''}
                    onChange={(e) =>
                        props.onChange(props.model, e.target.value.trim())
                    }
                />
            )}
        </FormControl>
    )
}
