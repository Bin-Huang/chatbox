import { ofetch } from 'ofetch'
import { SessionsDump } from 'src/shared/types'

export async function loadSessionsDump() {
    return await ofetch<SessionsDump>('http://localhost:8080/api/chats-history', {
        method: 'GET',
        retry: 3,
        headers: {
            authorization: `Bearer 634fc0dee42cf0e8bb3e85de634db34e`,
        },
    })
}

async function saveSessionsToBackend(dump: SessionsDump) {
    try {
        await fetch('http://localhost:8080/api/chats-history', {
            method: 'PUT',
            headers: {
                'content-type': 'application/json',
                authorization: `Bearer 634fc0dee42cf0e8bb3e85de634db34e`,
            },
            body: JSON.stringify(dump),
        })
    } catch (e) {
        console.error(e)
    }
}

let saveTimer: ReturnType<typeof setTimeout> | undefined
let scheduledDumpTs = 0

export function scheduleSaveSessionsToBackend(dump: SessionsDump) {
    if (dump.ts <= scheduledDumpTs) {
        return
    }

    scheduledDumpTs = dump.ts
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => saveSessionsToBackend(dump), 500)
}
