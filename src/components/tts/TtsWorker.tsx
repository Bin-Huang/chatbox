import React, { memo, useState, useRef, useEffect, useCallback } from 'react'

import { speech } from './tts'
import debounce from './debounce'

import CollapsedAudio from './CollapsedAudio'
import SentenceBuilder from './SentenceBuilder'

interface Props {
    text: string
    messageId: string
    options: {
        elevenlabsKey: string
        elevenlabsVoiceId: string
        /**
         * 最后一个不完整句子的等待时间，在这个时间之后，会直接读取不完整的句子（如果存在，一般 GPT 反馈的句子都有结束标点符号），进行 tts
         */
        breakSentenceTimeout: number
        /**
         * 句子之间的等待时间，如果句子之间的生成时间小于这个时间，则会被合并。减少请求 tts 服务器的次数。数值越小，可能的 tts 请求越多。
         */
        mergeSentenceTimeout: number
    }
}

/**
 * 一个不占据实际空间的 TTS 组件
 */
const TtsWorker = memo((props: Props) => {
    const { text, messageId, options } = props

    // 等待被消费（发音）的句子
    const [speechSentence, setSpeechSentence] = useState<string[]>([])

    // 音频 source, 此内容可以快速更新，不必等待音频播放完成（CollapsedAudio 组件会自行处理）
    const [audioSource, setAudioSource] = useState('')

    // 用于处理最后可能存在的断句（没有结束标点符号的句子）
    const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout>()

    // text to sentences 生成器
    const [sentenceBuilder, setSentenceBuilder] = useState<SentenceBuilder>()

    // 每个 messageId 需要有不同的 SentenceBuilder 实例
    useEffect(() => {
        if (!messageId || sentenceBuilder?.id === messageId) {
            return
        }
        setSentenceBuilder(new SentenceBuilder(messageId))
    }, [messageId])

    // 从 SentenceBuilder 获取已经生成的 sentence
    const fetchSentences = useCallback(async () => {
        if (!sentenceBuilder) {
            return
        }

        clearTimeout(timeoutId)
        const sentences: string[] = []
        const generator = sentenceBuilder.generateSentence()

        let continueGenerator = true
        do {
            const sentence = await generator.next()
            if (sentence.value) {
                sentences.push(sentence.value)
            } else {
                continueGenerator = false
            }
        } while (continueGenerator)

        setSpeechSentence((originSentences) => {
            return originSentences.concat(sentences)
        })

        const tid = setTimeout(() => {
            const lastSentence = sentenceBuilder.getLeft()
            if (lastSentence) {
                setSpeechSentence((originSentences) => {
                    return [...originSentences, lastSentence]
                })
            }
        }, options.breakSentenceTimeout)
        setTimeoutId(tid)
    }, [sentenceBuilder])

    // 调用 tts 服务，获取 sentence 的音频
    const speechSentenceHandler = useCallback<(_: string[]) => void>(
        debounce((sentences: string[]) => {
            setSpeechSentence([])

            const longSentence = sentences.join(' ')
            console.log('[speech] ', longSentence)

            speech(longSentence, {
                apiKey: options.elevenlabsKey,
                voiceId: options.elevenlabsVoiceId,
            })
                .then(setAudioSource)
                .catch(console.error) // TODO 界面提示
        }, options.mergeSentenceTimeout),
        [],
    )

    // text to sentences 生产
    useEffect(() => {
        if (!sentenceBuilder) {
            return
        }
        if (sentenceBuilder.id !== messageId) {
            return
        }

        sentenceBuilder.input(text)
        fetchSentences()
    }, [text, sentenceBuilder])

    // sentences to speech 消费
    useEffect(() => {
        if (speechSentence.length < 1) {
            return
        }
        const sentences = [...speechSentence]
        speechSentenceHandler(sentences)
    }, [speechSentence])

    return <CollapsedAudio source={audioSource} />
})

export default TtsWorker
