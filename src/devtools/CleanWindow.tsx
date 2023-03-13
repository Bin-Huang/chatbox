import './App.css';
import {
    Button, Dialog, DialogContent, DialogActions, DialogTitle, DialogContentText,
} from '@mui/material';
import { Session } from './types'

interface Props {
    open: boolean
    session: Session
    save(session: Session): void
    close(): void
}

export default function CleanWindow(props: Props) {
    const clean = () => {
        const messages = props.session.messages.filter(msg => msg.role === 'system')
        props.save({ ...props.session, messages })
    }
    return (
        <Dialog open={props.open} onClose={props.close}>
            <DialogTitle>Cleaning</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    This action will permanently delete all non-system messages in [{props.session.name}].
                    Are you sure you want to continue?
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={props.close}>Cancel</Button>
                <Button onClick={clean} color="error">Clean it up</Button>
            </DialogActions>
        </Dialog>
    )
}
