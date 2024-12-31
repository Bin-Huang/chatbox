import { Select, MenuItem, FormControl, InputLabel, TextField } from '@mui/material'
import { ModelSettings } from '../../shared/types'
import { useTranslation } from 'react-i18next'
import { useState, useEffect } from 'react'
import Gemini from '../packages/models/gemini'

export interface Props {
    model: ModelSettings['geminiModel']
    geminiCustomModel: ModelSettings['geminiCustomModel']
    onChange(model: ModelSettings['geminiModel'], geminiCustomModel: ModelSettings['geminiCustomModel']): void
    className?: string
    apiHost: string
    apiKey: string
}

export default function GeminiModelSelect(props: Props) {
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
                const client = new Gemini({
                    geminiKey: props.apiKey,
                    apiHost: props.apiHost,
                    model: props.model,
                    temperature: 0.7,
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
                onChange={(e) => props.onChange(e.target.value as ModelSettings['geminiModel'], props.geminiCustomModel)}
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
                    value={props.geminiCustomModel || ''}
                    onChange={(e) =>
                        props.onChange(props.model, e.target.value.trim())
                    }
                />
            )}
        </FormControl>
    )
} 