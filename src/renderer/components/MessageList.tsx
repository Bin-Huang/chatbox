import { useEffect, useRef } from 'react'
import Message from './Message'
import * as atoms from '../stores/atoms'
import { useAtom, useAtomValue } from 'jotai'
import { cn } from '@/lib/utils'
import { useMessageSelectionContext } from '../contexts/MessageSelectionContext'

export default function MessageList() {
    const currentSession = useAtomValue(atoms.currentSessionAtom)
    const currentMessageList = useAtomValue(atoms.currentMessageListAtom)
    const ref = useRef<HTMLDivElement | null>(null)
    const [, setMessageListRef] = useAtom(atoms.messageListRefAtom)
    const { isDeleteMode, selectedMessages, handleSelectMessage } = useMessageSelectionContext()

    useEffect(() => {
        setMessageListRef(ref)
    }, [ref])

    return (
        <div className={cn('mx-auto w-full h-3/4')}>
            <div className="overflow-y-auto pr-0 pl-0 h-full" ref={ref}>
                {currentMessageList.map((msg, index) => (
                    <Message
                        id={msg.id}
                        key={'msg-' + msg.id}
                        msg={msg}
                        sessionId={currentSession.id}
                        sessionType={currentSession.type || 'chat'}
                        className={index === 0 ? 'pt-4' : ''}
                        collapseThreshold={msg.role === 'system' ? 150 : undefined}
                        isDeleteMode={isDeleteMode}
                        onSelectMessage={handleSelectMessage}
                        isSelected={selectedMessages.has(msg.id)}
                        isSystem={msg.role === 'system'}
                    />
                ))}
            </div>
        </div>
    )
}
