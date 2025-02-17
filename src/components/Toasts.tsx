import {} from 'react'
import * as toastActions from '../stores/toastActions'
import { Snackbar } from '@mui/material'
import * as atoms from '../stores/atoms'
import { useAtomValue } from 'jotai'

function Toasts() {
    const toasts = useAtomValue(atoms.toastsAtom)
    return (
        <>
            {toasts.map((toast) => (
                <Snackbar
                    className="Snackbar"
                    key={toast.id}
                    open
                    onClose={() => toastActions.remove(toast.id)}
                    message={toast.content}
                    anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                />
            ))}
        </>
    )
}

export default Toasts
