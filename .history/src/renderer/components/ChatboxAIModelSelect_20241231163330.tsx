import { Select, MenuItem, FormControl, InputLabel, TextField } from '@mui/material'
import { ChatboxAIModel, ModelSettings } from '../../shared/types'
import { useTranslation } from 'react-i18next'
import { useState, useEffect } from 'react'
import ChatboxAI from '../packages/models/chatboxai'
import { API_ORIGIN } from '../packages/remote'

export interface Props {
    value?: ChatboxAIModel | 'custom-model'
    customModel?: string
    onChange(value?: ChatboxAIModel | 'custom-model', customModel?: string): void
    className?: string
    licenseKey?: string
}

export default function ChatboxAIModelSelect(props: Props) {
    const { t } = useTranslation()
    const [models, setModels] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchModels = async () => {
            if (!props.licenseKey) {
                setLoading(false)
                return
            }
            try {
                const client = new ChatboxAI({
                    licenseKey: props.licenseKey,
                    language: 'en',
                    temperature: 0.7,
                }, {
                    uuid: 'test',
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
    }, [props.licenseKey])

    return (
        <FormControl fullWidth variant="outlined" margin="dense" className={props.className}>
            <InputLabel htmlFor="model-select">{t('model')}</InputLabel>
            <Select
                label={t('model')}
                id="model-select"
                value={props.value || 'chatboxai-3.5'}
                onChange={(e) => props.onChange(e.target.value as ChatboxAIModel | 'custom-model', props.customModel)}
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
