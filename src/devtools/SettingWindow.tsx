import React from 'react';
import './App.css';
import {
    Button, Alert,
    Dialog, DialogContent, DialogActions, DialogTitle, DialogContentText, TextField,
    FormGroup, FormControlLabel, Switch, Select, MenuItem, FormControl, InputLabel, Slider, Typography
} from '@mui/material';
import { Settings } from './types'
import { getDefaultSettings } from './store'

const { useEffect } = React
const models: string[] = ['gpt-3.5-turbo', 'gpt-3.5-turbo-0301', 'gpt-4', 'gpt-4-0314'];
interface Props {
    open: boolean
    settings: Settings
    close(): void
    save(settings: Settings): void
}

export default function SettingWindow(props: Props) {
    const [settingsEdit, setSettingsEdit] = React.useState<Settings>(props.settings);
    const handleRepliesTokensSliderChange = (event: Event, newValue: number | number[], activeThumb: number) => {
        if (newValue === 8192) {
            setSettingsEdit({ ...settingsEdit, maxTokens: 'inf' });
        } else {
            setSettingsEdit({ ...settingsEdit, maxTokens: newValue.toString() });
        }
    };
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

                <FormControl fullWidth variant="outlined" margin="dense">
                    <InputLabel htmlFor="model-select">Model</InputLabel>
                    <Select
                        label="Model"
                        id="model-select"
                        value={settingsEdit.model}
                        onChange={(e) => setSettingsEdit({ ...settingsEdit, model: e.target.value })}>
                        {models.map((model) => (
                            <MenuItem key={model} value={model}>
                                {model}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <Typography id="discrete-slider" gutterBottom>
                    Maximum Context Size in Tokens
                </Typography>
                <Slider
                    value={settingsEdit.maxContextSize === 'inf' ? 8192 : Number(settingsEdit.maxContextSize)}
                    onChange={(event: Event, value: number | number[], activeThumb: number) => setSettingsEdit({ ...settingsEdit, maxContextSize: value.toString() })}
                    aria-labelledby="discrete-slider"
                    valueLabelDisplay="auto"
                    step={64}
                    marks
                    min={1}
                    max={8192}
                />

                <Typography id="discrete-slider" gutterBottom>
                    Maximum Tokens in Replies
                </Typography>
                <Slider
                    value={settingsEdit.maxTokens === 'inf' ? 8192 : Number(settingsEdit.maxTokens)}
                    onChange={handleRepliesTokensSliderChange}
                    aria-labelledby="discrete-slider"
                    valueLabelDisplay="auto"
                    step={64}
                    marks
                    min={1}
                    max={8192}
                />

                <FormGroup>
                    <FormControlLabel control={<Switch />}
                        label="Show model name"
                        checked={settingsEdit.showModelName}
                        onChange={(e, checked) => setSettingsEdit({ ...settingsEdit, showModelName: checked })}
                    />
                </FormGroup>

                <FormGroup>
                    <FormControlLabel control={<Switch />}
                        label="Show word count"
                        checked={settingsEdit.showWordCount}
                        onChange={(e, checked) => setSettingsEdit({ ...settingsEdit, showWordCount: checked })}
                    />
                </FormGroup>

                <FormGroup>
                    <FormControlLabel control={<Switch />}
                        label="Show estimated token count"
                        checked={settingsEdit.showTokenCount}
                        onChange={(e, checked) => setSettingsEdit({ ...settingsEdit, showTokenCount: checked })}
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
