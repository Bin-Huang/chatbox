// 参考：[Virtuo1/talk-to-gpt](https://github.com/Virtuo1/talk-to-gpt )

class Elevenlabs {
    public voiceId = ''
    public apiKey = ''

    public async getVoices() {
        const response = await fetch(`https://api.elevenlabs.io/v1/voices`, {
            method: 'GET',
            headers: {
                'xi-api-key': this.apiKey,
            },
        })

        if (response.ok) {
            const data = await response.json()
            return data.voices
        } else {
            throw new Error("Couldn't fetch voices, is your elevenlabs key correct?")
        }
    }

    public async *textToSpeak(sentences: string[]) {
        for (const sentence of sentences) {
            const response = await this.fetchAudio(sentence)
            yield response
        }
    }

    public async fetchAudio(message: string) {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': this.apiKey,
            },
            body: JSON.stringify({
                text: message,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.5,
                },
            }),
        })

        if (response.ok) {
            const blob = await response.blob()
            return URL.createObjectURL(blob)
        } else {
            throw new Error("Couldn't fetch audio")
        }
    }
}

const elevenlabs = new Elevenlabs()

interface ElevenlabsOptions {
    apiKey: string
    voiceId: string
}

export function speechMulti(sentences: string[], options: ElevenlabsOptions) {
    elevenlabs.apiKey = options.apiKey
    elevenlabs.voiceId = options.voiceId
    return elevenlabs.textToSpeak(sentences)
}

export async function speech(sentence: string, options: ElevenlabsOptions) {
    if (!sentence) {
        return ''
    }

    if (!options.apiKey || !options.voiceId) {
        throw new Error('apiKey or voiceId is empty')
    }

    elevenlabs.apiKey = options.apiKey
    elevenlabs.voiceId = options.voiceId
    return await elevenlabs.fetchAudio(sentence)
}
