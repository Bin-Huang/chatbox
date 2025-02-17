import { Alert, FormControl, InputLabel, MenuItem, Select } from '@mui/material'
import { ModelSettings } from '../../shared/types'
import { Trans, useTranslation } from 'react-i18next'
import TextFieldReset from '@/components/TextFieldReset'
import { useEffect, useState } from 'react'
import LMStudio from '@/packages/models/lmstudio'
import platform from '@/packages/platform'
import { useAtomValue } from 'jotai'
import { languageAtom } from '@/stores/atoms'

export function LMStudioHostInput(props: {
    LMStudioHost: string
    setLMStudioHost: (host: string) => void
    className?: string
}) {
    const { t } = useTranslation()
    const language = useAtomValue(languageAtom)
    return (
        <>
            <TextFieldReset
                label={t('api host')}
                value={props.LMStudioHost}
                defaultValue="http://localhost:1234"
                onValueChange={props.setLMStudioHost}
                fullWidth
                className={props.className}
            />
            {props.LMStudioHost &&
                props.LMStudioHost.length > 16 &&
                !props.LMStudioHost.includes('localhost') &&
                !props.LMStudioHost.includes('127.0.0.1') && (
                    <Alert icon={false} severity="info" className="my-4">
                        <Trans
                            i18nKey="Please ensure that the Remote LM Studio Service is able to connect remotely. For more details, refer to <a>this tutorial</a>."
                            components={{
                                a: (
                                    <a
                                        className="cursor-pointer font-bold"
                                        onClick={() => {
                                            platform.openLink(
                                                `https://chatboxai.app/redirect_app/lm_studio_guide/${language}`,
                                            )
                                        }}
                                    ></a>
                                ),
                            }}
                        />
                    </Alert>
                )}
        </>
    )
}

export function LMStudioModelSelect(props: {
    LMStudioModel: ModelSettings['lmStudioModel']
    setLMStudioModel: (model: ModelSettings['lmStudioModel']) => void
    LMStudioHost: string
    className?: string
}) {
    const { t } = useTranslation()
    const [models, setModels] = useState<string[]>([])
    useEffect(() => {
        const model = new LMStudio({
            lmStudioHost: props.LMStudioHost,
            lmStudioModel: props.LMStudioModel,
            temperature: 0.5,
        })
        model.listModels().then((models) => {
            setModels(models)
        })
        if (props.LMStudioModel && models.length > 0 && !models.includes(props.LMStudioModel)) {
            props.setLMStudioModel(models[0])
        }
    }, [props.LMStudioHost])
    return (
        <FormControl fullWidth variant="outlined" margin="dense" className={props.className}>
            <InputLabel htmlFor="LMStudio-model-select">{t('model')}</InputLabel>
            <Select
                label={t('model')}
                id="LMStudio-model-select"
                value={props.LMStudioModel}
                onChange={(e) => props.setLMStudioModel(e.target.value)}
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
