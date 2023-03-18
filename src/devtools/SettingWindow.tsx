import React from 'react';
import './App.css';
import {
    Button, Alert,
    Dialog, DialogContent, DialogActions, DialogTitle, DialogContentText, TextField,
    FormGroup, FormControlLabel, Switch, Select, MenuItem, FormControl, InputLabel, Slider, Typography, Box
} from '@mui/material';
import { Settings } from './types'
import { getDefaultSettings } from './store'
import ThemeChangeButton from './theme/ThemeChangeIcon';
import { ThemeMode } from './theme/index';
import { useThemeSwicher } from './theme/ThemeSwitcher';

const { useEffect } = React
const models: string[] = ['gpt-3.5-turbo', 'gpt-3.5-turbo-0301', 'gpt-4', 'gpt-4-0314', 'gpt-4-32k', 'gpt-4-32k-0314'];
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
    const handleMaxContextSliderChange = (event: Event, newValue: number | number[], activeThumb: number) => {
        if (newValue === 8192) {
            setSettingsEdit({ ...settingsEdit, maxContextSize: 'inf' });
        } else {
            setSettingsEdit({ ...settingsEdit, maxContextSize: newValue.toString() });
        }
    };
    const handleRepliesTokensInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        if (value === 'inf') {
            setSettingsEdit({ ...settingsEdit, maxTokens: 'inf' });
        } else {
            const numValue = Number(value);
            if (!isNaN(numValue) && numValue >= 0) {
                if (numValue > 8192) {
                    setSettingsEdit({ ...settingsEdit, maxTokens: 'inf' });
                    return;
                }
                setSettingsEdit({ ...settingsEdit, maxTokens: value });
            }
        }
    };
    const handleMaxContextInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        if (value === 'inf') {
            setSettingsEdit({ ...settingsEdit, maxContextSize: 'inf' });
        } else {
            const numValue = Number(value);
            if (!isNaN(numValue) && numValue >= 0) {
                if (numValue > 8192) {
                    setSettingsEdit({ ...settingsEdit, maxContextSize: 'inf' });
                    return;
                }
                setSettingsEdit({ ...settingsEdit, maxContextSize: value });
            }
        }
    };

    const [, { setMode }] = useThemeSwicher();
    useEffect(() => {
        setSettingsEdit(props.settings)
    }, [props.settings])

    const onCancel = () => {
        props.close()
        setSettingsEdit(props.settings)

        // need to restore the previous theme
        setMode(props.settings.theme || ThemeMode.System);
    }

    // preview theme
    const changeModeWithPreview = (newMode: ThemeMode) => {
        setSettingsEdit({ ...settingsEdit, theme: newMode });
        setMode(newMode);
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

                <Box sx={{ marginTop: 3, marginBottom: -1 }}>
                    <Typography id="discrete-slider" gutterBottom>
                        Max Tokens in Context
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto'}}>
                    <Box sx={{ width: '92%' }}>
                        <Slider
                            value={settingsEdit.maxContextSize === 'inf' ? 8192 : Number(settingsEdit.maxContextSize)}
                            onChange={handleMaxContextSliderChange}
                            aria-labelledby="discrete-slider"
                            valueLabelDisplay="auto"
                            defaultValue={settingsEdit.maxContextSize === 'inf' ? 8192 : Number(settingsEdit.maxContextSize)}
                            step={64}
                            min={64}
                            max={8192}
                        />
                    </Box>
                    <TextField
                        sx={{ marginLeft: 2 }}
                        value={settingsEdit.maxContextSize}
                        onChange={handleMaxContextInputChange}
                        type="text"
                        size="small"
                        variant="outlined"
                    />
                </Box>

                <Box sx={{ marginTop: 3, marginBottom: -1 }}>
                    <Typography id="discrete-slider" gutterBottom>
                        Max Tokens per Reply
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                    <Box sx={{ width: '92%' }}>
                        <Slider
                            value={settingsEdit.maxTokens === 'inf' ? 8192 : Number(settingsEdit.maxTokens)}
                            defaultValue={settingsEdit.maxTokens === 'inf' ? 8192 : Number(settingsEdit.maxTokens)}
                            onChange={handleRepliesTokensSliderChange}
                            aria-labelledby="discrete-slider"
                            valueLabelDisplay="auto"
                            step={64}
                            min={64}
                            max={8192}
                        />
                    </Box>
                    <TextField
                        sx={{ marginLeft: 2 }}
                        value={settingsEdit.maxTokens}
                        onChange={handleRepliesTokensInputChange}
                        type="text"
                        size="small"
                        variant="outlined"
                    />
                </Box>

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

                <FormControl sx={{ flexDirection: 'row', alignItems: 'center', paddingTop: 1, paddingBottom: 1 }}>
                    <ThemeChangeButton value={settingsEdit.theme} onChange={theme => changeModeWithPreview(theme)} />
                    <span style={{ marginLeft: 10 }}>Theme</span>
                </FormControl>


            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel}>Cancel</Button>
                <Button onClick={() => props.save(settingsEdit)}>Save</Button>
            </DialogActions>
        </Dialog>
    );
}
