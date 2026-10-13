import { useCallback, useSyncExternalStore } from 'react'
import { rendererApplication } from '@/app/renderer-application'
import {
  getGenerationStopStatus,
  messageStopOperationKey,
  sessionStopOperationKey,
  startGenerationStop,
  subscribeGenerationStopOperations,
} from '@/stores/generationStopOperations'
import { stopAllMessageGenerations, stopMessageGeneration } from '@/stores/session/generation-cancellation'

export type { GenerationStopStatus } from '@/stores/generationStopOperations'

function useStopOperation(key: string | undefined, run: () => Promise<void>, onWatchdog?: () => void) {
  const status = useSyncExternalStore(
    subscribeGenerationStopOperations,
    () => getGenerationStopStatus(key),
    () => getGenerationStopStatus(key)
  )

  const requestStop = useCallback((): boolean => {
    if (!key) return false
    void startGenerationStop(key, run, { onWatchdog })
    return true
  }, [key, run, onWatchdog])

  const stopAndWait = useCallback((): Promise<void> => {
    if (!key) return Promise.resolve()
    return startGenerationStop(key, run, { onWatchdog })
  }, [key, run, onWatchdog])

  return { requestStop, status, stopAndWait }
}

export function useGenerationStop(
  sessionId: string | undefined,
  stop: (sessionId: string) => Promise<void> = stopAllMessageGenerations
) {
  const run = useCallback(() => (sessionId ? stop(sessionId) : Promise.resolve()), [sessionId, stop])
  // Watchdog recovery (issue #3959): if the stop pipeline never settles, drop
  // the stuck generation runtimes so the session cannot stay permanently
  // locked with nothing actually running.
  const onWatchdog = useCallback(() => {
    if (sessionId) rendererApplication.generationRuntime.clear(sessionId)
  }, [sessionId])
  return useStopOperation(sessionId ? sessionStopOperationKey(sessionId) : undefined, run, onWatchdog)
}

export function useMessageGenerationStop(
  sessionId: string,
  messageId: string,
  stop: (sessionId: string, messageId: string) => Promise<void> = stopMessageGeneration
) {
  const run = useCallback(() => stop(sessionId, messageId), [messageId, sessionId, stop])
  const onWatchdog = useCallback(() => {
    rendererApplication.generationRuntime.clear(sessionId, messageId)
  }, [sessionId, messageId])
  return useStopOperation(messageStopOperationKey(sessionId, messageId), run, onWatchdog)
}
