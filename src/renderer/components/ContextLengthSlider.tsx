import { Box, Slider, Typography } from '@mui/material'

interface Props {
    value: number
    onChange: (value: number) => void
}

export default function ContextLengthSlider({ value, onChange }: Props) {
    const marks = [
        { value: 8192, label: '8K' },
        { value: 32768, label: '32K' },
        { value: 65536, label: '64K' },
        { value: 131072, label: '128K' },
    ]

    return (
        <Box sx={{ width: '100%', paddingTop: '16px' }}>
            <Typography gutterBottom>Context Length</Typography>
            <Slider
                value={value}
                onChange={(_, newValue) => onChange(newValue as number)}
                min={8192}
                max={131072}
                step={8192}
                marks={marks}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${(value / 1024).toFixed(0)}K`}
                aria-label="Context Length"
            />
        </Box>
    )
}