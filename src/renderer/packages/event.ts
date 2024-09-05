import platform from '@/packages/platform'
import { allowReportingAndTrackingAtom } from '@/stores/atoms'
import { getDefaultStore } from 'jotai'

export function trackingEvent(name: string, params: { [key: string]: string } = {}) {
    const store = getDefaultStore()
    // ONLY track when user allow
    const allowReportingAndTracking = store.get(allowReportingAndTrackingAtom)
    if (!allowReportingAndTracking) {
        return
    }
    platform.trackingEvent(name, params)
}
