import * as Sentry from '@sentry/react'

const regexp =
    /[a-zA-Z0-9_\u0392-\u03c9\u00c0-\u00ff\u0600-\u06ff\u0400-\u04ff]+|[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\uac00-\ud7af]+/g

export function countWord(data: string): number {
    try {
        data = typeof data === 'string' ? data : JSON.stringify(data)
        const matches = data.match(regexp)
        let totalCount = 0
        if (!matches) {
            return 0
        }
        for (let i = 0; i < matches.length; i++) {
            if (matches[i].charCodeAt(0) >= 0x4e00) {
                totalCount += matches[i].length
            } else {
                totalCount += 1
            }
        }
        return totalCount
    } catch (e) {
        Sentry.captureException(e)
        return -1
    }
}
