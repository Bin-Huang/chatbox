import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import { useAtomValue, useSetAtom } from 'jotai'
import * as atoms from '../stores/atoms'
import { useTranslation } from 'react-i18next'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import StyledMenu from './StyledMenu'
import { useState } from 'react'
import { MenuItem } from '@mui/material'
import CleaningServicesIcon from '@mui/icons-material/CleaningServices'

export default function Toolbar() {
    const { t } = useTranslation()
    const currentSession = useAtomValue(atoms.currentSessionAtom)

    const setSessionCleanDialog = useSetAtom(atoms.sessionCleanDialogAtom)

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const open = Boolean(anchorEl)

    const handleMoreMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation()
        event.preventDefault()
        setAnchorEl(event.currentTarget)
    }
    const handleMoreMenuClose = () => {
        setAnchorEl(null)
    }
    const handleSessionClean = () => {
        setSessionCleanDialog(currentSession)
        handleMoreMenuClose()
    }

    return (
        <Box>
            <IconButton edge="start" color="inherit" aria-label="more-menu-button" sx={{}} onClick={handleMoreMenuOpen}>
                <MoreHorizIcon />
            </IconButton>
            <StyledMenu anchorEl={anchorEl} open={open} onClose={handleMoreMenuClose}>
                <MenuItem
                    onClick={handleSessionClean}
                    disableRipple
                    sx={{
                        '&:hover': {
                            backgroundColor: 'rgba(255, 0, 0, 0.1)',
                        },
                    }}
                >
                    <CleaningServicesIcon fontSize="small" />
                    {t('Clear All Messages')}
                </MenuItem>
            </StyledMenu>
        </Box>
    )
}
