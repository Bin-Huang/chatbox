import type { BrowserWindow } from 'electron'
import { ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import { getQuitAndInstallArguments } from './installer-command'
import { getSettings } from './store-node'
import { getLogger } from './util'

const log = getLogger('app-updater')

// 本分支与官方 Chatbox（github.com/chatboxai/chatbox）独立演进：更新只来自
// fork 自己的 GitHub Releases。官方 chatboxai.app 的 feed 已刻意移除，禁止再
// 接回，否则官方构建（如 v1.23.5）会被当作更新推送、覆盖 fork 的功能。
// 该仓库需保持公开并发布带 latest.yml 的 Release（publish 配置见
// electron-builder.yml），否则检查更新会按"无更新"处理。
const FORK_UPDATE_FEED = {
  provider: 'github' as const,
  owner: 'ytterbium7',
  repo: 'chatbox',
}

function sendToRenderer(win: BrowserWindow | null, channel: string, data?: unknown) {
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, data)
  }
}

export class AppUpdater {
  private getWindow: () => BrowserWindow | null
  private isChecking = false

  constructor(getWindow: () => BrowserWindow | null) {
    this.getWindow = getWindow

    log.transports.file.level = 'info'
    autoUpdater.logger = log
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true

    autoUpdater.on('checking-for-update', () => {
      sendToRenderer(this.getWindow(), 'updater:checking')
    })

    autoUpdater.on('update-available', (info) => {
      sendToRenderer(this.getWindow(), 'updater:available', { version: info.version })
    })

    autoUpdater.on('update-not-available', () => {
      sendToRenderer(this.getWindow(), 'updater:not-available')
    })

    autoUpdater.on('download-progress', (progress) => {
      sendToRenderer(this.getWindow(), 'updater:progress', {
        percent: Math.round(progress.percent),
        bytesPerSecond: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total,
      })
    })

    autoUpdater.on('update-downloaded', (info) => {
      sendToRenderer(this.getWindow(), 'updater:downloaded', { version: info.version })
    })

    autoUpdater.on('error', (err) => {
      log.error('auto_updater error:', err)
      sendToRenderer(this.getWindow(), 'updater:error', { message: err?.message || 'Unknown error' })
    })

    // Guard against double-registration (defensive — AppUpdater is singleton)
    ipcMain.removeHandler('updater:check')
    ipcMain.handle('updater:check', async () => {
      if (this.isChecking) return { started: false }
      try {
        const result = await this.tryUpdate()
        // electron-updater returns null without firing events in dev mode or when all URLs fail
        if (!result) sendToRenderer(this.getWindow(), 'updater:not-available')
      } catch (e) {
        log.error('auto_updater: check failed', e)
        sendToRenderer(this.getWindow(), 'updater:error', {
          message: e instanceof Error ? e.message : 'Unknown error',
        })
      }
      return { started: true }
    })

    ipcMain.removeHandler('install-update')
    ipcMain.handle('install-update', () => {
      autoUpdater.quitAndInstall(...getQuitAndInstallArguments(process.platform))
    })

    const settings = getSettings()
    if (settings.autoUpdate) {
      setTimeout(() => this.tryUpdate().catch((e) => log.error('auto_updater: startup check failed', e)), 5_000)
      setInterval(
        () => this.tryUpdate().catch((e) => log.error('auto_updater: scheduled check failed', e)),
        1000 * 60 * 60
      )
      log.info('Update timer started, checking every hour')
    }
  }

  async tryUpdate() {
    if (this.isChecking) {
      log.info('auto_updater: check already in progress, skipping')
      return null
    }

    this.isChecking = true
    try {
      const settings = getSettings()
      autoUpdater.channel = settings.betaUpdate ? 'beta' : 'latest'
      autoUpdater.allowDowngrade = false

      autoUpdater.setFeedURL(FORK_UPDATE_FEED)
      try {
        return await autoUpdater.checkForUpdates()
      } catch (e) {
        // fork 仓库还没有发布过 Release 时 GitHub provider 会抛
        // ERR_UPDATER_NO_PUBLISHED_VERSIONS（缺 latest.yml 时同理），按"无更新"
        // 处理，避免设置页/关于页一直显示"更新失败"
        const code = (e as { code?: string })?.code
        const message = e instanceof Error ? e.message : String(e)
        if (
          code === 'ERR_UPDATER_NO_PUBLISHED_VERSIONS' ||
          /no published versions|cannot find latest\.yml|ENOENT|\b404\b/i.test(message)
        ) {
          log.info('auto_updater: fork feed has no published release yet, treating as up-to-date')
          return null
        }
        throw e
      }
    } finally {
      this.isChecking = false
    }
  }
}
