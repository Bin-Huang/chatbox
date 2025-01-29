import { useEffect } from 'react'
import { loadSessionsDump } from '@/packages/sync-sessions'
import { replaceSessionsFromBackend } from '@/stores/sessionActions'

export function useLoadSessions() {
    useEffect(() => {
        ;(async () => {
            try {
                replaceSessionsFromBackend(await loadSessionsDump())
            } catch (e) {
                console.error(e)
            }
        })()
    }, [])
}
