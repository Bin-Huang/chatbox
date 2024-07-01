import { Alert, FormControl, InputLabel, MenuItem, Select } from '@mui/material'
import { ModelSettings } from '../../../shared/types'
import { Trans, useTranslation } from 'react-i18next'
import TextFieldReset from '@/components/TextFieldReset'
import { useEffect, useState } from 'react'
import Ollama from '@/packages/models/ollama'
import platform from '@/packages/platform'
import { useAtomValue } from 'jotai'
import { languageAtom } from '@/stores/atoms'

export function OllamaHostInput(props: {
    ollamaHost: string
    setOllamaHost: (host: string) => void
    className?: string
}) {
    const { t } = useTranslation()
    const language = useAtomValue(languageAtom)
    return (
        <>
            <TextFieldReset
                label={t('api host')}
                value={props.ollamaHost}
                defaultValue='http://localhost:11434'
                onValueChange={props.setOllamaHost}
                fullWidth
                className={props.className}
            />
            {
                props.ollamaHost
                && props.ollamaHost.length > 16
                && !props.ollamaHost.includes('localhost')
                && !props.ollamaHost.includes('127.0.0.1') && (
                    <Alert icon={false} severity='info' className='my-4'>
                        <Trans i18nKey='Please ensure that the Remote Ollama Service is able to connect remotely. For more details, refer to <a>this tutorial</a>.'
                            components={{
                                a: <a className='cursor-pointer font-bold' onClick={() => {
                                    platform.openLink(`https://chatboxai.app/redirect_app/ollama_guide/${language}`)
                                }}></a>,
                            }}
                        />
                    </Alert>
                )
            }
        </>
    )
}

export function OllamaModelSelect(props: {
    ollamaModel: ModelSettings['ollamaModel']
    setOlamaModel: (model: ModelSettings['ollamaModel']) => void
    ollamaHost: string
    className?: string
}) {
    const { t } = useTranslation()
    const [models, setModels] = useState<string[]>([])
    useEffect(() => {
        const model = new Ollama({
            ollamaHost: props.ollamaHost,
            ollamaModel: props.ollamaModel,
            temperature: 0.5,
        })
        model.listModels().then((models) => {
            setModels(models)
        })
        if (props.ollamaModel && models.length > 0 && !models.includes(props.ollamaModel)) {
            props.setOlamaModel(models[0])
        }
    }, [props.ollamaHost])
    return (
        <FormControl fullWidth variant="outlined" margin="dense" className={props.className}>
            <InputLabel htmlFor="ollama-model-select">{t('model')}</InputLabel>
            <Select
                label={t('model')}
                id="ollama-model-select"
                value={props.ollamaModel}
                onChange={(e) =>
                    props.setOlamaModel(e.target.value)
                }
            >
                {models.map((model) => (
                    <MenuItem key={model} value={model}>
                        {model}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    )
}
