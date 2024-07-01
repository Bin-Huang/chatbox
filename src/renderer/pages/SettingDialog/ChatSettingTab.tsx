import { Button, TextField, Box, FormControlLabel, Switch, FormGroup, Badge, IconButton, useTheme } from '@mui/material'
import { Settings } from '../../../shared/types'
import { useTranslation } from 'react-i18next'
import * as defaults from '../../../shared/defaults'

export default function ChatSettingTab(props: {
    settingsEdit: Settings
    setSettingsEdit: (settings: Settings) => void
}) {
    const { settingsEdit, setSettingsEdit } = props
    const { t } = useTranslation()

    return (
        <Box>
            <Box className='mb-2'>
                <TextField
                    margin="dense"
                    label={t('Default Prompt for New Conversation')}
                    fullWidth
                    variant="outlined"
                    value={settingsEdit.defaultPrompt || ''}
                    multiline
                    maxRows={8}
                    onChange={(e) =>
                        setSettingsEdit({
                            ...settingsEdit,
                            defaultPrompt: e.target.value,
                        })
                    }
                />
                <Button
                    size="small"
                    variant="text"
                    color="inherit"
                    sx={{ opacity: 0.5, textTransform: 'none' }}
                    onClick={() => {
                        setSettingsEdit({
                            ...settingsEdit,
                            defaultPrompt: defaults.getDefaultPrompt(),
                        })
                    }}
                >
                    {t('Reset to Default')}
                </Button>
            </Box>

            <FormGroup>
                <FormControlLabel
                    control={<Switch />}
                    label={t('Spell Check')}
                    checked={settingsEdit.spellCheck}
                    onChange={(e, checked) => {
                        setSettingsEdit({
                            ...settingsEdit,
                            spellCheck: checked,
                        })
                    }}
                />
            </FormGroup>
            <FormGroup>
                <FormControlLabel
                    control={<Switch />}
                    label={t('Markdown Rendering')}
                    checked={settingsEdit.enableMarkdownRendering}
                    onChange={(e, checked) => {
                        settingsEdit.enableMarkdownRendering = checked
                        setSettingsEdit({ ...settingsEdit })
                    }}
                />
            </FormGroup>
        </Box>
    )
}
