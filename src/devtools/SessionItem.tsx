import React from 'react';
import './App.css';
import {
    ListItem, ListItemButton, ListItemText, ListItemAvatar, MenuItem,
    Avatar, IconButton, Button, TextField, Popper, Fade, Typography, ListItemIcon,
} from '@mui/material';
import PopupState, { bindToggle, bindPopper } from 'material-ui-popup-state';
import DeleteIcon from '@mui/icons-material/Delete';
import { Session } from './types'
import ChatIcon from '@mui/icons-material/Chat';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

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
    const [hovering, setHovering] = useState(false)
    const [editMode, setEditMode] = useState(false)
    const [nameEdit, setNameEdit] = useState(session.name)
    const saveNameEdit = () => {
        updateMe({ ...session, name: nameEdit })
        setEditMode(false)
    }
    return (
        <MenuItem
            key={session.id}
            onMouseEnter={() => {
                setHovering(true)
            }}
            onMouseLeave={() => {
                setHovering(false)
            }}
            selected={selected}
            onClick={() => {
                if (!editMode) {
                    switchMe()
                }
            }}
        >
            <ListItemIcon>
                <IconButton><ChatIcon fontSize="small" /></IconButton>
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
                hovering ? (
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
                            <IconButton edge="end"
                                onClick={() => setEditMode(true)}
                            >
                                <EditIcon fontSize='small' />
                            </IconButton>
                            <IconButton edge="end"
                                onClick={() => {
                                    copyMe()
                                }}
                            >
                                <FileCopyIcon fontSize='small' />
                            </IconButton>

                            <PopupState variant='popper' popupId={"delete-popper-" + session.id}>
                                {(popupState) => (
                                    <>
                                        <IconButton edge="end"
                                            {...bindToggle(popupState)}
                                        >
                                            <DeleteIcon fontSize='small' />
                                        </IconButton>
                                        <Popper {...bindPopper(popupState)} transition>
                                            {({ TransitionProps }) => (
                                                <Fade {...TransitionProps} timeout={350}>
                                                    <Button variant="contained" color="error" onClick={deleteMe} >
                                                        Delete
                                                    </Button>
                                                </Fade>
                                            )}
                                        </Popper>
                                    </>
                                )}
                            </PopupState>
                        </>
                    )
                ) : (
                    <Typography variant="body2" color="text.secondary">
                        ⌘X
                    </Typography>
                )
            }
        </MenuItem>
    )
}
