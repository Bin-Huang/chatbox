import React, { createContext, useContext } from 'react'
import { useMessageSelection } from '../hooks/useMessageSelection'

const MessageSelectionContext = createContext<ReturnType<typeof useMessageSelection> | null>(null)

export const MessageSelectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const messageSelection = useMessageSelection()
    return <MessageSelectionContext.Provider value={messageSelection}>{children}</MessageSelectionContext.Provider>
}

export const useMessageSelectionContext = () => {
    const context = useContext(MessageSelectionContext)
    if (!context) {
        throw new Error('useMessageSelectionContext must be used within a MessageSelectionProvider')
    }
    return context
}
