const releaseHost = "https://releases.chatboxapp.xyz"

export async function checkNeedUpdate(version: string): Promise<boolean> {
    const res = await fetch(`${releaseHost}/chatbox_need_update/${version}`)
    const json = await res.json()
    return !!json['need_update']
}
