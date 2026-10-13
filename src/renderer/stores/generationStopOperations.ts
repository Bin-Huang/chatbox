export type GenerationStopStatus = 'idle' | 'stopping' | 'failed'

type StopOperation = {
  status: Exclude<GenerationStopStatus, 'idle'>
  task?: Promise<void>
}

const operations = new Map<string, StopOperation>()
const listeners = new Set<() => void>()

export function sessionStopOperationKey(sessionId: string): string {
  return `session:${sessionId}`
}

export function messageStopOperationKey(sessionId: string, messageId: string): string {
  return `message:${sessionId}\u0000${messageId}`
}

function notifyListeners(): void {
  for (const listener of listeners) listener()
}

export function subscribeGenerationStopOperations(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getGenerationStopStatus(key: string | undefined): GenerationStopStatus {
  return (key && operations.get(key)?.status) || 'idle'
}

export interface GenerationStopOptions {
  /** How long a stop task may stay unsettled before the watchdog self-heals it. */
  watchdogMs?: number
  /** Called when the watchdog fires so the host can clear a wedged runtime. */
  onWatchdog?: () => void
}

/**
 * A stop that never settles (a tool call wedged on a leaked child, a
 * persistence write that never returns) must not poison the session forever:
 * the de-dup below returns the same pending promise to every later Stop/Retry,
 * so one dead task blocks them all (issue #3959). After this budget the
 * operation is dropped and the host's watchdog hook runs.
 */
const DEFAULT_STOP_WATCHDOG_MS = 15_000

export function startGenerationStop(
  key: string,
  run: () => Promise<void>,
  options: GenerationStopOptions = {}
): Promise<void> {
  const current = operations.get(key)
  if (current?.status === 'stopping' && current.task) return current.task

  const operation: StopOperation = { status: 'stopping' }
  operations.set(key, operation)
  notifyListeners()

  const watchdogMs = options.watchdogMs ?? DEFAULT_STOP_WATCHDOG_MS
  let watchdogHandle: ReturnType<typeof setTimeout> | undefined
  if (watchdogMs > 0) {
    watchdogHandle = setTimeout(() => {
      if (operations.get(key) !== operation || operation.status !== 'stopping') return
      operations.delete(key)
      notifyListeners()
      try {
        options.onWatchdog?.()
      } catch {
        // Recovery is best-effort and must never throw out of a timer.
      }
    }, watchdogMs)
  }
  const clearWatchdog = () => {
    if (watchdogHandle) clearTimeout(watchdogHandle)
  }

  let task: Promise<void>
  try {
    task = Promise.resolve(run())
  } catch (error) {
    task = Promise.reject(error)
  }
  operation.task = task
  void task.then(
    () => {
      clearWatchdog()
      clearGenerationStopOperation(key, operation)
    },
    () => {
      clearWatchdog()
      if (operations.get(key) !== operation) return
      operation.status = 'failed'
      operation.task = undefined
      notifyListeners()
    }
  )
  return task
}

function clearGenerationStopOperation(key: string, expected?: StopOperation): void {
  if (expected && operations.get(key) !== expected) return
  if (!operations.delete(key)) return
  notifyListeners()
}

export function clearMessageGenerationStopOperation(sessionId: string, messageId: string): void {
  clearGenerationStopOperation(messageStopOperationKey(sessionId, messageId))
}

export function clearSessionGenerationStopOperations(sessionId: string): void {
  const sessionKey = sessionStopOperationKey(sessionId)
  const messagePrefix = `message:${sessionId}\u0000`
  let changed = false
  for (const key of operations.keys()) {
    if (key === sessionKey || key.startsWith(messagePrefix)) {
      operations.delete(key)
      changed = true
    }
  }
  if (changed) notifyListeners()
}
