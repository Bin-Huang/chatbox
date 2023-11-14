import React, { memo, useMemo } from 'react'
import TtsWorker from './TtsWorker'

interface Props {
    text: string
    messageId: string
    enable: boolean
}

const key = ''
const id = ''

const LAST_BREAK_TIMEOUT = 3000
const SENTENCE_MERGE_WAIT_TIME = 1000

const SpeechController = memo((props: Props) => {
    const { enable } = props

    // TODO 从设置中读取配置
    const options = useMemo(() => {
        return {
            elevenlabsKey: key,
            elevenlabsVoiceId: id,
            breakSentenceTimeout: LAST_BREAK_TIMEOUT,
            mergeSentenceTimeout: SENTENCE_MERGE_WAIT_TIME,
        }
    }, [])

    if (!enable) {
        return null
    }

    return (
        <div>
            <TtsWorker text={props.text} messageId={props.messageId} options={options}></TtsWorker>
        </div>
    )
})

export default SpeechController
