import { Config, SponsorAboutBanner, SponsorAd } from '../stores/types'

const releaseHost = 'https://releases.chatboxai.app'

export async function checkNeedUpdate(version: string, os: string, config: Config): Promise<boolean> {
    const res = await fetch(`${releaseHost}/chatbox_need_update/${version}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            uuid: config.uuid,
            os: os,
        }),
    })
    const json = await res.json()
    return !!json['need_update']
}

export async function getSponsorAd(): Promise<null | SponsorAd> {
    const res = await fetch(`${releaseHost}/sponsor_ad`)
    const json = await res.json()
    return json['data'] || null
}

export async function listSponsorAboutBanner(): Promise<SponsorAboutBanner[]> {
    const res = await fetch(`${releaseHost}/sponsor_about_banner`)
    const json = await res.json()
    return json['data']
}
