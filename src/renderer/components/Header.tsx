import { useEffect } from 'react'
import { Typography, useTheme, IconButton, Tooltip } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckIcon from '@mui/icons-material/Check'
import SponsorChip from './SponsorChip'
import * as atoms from '../stores/atoms'
import { useAtomValue, useSetAtom } from 'jotai'
import * as sessionActions from '../stores/sessionActions'
import Toolbar from './Toolbar'
import { cn } from '@/lib/utils'
import { useMessageSelectionContext } from '../contexts/MessageSelectionContext'

export default function Header() {
    const theme = useTheme()
    const currentSession = useAtomValue(atoms.currentSessionAtom)
    const setChatConfigDialogSession = useSetAtom(atoms.chatConfigDialogAtom)
    const { isDeleteMode, toggleDeleteMode, selectedMessages, handleDeleteMessages } = useMessageSelectionContext()

    useEffect(() => {
        if (currentSession.name === 'Untitled' && currentSession.messages.length >= 2) {
            sessionActions.generateName(currentSession.id)
            return
        }
    }, [currentSession.messages.length])

    const editCurrentSession = () => {
        setChatConfigDialogSession(currentSession)
    }

    return (
        <div
            className="px-4 pt-3 pb-2"
            style={{
                borderBottomWidth: '1px',
                borderBottomStyle: 'solid',
                borderBottomColor: theme.palette.divider,
            }}
        >
            <div className={cn('flex flex-row mx-auto w-full')}>
                <Typography
                    variant="h6"
                    color="inherit"
                    component="div"
                    noWrap
                    sx={{
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}
                    className="flex items-center cursor-pointer"
                    onClick={editCurrentSession}
                >
                    <Typography variant="h6" noWrap className={cn('max-w-56', 'ml-3')}>
                        {currentSession.name}
                    </Typography>
                </Typography>
                <SponsorChip sessionId={currentSession.id} />
                {isDeleteMode && selectedMessages.size > 0 ? (
                    <IconButton color="primary" onClick={handleDeleteMessages} sx={{ mr: 2 }}>
                        <CheckIcon />
                    </IconButton>
                ) : null}
                <Tooltip title={isDeleteMode ? 'Cancel delete mode' : 'Delete mode'}>
                    <IconButton
                        color={isDeleteMode ? 'secondary' : 'primary'}
                        onClick={toggleDeleteMode}
                        sx={{ mr: 2 }}
                    >
                        <DeleteIcon />
                    </IconButton>
                </Tooltip>
                <Toolbar />
            </div>
        </div>
    )
}

export { Header }
