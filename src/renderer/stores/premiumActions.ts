import { useEffect } from 'react'
import * as remote from '../packages/remote'
import { getDefaultStore, useAtom } from 'jotai'
import { settingsAtom } from '../stores/atoms'
import platform from '../packages/platform'
import { FetchError } from 'ofetch'
import omit from 'lodash/omit'
import * as Sentry from '@sentry/react'
import { ModelProvider, Settings } from 'src/shared/types'

export function useAutoValidate() {
    const [settings, setSettings] = useAtom(settingsAtom)
    const clearValidatedData = () => {
        setSettings(settings => ({
            ...settings,
            licenseKey: '',
            licenseInstances: omit(settings.licenseInstances, settings.licenseKey || ''),
            licenseDetail: undefined,
        }))
    }
    useEffect(() => {
        ; (async () => {
            if (!settings.licenseKey || !settings.licenseInstances) {
                return
            }
            const instanceId = settings.licenseInstances[settings.licenseKey]
            if (!instanceId) {
                clearValidatedData()
                return
            }
            try {
                const result = await remote.validateLicense({
                    licenseKey: settings.licenseKey,
                    instanceId: instanceId,
                })
                if (!result.valid) {
                    clearValidatedData()
                    return
                }
            } catch (err) {
                if (
                    err instanceof FetchError
                    && err.status
                    && [401, 403, 404].includes(err.status)
                ) {
                    clearValidatedData()
                } else {
                    Sentry.captureException(err)
                }
            }
        })()
    }, [settings.licenseKey])
    if (!settings.licenseKey || !settings.licenseInstances) {
        return false
    }
    return !!settings.licenseInstances[settings.licenseKey]
}

export async function deactivate() {
    const store = getDefaultStore()
    const settings = store.get(settingsAtom)
    store.set(settingsAtom, (settings) => ({
        ...settings,
        licenseKey: '',
        licenseDetail: undefined,
        licenseInstances: omit(settings.licenseInstances, settings.licenseKey || ''),
    }))
    const licenseKey = settings.licenseKey || ''
    const licenseInstances = settings.licenseInstances || {}
    if (licenseKey && licenseInstances[licenseKey]) {
        await remote.deactivateLicense({
            licenseKey,
            instanceId: licenseInstances[licenseKey],
        })
    }
}

export async function activate(licenseKey: string) {
    const store = getDefaultStore()
    const settings = store.get(settingsAtom)
    if (settings.licenseKey) {
        await deactivate()
    }
    const result = await remote.activateLicense({
        licenseKey,
        instanceName: await platform.getInstanceName(),
    })
    if (!result.valid) {
        return result
    }
    const licenseDetail = await remote.getLicenseDetail({ licenseKey })
    store.set(settingsAtom, (settings) => {
        const newSettings: Settings = {
            ...settings,
            aiProvider: ModelProvider.ChatboxAI,
            licenseKey,
            licenseInstances: {
                ...(settings.licenseInstances || {}),
                [licenseKey]: result.instanceId,
            },
            licenseDetail: undefined,
        }
        if (licenseDetail) {
            newSettings.licenseDetail = licenseDetail
            if (!newSettings.chatboxAIModel) {
                newSettings.chatboxAIModel = licenseDetail.defaultModel
            }
        }
        return newSettings
    })
    return result
}
