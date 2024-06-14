import { Button, Dialog, DialogContent, DialogActions, DialogTitle, DialogContentText } from '@mui/material'
import { Session } from '../stores/types'
import { useTranslation } from 'react-i18next'

interface Props {
    open: boolean
    session: Session
    save(session: Session): void
    close(): void
}

export default function CleanDialog(props: Props) {
    const { t } = useTranslation()
    const clean = () => {
        const messages = props.session.messages.filter((msg) => msg.role === 'system')
        props.save({ ...props.session, messages })
    }
    return (
        <Dialog open={props.open} onClose={props.close}>
            <DialogTitle>{t('clean')}</DialogTitle>
            <DialogContent>
                <DialogContentText>{t('delete confirmation', { sessionName: props.session.name })}</DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={props.close}>{t('cancel')}</Button>
                <Button onClick={clean} color="error">
                    {t('clean it up')}
                </Button>
            </DialogActions>
        </Dialog>
    )
}
