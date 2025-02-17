import { Button, Dialog, DialogContent, DialogActions, DialogTitle, DialogContentText } from '@mui/material'
import { useTranslation } from 'react-i18next'
import * as atoms from '../stores/atoms'
import { useAtom } from 'jotai'
import * as sessionActions from '../stores/sessionActions'
import { trackingEvent } from '@/packages/event'

interface Props {}

export default function CleanWindow(props: Props) {
    const [sessionClean, setSessionClean] = useAtom(atoms.sessionCleanDialogAtom)
    const { t } = useTranslation()
    const close = () => {
        setSessionClean(null)
    }
    const clean = () => {
        if (!sessionClean) {
            return
        }
        sessionClean.messages.forEach((msg) => {
            msg?.cancel?.()
        })
        sessionActions.clear(sessionClean.id)
        trackingEvent('clear_conversation', { event_category: 'user' })
        close()
    }
    return (
        <Dialog open={!!sessionClean} onClose={close}>
            <DialogTitle>{t('clean')}</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    {t('delete confirmation', {
                        sessionName: '"' + sessionClean?.name + '"',
                    })}
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={close}>{t('cancel')}</Button>
                <Button onClick={clean} color="error">
                    {t('clean it up')}
                </Button>
            </DialogActions>
        </Dialog>
    )
}
