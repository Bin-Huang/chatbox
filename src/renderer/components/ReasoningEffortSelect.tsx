import { useEffect } from 'react'
import { Select, MenuItem, Typography, Box } from '@mui/material'
import { useTranslation } from 'react-i18next'

export interface Props {
    value: string
    onChange: (value: string) => void
    className?: string
}

export default function ReasoningEffortSelect(props: Props) {
    const { t } = useTranslation()

    useEffect(() => {
        if (!props.value) {
            props.onChange('medium')
        }
    }, [])

    const handleChange = (event: any) => {
        props.onChange(event.target.value as string)
    }

    return (
        <Box sx={{ margin: '10px' }} className={props.className}>
            <Box>
                <Typography id="reasoning-effort-select" gutterBottom>
                    {t('Reasoning Effort')}
                </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Select
                    value={props.value || 'medium'}
                    onChange={handleChange}
                    fullWidth
                    size="small"
                >
                    <MenuItem value="low">{t('Low')}</MenuItem>
                    <MenuItem value="medium">{t('Medium')}</MenuItem>
                    <MenuItem value="high">{t('High')}</MenuItem>
                </Select>
            </Box>
        </Box>
    )
}