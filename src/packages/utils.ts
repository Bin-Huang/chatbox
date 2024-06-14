import { Tiktoken } from 'js-tiktoken/lite'
// @ts-ignore
import cl100k_base from 'js-tiktoken/ranks/cl100k_base'

import { Message } from '../stores/types'
import copyToClipboardFallback from 'copy-to-clipboard'

export function copyToClipboard(text: string) {
    navigator?.clipboard?.writeText(text)
    copyToClipboardFallback(text)
}

const pattern =
    /[a-zA-Z0-9_\u0392-\u03c9\u00c0-\u00ff\u0600-\u06ff\u0400-\u04ff]+|[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\uac00-\ud7af]+/g
export function countWord(data: string): number {
    try {
        data = typeof data === 'string' ? data : JSON.stringify(data)
        let m = data.match(pattern)
        let count = 0
        if (!m) {
            return 0
        }
        for (let i = 0; i < m.length; i++) {
            if (m[i].charCodeAt(0) >= 0x4e00) {
                count += m[i].length
            } else {
                count += 1
            }
        }
        return count
    } catch (e) {
        return -1
    }
}

const encoding = new Tiktoken(cl100k_base)
function estimateTokens(str: string): number {
    str = typeof str === 'string' ? str : JSON.stringify(str)
    const tokens = encoding.encode(str)
    return tokens.length
}

// OpenAI Cookbook: https://github.com/openai/openai-cookbook/blob/main/examples/How_to_count_tokens_with_tiktoken.ipynb
export function estimateTokensFromMessages(messages: Message[]) {
    try {
        const tokensPerMessage = 3
        const tokensPerName = 1
        let ret = 0
        for (const msg of messages) {
            ret += tokensPerMessage
            ret += estimateTokens(msg.content)
            ret += estimateTokens(msg.role)
            if (msg.name) {
                ret += estimateTokens(msg.name)
                ret += tokensPerName
            }
        }
        ret += 3 // every reply is primed with <|start|>assistant<|message|>
        return ret
    } catch (e) {
        return -1
    }
}
