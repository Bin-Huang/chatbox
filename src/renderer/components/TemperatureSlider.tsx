import { useEffect, useState } from 'react'
import { Chip, TextField, Slider, Typography, Box } from '@mui/material'
import { useTranslation } from 'react-i18next'
import PlaylistAddCheckCircleIcon from '@mui/icons-material/PlaylistAddCheckCircle'
import LightbulbCircleIcon from '@mui/icons-material/LightbulbCircle'

export interface Props {
    value: number
    onChange(value: number): void
    className?: string
}

export default function TemperatureSlider(props: Props) {
    const { t } = useTranslation()
    const [input, setInput] = useState('0.70')
    useEffect(() => {
        setInput(`${props.value}`)
    }, [props.value])
    const handleTemperatureChange = (event: Event, newValue: number | number[], activeThumb: number) => {
        if (typeof newValue === 'number') {
            props.onChange(newValue)
        } else {
            props.onChange(newValue[activeThumb])
        }
    }
    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value
        if (value === '' || value.endsWith('.')) {
            setInput(value)
            return
        }
        let num = parseFloat(value)
        if (isNaN(num)) {
            setInput(`${value}`)
            return
        }
        if (num < 0 || num > 1) {
            setInput(`${value}`)
            return
        }
        num = Math.round(num * 100) / 100 // only keep 2 decimal places
        setInput(num.toString())
        props.onChange(num)
    }
    return (
        <Box sx={{ margin: '10px' }} className={props.className}>
            <Box>
                <Typography gutterBottom>{t('temperature')}</Typography>
            </Box>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    margin: '0 auto',
                }}
            >
                <Box sx={{ width: '92%' }}>
                    <Slider
                        value={props.value}
                        onChange={handleTemperatureChange}
                        aria-labelledby="discrete-slider"
                        valueLabelDisplay="auto"
                        step={0.01}
                        min={0}
                        max={1}
                        marks={[
                            {
                                value: 0.2,
                                label: (
                                    <Chip
                                        size="small"
                                        icon={<PlaylistAddCheckCircleIcon />}
                                        label={t('meticulous')}
                                        className="opacity-50"
                                    />
                                ),
                            },
                            {
                                value: 0.8,
                                label: (
                                    <Chip
                                        size="small"
                                        icon={<LightbulbCircleIcon />}
                                        label={t('creative')}
                                        className="opacity-50"
                                    />
                                ),
                            },
                        ]}
                    />
                </Box>
                <TextField
                    sx={{ marginLeft: 2, width: '100px' }}
                    value={input}
                    onChange={handleInputChange}
                    type="text"
                    size="small"
                    variant="outlined"
                />
            </Box>
        </Box>
    )
}
