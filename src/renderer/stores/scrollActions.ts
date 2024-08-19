import { getDefaultStore } from 'jotai'
import * as atoms from './atoms'

export function scrollToBottom(force: boolean, behavior: 'auto' | 'smooth' = 'auto') {
    console.log('called scrollToBottom with', force)
    const store = getDefaultStore()
    const messageListRef = store.get(atoms.messageListRefAtom)
    if (messageListRef && messageListRef.current) {
        const scrollTop = messageListRef.current.scrollTop;
        const scrollHeight = messageListRef.current.scrollHeight;
        const clientHeight = messageListRef.current.clientHeight;
        const bottomOffset = scrollHeight - scrollTop - clientHeight;
        if (bottomOffset <= 250 || force) {
            messageListRef.current.scrollTo({
                top: scrollHeight,
                behavior,
            })
        }
    }
}
