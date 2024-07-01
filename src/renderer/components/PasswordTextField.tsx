import React from 'react'
import { TextField, InputAdornment, IconButton } from '@mui/material'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'

export default function PasswordTextField(props: {
    label: string
    value: string
    setValue: (value: string) => void
    placeholder?: string
    disabled?: boolean
    helperText?: React.ReactNode
}) {
    const [showPassword, setShowPassword] = React.useState(false)
    const handleClickShowPassword = () => setShowPassword((show) => !show)
    const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault()
    }
    return (
        <TextField
            type={showPassword ? 'text' : 'password'}
            margin="dense"
            label={props.label}
            fullWidth
            variant="outlined"
            placeholder={props.placeholder}
            disabled={props.disabled}
            value={props.value}
            onChange={(e) => props.setValue(e.target.value.trim())}
            InputProps={{
                endAdornment: (
                    <InputAdornment position="end">
                        <IconButton
                            aria-label="toggle password visibility"
                            onClick={handleClickShowPassword}
                            onMouseDown={handleMouseDownPassword}
                        >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                    </InputAdornment>
                ),
            }}
            helperText={props.helperText}
        />
    )
}
