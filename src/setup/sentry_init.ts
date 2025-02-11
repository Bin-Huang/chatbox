import * as Sentry from '@sentry/react'
import platform from '../packages/platform'

;(async () => {
    const settings = await platform.getSettings()

    // ONLY enable Sentry when reporting and tracking is allowed by the user
    if (! settings.allowReportingAndTracking) {
        return
    }

    const version = await platform.getVersion().catch(() => 'unknown')
    Sentry.init({
        dsn: 'https://3cf8d15960fc432cb886d6f62e3716dc@o180365.ingest.sentry.io/4505411943464960',
        integrations: [
            new Sentry.BrowserTracing({
                // Set `tracePropagationTargets` to control for which URLs distributed tracing should be enabled
                tracePropagationTargets: ['localhost', /^https:\/\/chatboxai\.app/, /^https:\/\/chatboxapp\.xyz/],
            }),
            new Sentry.Replay(),
        ],
        // Performance Monitoring
        sampleRate: 0.1,
        tracesSampleRate: 0.1, // Capture 100% of the transactions, reduce in production!
        // Session Replay
        replaysSessionSampleRate: 0.05, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
        replaysOnErrorSampleRate: 0.05, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
        release: version,
    })
})()
