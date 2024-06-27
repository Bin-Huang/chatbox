import * as Sentry from '@sentry/react'
import copyToClipboardFallback from 'copy-to-clipboard'

export function copyToClipboard(text: string) {
    try {
        navigator?.clipboard?.writeText(text)
    } catch (e) {
        Sentry.captureException(e)
    }
    try {
        copyToClipboardFallback(text)
    } catch (e) {
        Sentry.captureException(e)
    }
}

const ua = navigator.userAgent

export const getOS = (): 'Windows' | 'Mac' | 'Linux' | 'Android' | 'iOS' | 'Unknown' => {
    if (ua.indexOf('Windows') > -1) {
        return 'Windows'
    }
    if (ua.indexOf('Mac') > -1) {
        return 'Mac'
    }
    if (ua.indexOf('Linux') > -1) {
        return 'Linux'
    }
    if (ua.indexOf('Android') > -1) {
        return 'Android'
    }
    if (ua.indexOf('iPhone') > -1) {
        return 'iOS'
    }
    if (ua.indexOf('iPad') > -1) {
        return 'iOS'
    }
    if (ua.indexOf('iPod') > -1) {
        return 'iOS'
    }
    return 'Unknown'
}
