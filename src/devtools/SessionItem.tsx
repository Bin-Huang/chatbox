import React from 'react';
import './App.css';
import {
    ListItemText, ListItemAvatar, MenuItem,
    Avatar, IconButton, Button, TextField, Popper, Fade, Typography, ListItemIcon,
    Menu,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { Session } from './types'
import FileCopyIcon from '@mui/icons-material/FileCopy';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import MoreHorizOutlinedIcon from '@mui/icons-material/MoreHorizOutlined';

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
    const saveNameEdit = () => {
        updateMe({ ...session, name: nameEdit })
        setEditMode(false)
    }
    const [confirmedDelete, setconfirmedDelete] = useState(false)
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setconfirmedDelete(false)
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
    };

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
                        <TextField variant="standard" value={nameEdit}
                            onBlur={saveNameEdit}
                            onChange={(e) => { setNameEdit(e.target.value) }}
                        />
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
                        <IconButton edge="end" onClick={saveNameEdit}>
                            <CheckIcon fontSize='small' />
                        </IconButton>
                        <IconButton edge="end"
                            onClick={() => {
                                setNameEdit(session.name)
                                setEditMode(false)
                            }}
                        >
                            <CloseIcon fontSize='small' />
                        </IconButton>
                    </>
                ) : (
                    <>
                        <IconButton
                            aria-label="more"
                            id="long-button"
                            aria-controls={open ? 'long-menu' : undefined}
                            aria-expanded={open ? 'true' : undefined}
                            aria-haspopup="true"
                            onClick={handleClick}
                        >
                            <MoreHorizOutlinedIcon fontSize='small' />
                        </IconButton>
                        <Menu
                            id="long-menu"
                            MenuListProps={{
                                'aria-labelledby': 'long-button',
                            }}
                            anchorEl={anchorEl}
                            open={open}
                            onClose={handleClose}
                            PaperProps={{
                                style: {
                                    // maxHeight: ITEM_HEIGHT * 4.5,
                                    width: '20ch',
                                },
                            }}
                        >
                            <MenuItem key={session.id + 'edit'} onClick={() => setEditMode(true)}>
                                <EditIcon fontSize='small' />
                                rename
                            </MenuItem>
                            <MenuItem key={session.id + 'copy'} onClick={() => copyMe()}>
                                <FileCopyIcon fontSize='small' />
                                copy
                            </MenuItem>
                            {
                                !confirmedDelete ? (
                                    <MenuItem key={session.id + 'delete'} onClick={() => setconfirmedDelete(true)}>
                                        <DeleteIcon fontSize='small' />
                                        delete
                                    </MenuItem>
                                ) : (
                                    <MenuItem key={session.id + 'delete-confirmed'} onClick={() => {
                                        handleClose()
                                        deleteMe()
                                    }}>
                                        <DeleteIcon fontSize='small' />
                                        delete confirmed
                                    </MenuItem>
                                )
                            }

                        </Menu>
                    </>
                )
            }
        </MenuItem>
    )
}
