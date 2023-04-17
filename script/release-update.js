const axios = require('axios')
const fs = require('fs-extra')

const data = {
    "version": "v0.1.15",
    "notes": "New version",
    "pub_date": "2023-03-19T14:50:47.517Z",
    "platforms": {
        "darwin-x86_64": {
            "signature": "",
            "url": "https://github.com/Bin-Huang/chatbox/releases/download/Chatbox-v0.1.15/chatbox.app.tar.gz"
        },
        "darwin-aarch64": {
            "signature": "",
            "url": "https://github.com/Bin-Huang/chatbox/releases/download/Chatbox-v0.1.15/chatbox.app.tar.gz"
        },
        "linux-x86_64": {
            "signature": "",
            "url": "https://github.com/Bin-Huang/chatbox/releases/download/Chatbox-v0.1.15/chatbox_0.1.15_amd64.AppImage.tar.gz"
        },
        "windows-x86_64": {
            "signature": "",
            "url": "https://github.com/Bin-Huang/chatbox/releases/download/Chatbox-v0.1.15/chatbox_0.1.15_x64_en-US.msi.zip"
        },
        "win64": {
            "signature": "",
            "url": "https://github.com/Bin-Huang/chatbox/releases/download/Chatbox-v0.1.15/chatbox_0.1.15_x64_en-US.msi.zip"
        },
        "linux": {
            "signature": "",
            "url": "https://github.com/Bin-Huang/chatbox/releases/download/Chatbox-v0.1.15/chatbox_0.1.15_amd64.AppImage.tar.gz"
        },
        "darwin": {
            "signature": "",
            "url": "https://github.com/Bin-Huang/chatbox/releases/download/Chatbox-v0.1.15/chatbox.app.tar.gz"
        }
    }
}

main()
async function main() {
    let version = process.argv[2]
    let storageFlag = process.argv[3] || 'github'

    const res = await axios.get('https://api.github.com/repos/Bin-Huang/chatbox/releases')
    const release = version ? res.data.find(r => r.tag_name.endsWith(version)) : res.data[0]

    data.version = release.tag_name.replace('Chatbox-', '')
    data.pub_date = new Date().toISOString()

    version = data.version
    console.log(version)

    const dir = './tmp/' + version
    fs.ensureDirSync(dir)

    const promises = []
    for (const asset of release.assets) {
        promises.push(handleAsset(asset, version, dir, storageFlag))
    }
    await Promise.all(promises)

    fs.writeFileSync(`${dir}/update.json`, JSON.stringify(data, null, 4))
    console.log(data)
    console.log(dir)
}

async function handleAsset(asset, version, dir, storageFlag) {
    let link = asset.browser_download_url
    if (storageFlag === 'cos') {
        link = `https://chatbox-1252521402.cos.ap-hongkong.myqcloud.com/${version}/${asset.name}`
    }
    if (storageFlag === 'cloudflare') {
        link = `https://pub-0f2a372de68244aabdee60c9d82c4c6c.r2.dev/${version}/${asset.name}`
    }
    if (asset.name.endsWith('.app.tar.gz')) {
        if (storageFlag !== 'github') {
            await download(asset.browser_download_url, `${dir}/${asset.name}`)
        }
        data.platforms['darwin'].url = link
        data.platforms['darwin-aarch64'].url = link
        data.platforms['darwin-x86_64'].url = link
        return
    }
    if (asset.name.endsWith('.AppImage.tar.gz')) {
        if (storageFlag !== 'github') {
            await download(asset.browser_download_url, `${dir}/${asset.name}`)
        }
        data.platforms['linux'].url = link
        data.platforms['linux-x86_64'].url = link
        return
    }
    if (asset.name.endsWith('.msi.zip')) {
        if (storageFlag !== 'github') {
            await download(asset.browser_download_url, `${dir}/${asset.name}`)
        }
        data.platforms['win64'].url = link
        data.platforms['windows-x86_64'].url = link
        return
    }

    if (asset.name.endsWith('.app.tar.gz.sig')) {
        const res = await axios.get(asset.browser_download_url)
        data.platforms['darwin'].signature = res.data
        data.platforms['darwin-aarch64'].signature = res.data
        data.platforms['darwin-x86_64'].signature = res.data
        return
    }
    if (asset.name.endsWith('.AppImage.tar.gz.sig')) {
        const res = await axios.get(asset.browser_download_url)
        data.platforms['linux'].signature = res.data
        data.platforms['linux-x86_64'].signature = res.data
        return
    }
    if (asset.name.endsWith('.msi.zip.sig')) {
        const res = await axios.get(asset.browser_download_url)
        data.platforms['win64'].signature = res.data
        data.platforms['windows-x86_64'].signature = res.data
        return
    }
}

// download file from url to filepath
async function download(url, filepath) {
    const res = await axios.get(url, { responseType: 'stream' })
    const writer = fs.createWriteStream(filepath)
    res.data.pipe(writer)
    await new Promise((resolve, reject) => {
        writer.on('finish', resolve)
        writer.on('error', reject)
    })
}
