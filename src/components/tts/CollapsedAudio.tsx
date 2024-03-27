import React, { memo, useState, useRef, useEffect, useCallback } from 'react'

interface AudioOutputProps {
    source: string
}

/**
 * 隐藏的 audio 播放器
 * 在连续设置 source 时，会自动排队，先播放完前面的内容，然后继续播放下一条
 */
const CollapsedAudio = memo((props: AudioOutputProps) => {
    const { source } = props

    const audioPlayerRef = useRef<HTMLAudioElement>(null)

    const [sourceQueue, setSourceQueue] = useState<string[]>([])
    const [currentSource, setCurrentSource] = useState('')

    // 入队
    useEffect(() => {
        if (!source) {
            return
        }

        setSourceQueue((queue) => {
            return [...queue, source]
        })
    }, [source])

    // 播放当前 source 为队头
    useEffect(() => {
        if (currentSource) {
            return
        }

        const next = sourceQueue[0]
        if (next) {
            setCurrentSource(next)
        }
    }, [sourceQueue, currentSource])

    const onLoadedMetadata = () => {
        audioPlayerRef.current?.play()
    }

    // 播放完成，出队
    const onPlayEnd = () => {
        setSourceQueue((queue) => {
            return queue.slice(1)
        })
        setCurrentSource('')
    }

    return (
        <audio
            id="audio-player"
            ref={audioPlayerRef}
            onLoadedMetadata={onLoadedMetadata}
            onEnded={onPlayEnd}
            src={currentSource}
        ></audio>
    )
})

export default CollapsedAudio
