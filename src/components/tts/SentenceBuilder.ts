const SENTENCE_SPLICE_CHAR = '.;!?。；！？'

/**
 * 将输入内容按照 sentence 进行分割，每个 Message 需要使用单独的实例。
 * 设计目标：在 input 不完整内容时，也尽可能先提取出已经完成的 sentence。以便可以尽快进入下一个消费流程。（类比：按流的形式进行 sentence 的生产）
 * 场景：input 可能被多次调用 e.g.
 *
 * input("This guide")
 * input("This guide will help you")
 * input("This guide will help you get started with ElevenLabs.")
 */
export default class SentenceBuilder {
    private cache: string[] = []
    private cursor = 0
    private left = ''

    public readonly id: Readonly<string> = ''

    constructor(id: string) {
        this.id = id
    }

    public input(text: string) {
        const lastCursor = this.cursor
        const currentCursor = this.positionCursor(text) + 1

        let content = text.slice(lastCursor, currentCursor)
        if (!content) {
            return
        }
        content = this.left.trim() + content

        this.left = '' // 清空上一轮的最后一个断句的记录，重新生成
        this.cursor = currentCursor

        const lines = content.split(/[\r\n]+/)
        const readyLines = lines.slice(0, -1)
        if (readyLines.length > 0) {
            for (const line of readyLines) {
                const sentences = this.line2sentences(line)
                this.cache.push(...sentences)
            }
        }

        const last = lines[lines.length - 1]

        if (last) {
            const sentences = this.line2sentences(last)
            const readySentences = sentences.slice(0, -1)
            this.cache.push(...readySentences)

            const left = sentences[sentences.length - 1]

            if (this.isSentence(left)) {
                this.cache.push(left)
            } else {
                this.left = left.trim()
            }
        }
    }

    public async *generateSentence() {
        while (this.cache.length > 0) {
            yield this.cache.shift()
        }
        yield ''
    }

    public getLeft() {
        const l = this.left
        this.left = ''
        return l
    }

    private positionCursor(text: string) {
        let cursor = 0
        for (let i = 0; i < text.length; i++) {
            const char = text[i]
            if (char === '\r' || char === '\n') {
                cursor = i
                continue
            }

            if (i === text.length - 1 && char.match(new RegExp(`[${SENTENCE_SPLICE_CHAR}]`))) {
                cursor = i
                continue
            }

            if (
                i < text.length - 1 &&
                char.match(new RegExp(`[${SENTENCE_SPLICE_CHAR}]`)) &&
                !new Boolean(text[i + 1])
            ) {
                cursor = i
                continue
            }
        }

        return cursor
    }

    private isSentence(sentence: string) {
        if (sentence.match(new RegExp(`^\\s*\\d+[${SENTENCE_SPLICE_CHAR}]\\s*$`))) {
            // 类似 "1." 这样的内容
            return false
        }
        return sentence.match(new RegExp(`[${SENTENCE_SPLICE_CHAR}]\\s*$`))
    }

    private line2sentences(line: string) {
        if (line.length < 50) {
            return [line]
        }

        const sentences = line.split(new RegExp(`(?<=[${SENTENCE_SPLICE_CHAR}])\\s+`))

        const result: string[] = []

        let next = ''
        for (const sentence of sentences) {
            next += sentence + ' '
            if (next.length > 10) {
                result.push(next.trim())
                next = ''
            }
        }
        if (next.trim()) {
            result.push(next.trim())
        }
        return result
    }
}
