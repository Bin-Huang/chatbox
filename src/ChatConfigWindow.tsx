import React from 'react';
import {
    Button, Dialog, DialogContent, DialogActions, DialogTitle, DialogContentText, TextField,
} from '@mui/material';
import { Session } from './types'
import { useTranslation } from "react-i18next";

const { useEffect } = React

interface Props {
    open: boolean
    session: Session
    save(session: Session): void
    close(): void
}

export default function ChatConfigWindow(props: Props) {
    const { t } = useTranslation()
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
        dataEdit.name = dataEdit.name.trim()
        props.save(dataEdit)
        props.close()
    }

    return (
        <Dialog open={props.open} onClose={onCancel}>
            <DialogTitle>{t('rename')}</DialogTitle>
            <DialogContent>
                <DialogContentText>
                </DialogContentText>
                <TextField
                    autoFocus
                    margin="dense"
                    label={t('name')}
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={dataEdit.name}
                    onChange={(e) => setDataEdit({ ...dataEdit, name: e.target.value })}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel}>{t('cancel')}</Button>
                <Button onClick={onSave}>{t('save')}</Button>
            </DialogActions>
        </Dialog>
    );
}
