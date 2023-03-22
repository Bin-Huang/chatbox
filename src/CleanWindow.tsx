import {
    Button, Dialog, DialogContent, DialogActions, DialogTitle, DialogContentText,
} from '@mui/material';
import { Session } from './types'
import { useTranslation } from "react-i18next";

interface Props {
    open: boolean
    session: Session
    save(session: Session): void
    close(): void
}

export default function CleanWindow(props: Props) {
    const { t } = useTranslation()
    const clean = () => {
        const messages = props.session.messages.filter(msg => msg.role === 'system')
        props.save({ ...props.session, messages })
    }
    return (
        <Dialog open={props.open} onClose={props.close}>
            <DialogTitle>{t('clean')}</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    {t('this action will permanently delete all non-system messages in')} [{props.session.name}] {t('clean alert end')}
                    {t('are you sure you want to continue?')}
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={props.close}>{t('cancel')}</Button>
                <Button onClick={clean} color="error">{t('clean it up')}</Button>
            </DialogActions>
        </Dialog>
    )
}
