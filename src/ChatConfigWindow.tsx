import React from 'react';
import {
    Button, Dialog, DialogContent, DialogActions, DialogTitle, DialogContentText, TextField,
} from '@mui/material';
import { Session } from './types'

const { useEffect } = React

interface Props {
    open: boolean
    session: Session
    save(session: Session): void
    close(): void
}

export default function ChatConfigWindow(props: Props) {
    const [dataEdit, setDataEdit] = React.useState<Session>(props.session);

    useEffect(() => {
        setDataEdit(props.session)
    }, [props.session])

    const onCancel = () => {
        props.close()
        setDataEdit(props.session)
    }

    const onSave = () => {
        if (dataEdit.name === '') {
            dataEdit.name = props.session.name
        }
        props.save(dataEdit)
        props.close()
    }

    return (
        <Dialog open={props.open} onClose={onCancel}>
            <DialogTitle>Renaming</DialogTitle>
            <DialogContent>
                <DialogContentText>
                </DialogContentText>
                <TextField
                    autoFocus
                    margin="dense"
                    label="Title"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={dataEdit.name}
                    onChange={(e) => setDataEdit({ ...dataEdit, name: e.target.value.trim() })}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel}>Cancel</Button>
                <Button onClick={onSave}>Save</Button>
            </DialogActions>
        </Dialog>
    );
}
