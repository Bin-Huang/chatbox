import React from 'react'
import { Tooltip } from '@mui/material'
import { cn } from '@/lib/utils'

export default function MiniButton(props: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    className?: string
    style?: React.CSSProperties
    tooltipTitle?: React.ReactNode
    tooltipPlacement?: "top" | "bottom" | "left" | "right" | "bottom-end" | "bottom-start" | "left-end" | "left-start" | "right-end" | "right-start" | "top-end" | "top-start"
}) {
    const { onClick, disabled, className, style, tooltipTitle, tooltipPlacement, children } = props
    const button = (
        <button onClick={onClick} disabled={disabled}
            className={cn(
                'bg-transparent hover:bg-slate-400/25',
                'border-none rounded',
                'h-8 w-8 p-1',
                disabled ? '' : 'cursor-pointer',
                className,
            )}
            style={style}
        >
            {children}
        </button>
    )
    if (!tooltipTitle) {
        return button
    }
    return (
        <Tooltip title={tooltipTitle} placement={tooltipPlacement}>
            {button}
        </Tooltip>
    )
}
