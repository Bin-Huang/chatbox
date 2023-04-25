import { Config, SponsorAd } from './types'

const releaseHost = "https://releases.chatboxapp.xyz"

export async function checkNeedUpdate(version: string, os: string, config: Config): Promise<boolean> {
    const res = await fetch(`${releaseHost}/chatbox_need_update/${version}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            uuid: config.uuid,
            os: os,
        })
    })
    const json = await res.json()
    return !!json['need_update']
}

export async function getSponsorAd(): Promise<null|SponsorAd> {
    const res = await fetch(`${releaseHost}/sponsor_ad`)
    const json = await res.json()
    return json['data'] || null
}
