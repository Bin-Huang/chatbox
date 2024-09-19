import { useState, useCallback, useEffect } from 'react'
import { useAtom } from 'jotai'
import * as atoms from '../stores/atoms'

export function useMessageSelection() {
    const [sessions, setSessions] = useAtom(atoms.sessionsAtom)
    const [currentSession] = useAtom(atoms.currentSessionAtom)
    const [isDeleteMode, setIsDeleteMode] = useState(false)
    const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set())

    const toggleDeleteMode = useCallback(() => {
        setIsDeleteMode((prev) => !prev)
        setSelectedMessages(new Set())
    }, [])

    const handleSelectMessage = useCallback((id: string, selected: boolean) => {
        setSelectedMessages((prev) => {
            const newSet = new Set(prev)
            if (selected) {
                newSet.add(id)
            } else {
                newSet.delete(id)
            }
            return newSet
        })
    }, [])

    const handleDeleteMessages = useCallback(() => {
        setSessions((prevSessions) =>
            prevSessions.map((session) =>
                session.id === currentSession.id
                    ? { ...session, messages: session.messages.filter((msg) => !selectedMessages.has(msg.id)) }
                    : session
            )
        )
        setSelectedMessages(new Set())
        setIsDeleteMode(false)
    }, [selectedMessages, setSessions, currentSession.id])

    useEffect(() => {
        setIsDeleteMode(false)
        setSelectedMessages(new Set())
    }, [currentSession.id])

    return {
        isDeleteMode,
        toggleDeleteMode,
        selectedMessages,
        handleSelectMessage,
        handleDeleteMessages,
    }
}
