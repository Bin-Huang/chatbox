import { TextField, Slider, Typography, Box } from '@mui/material'
import { useTranslation } from 'react-i18next'

export interface Props {
    value: number
    onChange(value: number): void
    className?: string
}

export default function MaxContextMessageCountSlider(props: Props) {
    const { t } = useTranslation()
    return (
        <Box sx={{ margin: '10px' }} className={props.className}>
            <Box>
                <Typography id="discrete-slider" gutterBottom>
                    {t('Max Message Count in Context')}
                </Typography>
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
                        onChange={(_event, value) => {
                            const v = Array.isArray(value) ? value[0] : value
                            props.onChange(v)
                        }}
                        aria-labelledby="discrete-slider"
                        valueLabelDisplay="auto"
                        step={2}
                        min={0}
                        max={22}
                        marks
                        valueLabelFormat={(value) => {
                            if (value === 22) {
                                return t('No Limit')
                            }
                            return value
                        }}
                    />
                </Box>
                <TextField
                    sx={{ marginLeft: 2, width: '100px' }}
                    value={props.value > 20 ? t('No Limit') : props.value}
                    onChange={(event) => {
                        const s = event.target.value.trim()
                        const v = parseInt(s)
                        if (isNaN(v)) {
                            return
                        }
                        props.onChange(v)
                    }}
                    type="text"
                    size="small"
                    variant="outlined"
                />
            </Box>
        </Box>
    )
}
