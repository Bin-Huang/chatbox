import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import type { RunCommandShell } from '@shared/types/command-execution'
import type { UserExecApprovalSource } from '@shared/types/user-exec'
import { consumeFailedCommandRetry } from '../command-execution-policy'
import {
  COMMAND_OUTPUT_CAPTURE_FAILED_MESSAGE,
  createCommandOutputCapture,
  createCommandOutputCapturePath,
} from '../command-output-capture'
import { buildOperationFinishLog, buildOperationStartLog, createOperationId } from '../operation-log'
import { killProcessTree } from '../process-tree'
import { buildPowerShellStdinScript, buildSandboxStdinScript, stripCodesignNoise } from '../sandbox/exec-script'
import { getLoginShellPathIfReady } from '../sandbox/login-shell-env'
import { getLogger } from '../util'
import { resolveWindowsPowerShell } from '../windows-powershell'

const log = getLogger('skills:user-exec')

export interface UserExecParams {
  command: string
  cwd?: string
  timeout?: number
  sessionId?: string
  toolCallId?: string
  approvalSource?: UserExecApprovalSource
  retryOf?: string
  shell?: RunCommandShell
  baseCwd?: string
  injectBundledNode?: boolean
}

export interface UserExecResult {
  success: boolean
  stdout: string
  stderr: string
  exitCode: number | null
  cancelled?: boolean
  cwd?: string
  outputFile?: string
}

interface ActiveUserExecCommand {
  cancel: () => void
}

interface UserExecEntry {
  command: string
  cwd?: string
  retryOf?: string
  shell?: RunCommandShell
  baseCwd?: string
  injectBundledNode?: boolean
  promise: Promise<UserExecResult>
  completedAt?: number
}

interface UserExecRunnerOptions {
  completedTtlMs?: number
  maxCompletedEntries?: number
  now?: () => number
}

const DEFAULT_COMPLETED_TTL_MS = 10 * 60 * 1000
const DEFAULT_MAX_COMPLETED_ENTRIES = 32
const activeUserExecCommands = new Map<string, ActiveUserExecCommand>()

function getUserExecKey(sessionId: string | undefined, toolCallId: string | undefined): string | null {
  return toolCallId ? `${sessionId ?? ''}:${toolCallId}` : null
}

export function cancelUserExecCommand(params: Pick<UserExecParams, 'sessionId' | 'toolCallId'>): { killed: boolean } {
  const key = getUserExecKey(params.sessionId, params.toolCallId)
  const active = key ? activeUserExecCommands.get(key) : undefined
  if (!active) return { killed: false }
  active.cancel()
  return { killed: true }
}

export function resolveUserExecCwd(params: Pick<UserExecParams, 'cwd' | 'baseCwd'>): string {
  const baseCwd = params.baseCwd?.trim() || os.homedir()
  return path.resolve(baseCwd, params.cwd?.trim() || '.')
}

export async function executeUserExecCommand(params: UserExecParams): Promise<UserExecResult> {
  const {
    command,
    cwd: requestedCwd,
    baseCwd: requestedBaseCwd,
    timeout,
    sessionId,
    toolCallId,
    approvalSource,
    retryOf,
    shell,
    injectBundledNode,
  } = params
  let resolvedCwd: string | undefined

  try {
    if (!command || typeof command !== 'string') throw new Error('Command is required')

    const cwd = resolveUserExecCwd({ cwd: requestedCwd, baseCwd: requestedBaseCwd })
    resolvedCwd = cwd
    if (retryOf) {
      if (!sessionId || !shell) throw new Error('Escalated command retries require sessionId and shell')
      const retry = consumeFailedCommandRetry({ sessionId, retryOf, command, cwd, shell })
      if (!retry.valid) throw new Error(retry.error)
    }
    const timeoutMs = timeout || 120_000
    const maxOutputBytes = 6_000
    const operationId = createOperationId()
    const startedAt = Date.now()

    log.info(
      buildOperationStartLog({
        operationId,
        kind: 'user_exec',
        sessionId,
        toolCallId,
        // Renderer approval metadata is audit-only. Missing values remain visible
        // instead of silently looking like a known authorization path.
        approvalSource: approvalSource ?? 'unknown',
        cwd,
        timeoutMs,
        command,
      })
    )

    const isWindows = process.platform === 'win32'
    const powershell = isWindows ? resolveWindowsPowerShell() : null
    if (isWindows && !powershell) {
      const result = {
        success: false,
        stdout: '',
        stderr: 'PowerShell is not available on this Windows host.',
        exitCode: null,
        cwd,
      }
      log.warn(
        buildOperationFinishLog({
          operationId,
          success: false,
          exitCode: null,
          durationMs: Date.now() - startedAt,
          stdout: '',
          stderr: result.stderr,
        })
      )
      return result
    }
    const shellCommand = powershell?.cmd ?? 'bash'
    const hostCommand =
      injectBundledNode && !isWindows ? buildSandboxStdinScript(command, 'bash', process.execPath, true) : command
    const shellArgs = powershell?.args ?? ['-lc', hostCommand]
    const outputCapture = createCommandOutputCapture(createCommandOutputCapturePath(toolCallId))

    // GUI-launched Electron inherits launchd's minimal PATH; `bash -l` alone doesn't recover
    // it on macOS (Homebrew configures zsh's ~/.zprofile, which bash never sources). Read the
    // cached value synchronously: an await here would delay spawn and open a window in which
    // cancellation cannot find the child.
    const loginShellPath = getLoginShellPathIfReady()
    const spawnEnv = loginShellPath ? { ...process.env, PATH: loginShellPath } : process.env

    return await new Promise((resolve) => {
      let stdout = ''
      let stderr = ''
      let stdoutBytes = 0
      let stderrBytes = 0
      let settled = false
      let cancelled = false
      let timedOut = false
      let outputLimitExceeded = false
      let forceKillHandle: ReturnType<typeof setTimeout> | undefined
      let drainHandle: ReturnType<typeof setTimeout> | undefined
      let lastExit: { code: number | null; signal: NodeJS.Signals | null } | null = null
      const TERMINAL_DRAIN_GRACE_MS = 2_000
      const activeKey = getUserExecKey(sessionId, toolCallId)

      const resolveOnce = (result: UserExecResult) => {
        if (settled) return
        settled = true
        clearTimeout(timeoutHandle)
        if (activeKey) activeUserExecCommands.delete(activeKey)
        void (async () => {
          const outputFile = await outputCapture.finish()
          const capturedResult = {
            ...result,
            ...(outputCapture.isFailed()
              ? {
                  stderr: `${result.stderr}${result.stderr ? '\n' : ''}${COMMAND_OUTPUT_CAPTURE_FAILED_MESSAGE}`,
                }
              : {}),
            ...(outputFile ? { outputFile } : {}),
          }
          const finalResult = injectBundledNode
            ? { ...capturedResult, stderr: stripCodesignNoise(capturedResult.stderr) }
            : capturedResult
          const finishLog = buildOperationFinishLog({
            operationId,
            success: finalResult.success,
            exitCode: finalResult.exitCode,
            durationMs: Date.now() - startedAt,
            timedOut: finalResult.exitCode === null && finalResult.stderr.includes('timed out'),
            stdout: finalResult.stdout,
            stderr: finalResult.stderr,
            stdoutBytes,
            stderrBytes,
          })
          if (finalResult.success) log.info(finishLog)
          else log.warn(finishLog)
          resolve({ ...finalResult, cwd })
        })()
      }

      // Shared result builder for every terminal path (close / exit-drain /
      // cancel / timeout).
      const buildResult = (code: number | null, signal: NodeJS.Signals | null): UserExecResult =>
        cancelled
          ? { success: false, stdout, stderr, exitCode: 130, cancelled: true }
          : outputLimitExceeded
            ? {
                success: false,
                stdout,
                stderr: `${stderr}${stderr ? '\n' : ''}[Command terminated: output exceeded the 10MB capture limit]`,
                exitCode: 1,
              }
            : timedOut || signal === 'SIGTERM'
              ? { success: false, stdout, stderr: stderr || `Command timed out (${timeoutMs / 1000}s)`, exitCode: null }
              : { success: code === 0, stdout, stderr, exitCode: code }

      // `close` fires only after every stdio stream is closed. A daemon-style
      // grandchild that inherited our pipes keeps them open forever, so the
      // shell exits but `close` never arrives and the tool call would hang the
      // session lock indefinitely (issue #3958). Once the shell itself exits,
      // give stdio a bounded drain grace — re-armed while output still flows —
      // and then settle on the shell's exit code regardless.
      const armDrain = () => {
        const exitInfo = lastExit
        if (!exitInfo) return
        if (drainHandle) clearTimeout(drainHandle)
        drainHandle = setTimeout(() => {
          if (settled) return
          killProcessTree(child, 'SIGTERM')
          resolveOnce(buildResult(exitInfo.code, exitInfo.signal))
        }, TERMINAL_DRAIN_GRACE_MS)
        drainHandle.unref?.()
      }

      const child = spawn(shellCommand, shellArgs, {
        cwd,
        stdio: [isWindows ? 'pipe' : 'ignore', 'pipe', 'pipe'],
        env: spawnEnv,
        shell: false,
        // Keep the command in its own POSIX process group so cancellation also
        // terminates descendants. Windows uses taskkill /T in killProcessTree.
        detached: !isWindows,
      })

      if (activeKey) {
        activeUserExecCommands.set(activeKey, {
          cancel: () => {
            if (settled || cancelled) return
            cancelled = true
            clearTimeout(timeoutHandle)
            killProcessTree(child, 'SIGTERM')
            forceKillHandle = setTimeout(() => killProcessTree(child, 'SIGKILL'), 3_000)
            // Settle immediately so Stop is terminal even when a leaked
            // descendant still holds our stdio pipes open (issue #3958).
            resolveOnce({ success: false, stdout, stderr, exitCode: 130, cancelled: true })
          },
        })
      }

      const timeoutHandle = setTimeout(() => {
        if (settled || child.killed) return
        timedOut = true
        killProcessTree(child, 'SIGTERM')
        forceKillHandle = setTimeout(() => killProcessTree(child, 'SIGKILL'), 3_000)
        // The shell may already be gone (only a leaked descendant holds the
        // pipes); arm the drain so the call still settles instead of hanging.
        if (!lastExit) lastExit = { code: null, signal: 'SIGTERM' }
        armDrain()
      }, timeoutMs)

      if (!child.stdout || !child.stderr) {
        child.kill('SIGTERM')
        resolveOnce({ success: false, stdout: '', stderr: 'Command output streams are unavailable', exitCode: null })
        return
      }
      const stdoutStream = child.stdout
      const stderrStream = child.stderr

      if (isWindows && child.stdin) {
        child.stdin.on('error', () => {
          // The process error/close handlers below own the final result.
        })
        child.stdin.end(buildPowerShellStdinScript(command, injectBundledNode ? process.execPath : undefined), 'utf8')
      }

      stdoutStream.on('data', (data: Buffer) => {
        stdoutBytes += data.byteLength
        if (lastExit) armDrain()
        if (!outputCapture.append('stdout', data)) {
          stdoutStream.pause()
          outputCapture.onDrain(() => stdoutStream.resume())
        }
        if (outputCapture.isLimitExceeded() && !outputLimitExceeded) {
          outputLimitExceeded = true
          killProcessTree(child, 'SIGTERM')
          forceKillHandle = setTimeout(() => killProcessTree(child, 'SIGKILL'), 3_000)
        }
        const remaining = maxOutputBytes - Buffer.byteLength(stdout)
        if (remaining > 0) stdout += data.subarray(0, remaining).toString()
      })
      stderrStream.on('data', (data: Buffer) => {
        stderrBytes += data.byteLength
        if (lastExit) armDrain()
        if (!outputCapture.append('stderr', data)) {
          stderrStream.pause()
          outputCapture.onDrain(() => stderrStream.resume())
        }
        if (outputCapture.isLimitExceeded() && !outputLimitExceeded) {
          outputLimitExceeded = true
          killProcessTree(child, 'SIGTERM')
          forceKillHandle = setTimeout(() => killProcessTree(child, 'SIGKILL'), 3_000)
        }
        const remaining = maxOutputBytes - Buffer.byteLength(stderr)
        if (remaining > 0) stderr += data.subarray(0, remaining).toString()
      })
      child.on('error', (error) => {
        if (forceKillHandle) clearTimeout(forceKillHandle)
        log.error('skills:user-exec spawn error', error)
        resolveOnce({ success: false, stdout, stderr: stderr || error.message, exitCode: null })
      })
      child.on('close', (code, signal) => {
        if (forceKillHandle) clearTimeout(forceKillHandle)
        if (drainHandle) clearTimeout(drainHandle)
        resolveOnce(buildResult(code, signal))
      })
      child.on('exit', (code, signal) => {
        if (forceKillHandle) clearTimeout(forceKillHandle)
        lastExit = { code, signal }
        // 'close' may never arrive when a leaked child holds our pipes; arm a
        // bounded drain so the tool call always settles once the shell exits.
        armDrain()
      })
    })
  } catch (error) {
    log.error('skills:user-exec failed', error)
    return {
      success: false,
      stdout: '',
      stderr: error instanceof Error ? error.message : 'Unknown error',
      exitCode: null,
      ...(resolvedCwd ? { cwd: resolvedCwd } : {}),
    }
  }
}

export function createUserExecRunner(
  execute: (params: UserExecParams) => Promise<UserExecResult>,
  options: UserExecRunnerOptions = {}
) {
  const completedTtlMs = options.completedTtlMs ?? DEFAULT_COMPLETED_TTL_MS
  const maxCompletedEntries = options.maxCompletedEntries ?? DEFAULT_MAX_COMPLETED_ENTRIES
  const now = options.now ?? Date.now
  const entries = new Map<string, UserExecEntry>()

  function pruneCompletedEntries(): void {
    const currentTime = now()
    for (const [key, entry] of entries) {
      if (entry.completedAt !== undefined && currentTime - entry.completedAt >= completedTtlMs) {
        entries.delete(key)
      }
    }

    const completedEntries = [...entries.entries()]
      .filter((entry): entry is [string, UserExecEntry & { completedAt: number }] => entry[1].completedAt !== undefined)
      .sort((a, b) => a[1].completedAt - b[1].completedAt)
    for (const [key] of completedEntries.slice(0, Math.max(0, completedEntries.length - maxCompletedEntries))) {
      entries.delete(key)
    }
  }

  return {
    run(params: UserExecParams): Promise<UserExecResult> {
      if (!params.toolCallId) return execute(params)

      pruneCompletedEntries()
      const key = `${params.sessionId ?? ''}:${params.toolCallId}`
      const existing = entries.get(key)
      if (existing) {
        if (
          existing.command !== params.command ||
          existing.cwd !== params.cwd ||
          existing.retryOf !== params.retryOf ||
          existing.shell !== params.shell ||
          existing.baseCwd !== params.baseCwd ||
          existing.injectBundledNode !== params.injectBundledNode
        ) {
          return Promise.resolve({
            success: false,
            stdout: '',
            stderr: `Tool call ${params.toolCallId} was reused with a different command or working directory, or retry binding`,
            exitCode: null,
          })
        }
        return existing.promise
      }

      const entry: UserExecEntry = {
        command: params.command,
        cwd: params.cwd,
        retryOf: params.retryOf,
        shell: params.shell,
        baseCwd: params.baseCwd,
        injectBundledNode: params.injectBundledNode,
        promise: Promise.resolve().then(() => execute(params)),
      }
      entries.set(key, entry)
      const markCompleted = () => {
        entry.completedAt = now()
        pruneCompletedEntries()
      }
      void entry.promise.then(markCompleted, markCompleted)
      return entry.promise
    },
  }
}

export function createDefaultUserExecRunner() {
  return createUserExecRunner(executeUserExecCommand)
}
