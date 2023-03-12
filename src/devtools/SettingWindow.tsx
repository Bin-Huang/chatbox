import React from 'react';
import './App.css';
import {
    Button, Alert,
    Dialog, DialogContent, DialogActions, DialogTitle, DialogContentText, TextField,
    FormGroup, FormControlLabel, Switch,
} from '@mui/material';
import { Settings } from './types'
import { getDefaultSettings } from './store'

const { useEffect } = React

interface Props {
    open: boolean
    settings: Settings
    close(): void
    save(settings: Settings): void
}

export default function SettingWindow(props: Props) {
    const [settingsEdit, setSettingsEdit] = React.useState<Settings>(props.settings);
    useEffect(() => {
        setSettingsEdit(props.settings)
    }, [props.settings])

    const onCancel = () => {
        props.close()
        setSettingsEdit(props.settings)
    }

    return (
        <Dialog open={props.open} onClose={onCancel}>
            <DialogTitle>Settings</DialogTitle>
            <DialogContent>
                <DialogContentText>
                </DialogContentText>
                <TextField
                    autoFocus
                    margin="dense"
                    label="OpenAI API Key"
                    type="password"
                    fullWidth
                    variant="outlined"
                    value={settingsEdit.openaiKey}
                    onChange={(e) => setSettingsEdit({ ...settingsEdit, openaiKey: e.target.value.trim() })}
                />
                <TextField
                    margin="dense"
                    label="API Host"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={settingsEdit.apiHost}
                    onChange={(e) => setSettingsEdit({ ...settingsEdit, apiHost: e.target.value.trim() })}
                />
                {
                    !settingsEdit.apiHost.match(/^(https?:\/\/)?api.openai.com(:\d+)?$/) && (
                        <Alert severity="warning">
                            Your API Key and all messages will be sent to <b>{settingsEdit.apiHost}</b>.
                            Please confirm that you trust this address. Otherwise, there is a risk of API Key and data leakage.
                            <Button onClick={() => setSettingsEdit({ ...settingsEdit, apiHost: getDefaultSettings().apiHost })}>Reset</Button>
                        </Alert>
                    )
                }
                {
                    settingsEdit.apiHost.startsWith('http://') && (
                        <Alert severity="warning">
                            All data transfers are being conducted through the <b>HTTP</b> protocol, which may lead to the risk of API key and data leakage.
                            Unless you are completely certain and understand the potential risks involved, please consider using the HTTPS protocol instead.
                        </Alert>
                    )
                }
                {
                    !settingsEdit.apiHost.startsWith('http') && (
                        <Alert severity="error">
                            Please starts with https:// or http://
                        </Alert>
                    )
                }

                <FormGroup>
                    <FormControlLabel control={<Switch />} label="Show word count"
                        checked={settingsEdit.showWordCount}
                        onChange={(e, checked) => setSettingsEdit({ ...settingsEdit, showWordCount: checked })}
                    />
                </FormGroup>

            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel}>Cancel</Button>
                <Button onClick={() => props.save(settingsEdit)}>Save</Button>
            </DialogActions>
        </Dialog>
    );
}
