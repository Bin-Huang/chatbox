import React, { useEffect, useRef } from 'react';
import './App.css';
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

const { useState } = React

export interface Props {
    session: Session
    selected: boolean
    switchMe: () => void
    deleteMe: () => void
    copyMe: () => void
    updateMe: (session: Session) => void
}

export default function SessionItem(props: Props) {
    const { session, selected, switchMe, deleteMe, copyMe, updateMe } = props
    const [editMode, setEditMode] = useState(false)
    const [nameEdit, setNameEdit] = useState(session.name)
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        event.preventDefault()
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
    };
    const saveNameEdit = () => {
        handleClose()
        updateMe({ ...session, name: nameEdit })
        setEditMode(false)
    }

    const inputEl = useRef(null)
    useEffect(() => {
        if (editMode) {
            inputEl.current.focus()
        }
    }, [editMode])

    return (
        <MenuItem
            key={session.id}
            selected={selected}
            onClick={() => {
                if (!editMode) {
                    switchMe()
                }
            }}
        >
            <ListItemIcon>
                <IconButton><ChatBubbleOutlineOutlinedIcon fontSize="small" /></IconButton>
            </ListItemIcon>
            <ListItemText>
                {

                    editMode ? (
                        <form onSubmit={(event) => {
                            event.preventDefault()
                            saveNameEdit()
                        }}>
                        <TextField variant="standard" value={nameEdit} inputRef={inputEl}
                            onChange={(e) => {
                                e.preventDefault()
                                setNameEdit(e.target.value)
                            }}
                        />
                        </form>
                    ) : (
                        <Typography variant="inherit" noWrap>
                            {session.name}
                        </Typography>
                    )
                }
            </ListItemText>
            {
                editMode ? (
                    <>
                        <IconButton onClick={saveNameEdit}>
                            <CheckIcon />
                        </IconButton>
                    </>
                ) : (
                    <>
                        <IconButton
                            onClick={handleClick}
                        >
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
                                setEditMode(true)
                            }} disableRipple
                            >
                                <EditIcon />
                                Rename
                            </MenuItem>

                            <MenuItem key={session.id + 'copy'} onClick={() => {
                                copyMe()
                            }} disableRipple
                            >
                                <FileCopyIcon fontSize='small' />
                                Copy
                            </MenuItem>

                            <Divider sx={{ my: 0.5 }} />

                            <MenuItem key={session.id + 'del'} onClick={() => {
                                setAnchorEl(null)
                                handleClose()
                                deleteMe()
                            }} disableRipple
                            >
                                <DeleteForeverIcon />
                                Delete
                            </MenuItem>

                        </StyledMenu>
                    </>
                )
            }
        </MenuItem>
    )
}
