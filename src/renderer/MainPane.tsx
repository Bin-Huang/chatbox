import { Box } from '@mui/material'
import { useAtomValue } from 'jotai'
import Header from './components/Header'
import InputBox from './components/InputBox'
import MessageList from './components/MessageList'
import { drawerWidth } from './Sidebar'
import * as atoms from './stores/atoms'
import { MessageSelectionProvider } from './contexts/MessageSelectionContext'

interface Props {}

export default function MainPane(props: Props) {
    const currentSession = useAtomValue(atoms.currentSessionAtom)

    return (
        <MessageSelectionProvider>
            <Box
                className="w-full h-full"
                sx={{
                    flexGrow: 1,
                    marginLeft: `${drawerWidth}px`,
                }}
            >
                <div className="flex flex-col h-full">
                    <Header />
                    <MessageList />
                    <InputBox currentSessionId={currentSession.id} currentSessionType={currentSession.type || 'chat'} />
                </div>
            </Box>
        </MessageSelectionProvider>
    )
}
