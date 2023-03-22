import React, { useEffect, useRef } from 'react';
import {
    ListItemText, ListItemAvatar, MenuItem, Divider,
    Avatar, IconButton, Button, TextField, Popper, Fade, Typography, ListItemIcon,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { Session } from './types'
import FileCopyIcon from '@mui/icons-material/FileCopy';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import MoreHorizOutlinedIcon from '@mui/icons-material/MoreHorizOutlined';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import StyledMenu from './StyledMenu';
import { useTranslation } from "react-i18next";

const { useState } = React

export interface Props {
    session: Session
    selected: boolean
    switchMe: () => void
    deleteMe: () => void
    copyMe: () => void
    editMe: () => void
}

export default function SessionItem(props: Props) {
    const { t } = useTranslation()
    const { session, selected, switchMe, deleteMe, copyMe, editMe } = props
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        event.preventDefault()
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
    };

    return (
        <MenuItem
            key={session.id}
            selected={selected}
            onClick={() => switchMe()}
        >
            <ListItemIcon>
                <IconButton><ChatBubbleOutlineOutlinedIcon fontSize="small" /></IconButton>
            </ListItemIcon>
            <ListItemText>
                <Typography variant="inherit" noWrap>
                    {session.name}
                </Typography>
            </ListItemText>
            <IconButton onClick={handleClick}>
                <MoreHorizOutlinedIcon />
            </IconButton>
            <StyledMenu
                MenuListProps={{
                    'aria-labelledby': 'long-button',
                }}
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
            >
                <MenuItem key={session.id + 'edit'} onClick={() => {
                    editMe()
                    handleClose()
                }} disableRipple>
                    <EditIcon />
                    {t('rename')}
                </MenuItem>

                <MenuItem key={session.id + 'copy'} onClick={() => {
                    copyMe()
                    handleClose()
                }} disableRipple>
                    <FileCopyIcon fontSize='small' />
                    {t('copy')}
                </MenuItem>

                <Divider sx={{ my: 0.5 }} />

                <MenuItem key={session.id + 'del'} onClick={() => {
                    setAnchorEl(null)
                    handleClose()
                    deleteMe()
                }} disableRipple
                >
                    <DeleteForeverIcon />
                    {t('delete')}
                </MenuItem>

            </StyledMenu>
        </MenuItem>
    )
}
