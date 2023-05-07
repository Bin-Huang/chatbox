import React from 'react';
import {
    Button, Alert, Chip,
    Dialog, DialogContent, DialogActions, DialogTitle, DialogContentText, TextField,
    FormGroup, FormControlLabel, Switch, Select, MenuItem, FormControl, InputLabel, Slider, Typography, Box,
} from '@mui/material';
import { Settings } from './types'
import { getDefaultSettings } from './store'
import ThemeChangeButton from './theme/ThemeChangeIcon';
import { ThemeMode } from './theme/index';
import { useThemeSwicher } from './theme/ThemeSwitcher';
import { styled } from '@mui/material/styles';
import MuiAccordionDetails from '@mui/material/AccordionDetails';
import MuiAccordion, { AccordionProps } from '@mui/material/Accordion';
import MuiAccordionSummary, { AccordionSummaryProps } from '@mui/material/AccordionSummary';
import ArrowForwardIosSharpIcon from '@mui/icons-material/ArrowForwardIosSharp';
import { useTranslation } from 'react-i18next'
import PlaylistAddCheckCircleIcon from '@mui/icons-material/PlaylistAddCheckCircle';
import LightbulbCircleIcon from '@mui/icons-material/LightbulbCircle';

const { useEffect } = React
const models: string[] = ['gpt-3.5-turbo', 'gpt-3.5-turbo-0301', 'gpt-4', 'gpt-4-0314', 'gpt-4-32k', 'gpt-4-32k-0314'];
const languages: string[] = ['en', 'zh-Hans', 'zh-Hant'];
const languageMap: { [key: string]: string } = {
    'en': 'English',
    'zh-Hans': '简体中文',
    'zh-Hant': '繁體中文',
};
interface Props {
    open: boolean
    settings: Settings
    close(): void
    save(settings: Settings): void
}

export default function SettingWindow(props: Props) {
    const { t } = useTranslation()
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
    const handleTemperatureChange = (event: Event, newValue: number | number[], activeThumb: number) => {
        if (typeof newValue === 'number') {
            setSettingsEdit({ ...settingsEdit, temperature: newValue });
        } else {
            setSettingsEdit({ ...settingsEdit, temperature: newValue[activeThumb] });
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
        setMode(props.settings.theme ?? ThemeMode.System);
    }

    // preview theme
    const changeModeWithPreview = (newMode: ThemeMode) => {
        setSettingsEdit({ ...settingsEdit, theme: newMode });
        setMode(newMode);
    }

    // @ts-ignore
    // @ts-ignore
    return (
        <Dialog open={props.open} onClose={onCancel} fullWidth >
            <DialogTitle>{t('settings')}</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    label={t('openai api key')}
                    type="password"
                    fullWidth
                    variant="outlined"
                    value={settingsEdit.openaiKey}
                    onChange={(e) => setSettingsEdit({ ...settingsEdit, openaiKey: e.target.value.trim() })}
                />
                <FormControl fullWidth variant="outlined" margin="dense">
                    <InputLabel htmlFor="language-select">{t('language')}</InputLabel>
                    <Select
                        label="language"
                        id="language-select"
                        value={settingsEdit.language}
                        onChange={(e) => {
                            setSettingsEdit({ ...settingsEdit, language: e.target.value });
                        }}>
                        {languages.map((language) => (
                            <MenuItem key={language} value={language}>
                                {languageMap[language]}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <FormControl sx={{ flexDirection: 'row', alignItems: 'center', paddingTop: 1, paddingBottom: 1 }}>
                    <span style={{ marginRight: 10 }}>{t('theme')}</span>
                    <ThemeChangeButton value={settingsEdit.theme} onChange={theme => changeModeWithPreview(theme)} />
                </FormControl>
                <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
                    <InputLabel>Font Size</InputLabel>
                    <Select
                        labelId="select-font-size"
                        value={settingsEdit.fontSize}
                        label="FontSize"
                        onChange={(event) => {
                            setSettingsEdit({ ...settingsEdit, fontSize: event.target.value as number })
                        }}
                    >
                        {
                            [12, 13, 14, 15, 16, 17, 18].map((size) => (
                                <MenuItem key={size} value={size}>{size}px</MenuItem>
                            ))
                        }
                    </Select>
                </FormControl>

                <FormGroup>
                    <FormControlLabel control={<Switch />}
                        label={t('show word count')}
                        checked={settingsEdit.showWordCount}
                        onChange={(e, checked) => setSettingsEdit({ ...settingsEdit, showWordCount: checked })}
                    />
                </FormGroup>
                <FormGroup>
                    <FormControlLabel control={<Switch />}
                        label={t('show estimated token count')}
                        checked={settingsEdit.showTokenCount}
                        onChange={(e, checked) => setSettingsEdit({ ...settingsEdit, showTokenCount: checked })}
                    />
                </FormGroup>
                <Accordion>
                    <AccordionSummary aria-controls="panel1a-content">
                        <Typography>{t('proxy')}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <TextField
                            margin="dense"
                            label={t('api host')}
                            type="text"
                            fullWidth
                            variant="outlined"
                            value={settingsEdit.apiHost}
                            onChange={(e) => setSettingsEdit({ ...settingsEdit, apiHost: e.target.value.trim() })}
                        />

                        {
                            !settingsEdit.apiHost.match(/^(https?:\/\/)?api.openai.com(:\d+)?$/) && (
                                <Alert severity="warning">
                                    {t('your api key and all messages will be sent to')} <b>{settingsEdit.apiHost}</b>.
                                    {t('please confirm that you trust this address. otherwise, there is a risk of api key and data leakage.')}
                                    <Button onClick={() => setSettingsEdit({ ...settingsEdit, apiHost: getDefaultSettings().apiHost })}>{t('reset')}</Button>
                                </Alert>
                            )
                        }
                        {
                            settingsEdit.apiHost.startsWith('http://') && (
                                <Alert severity="warning">
                                    {t('all data transfers are being conducted through the')} <b>{t('http')}</b> {t('protocol, which may lead to the risk of api key and data leakage.')}
                                    {t('unless you are completely certain and understand the potential risks involved, please consider using the')} <b>{t('https')}</b> {t('protocol instead.')}
                                </Alert>
                            )
                        }
                        {
                            !settingsEdit.apiHost.startsWith('http') && (
                                <Alert severity="error">
                                    {t('proxy must use')} <b> {t('http')} </b> {t('or')} <b> {t('https')} </b> {t('proxy api host alert end')}
                                </Alert>
                            )
                        }

                    </AccordionDetails>
                </Accordion>
                <Accordion>
                    <AccordionSummary
                        aria-controls="panel1a-content"
                    >
                        <Typography>{t('model')} & {t('token')} </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Alert severity="warning">
                            {t('these settings are aimed at professional developers. if you do not understand the meaning of these settings, please do not modify them, as it may result in request errors.')}
                            {t('before making any modifications, please verify that your account has access to the selected models (some models require additional joining of the waiting list, regardless of your account type, otherwise, it will result in 404 errors).')}
                            {t('please make sure that the number of tokens does not exceed the limit for the selected model, otherwise, an error message will occur once the context exceeds the limit.')}
                            {t('please make sure you know what you are doing.')}
                            {t('click here to')}
                            <Button onClick={() => setSettingsEdit({
                                ...settingsEdit,
                                model: getDefaultSettings().model,
                                maxContextSize: getDefaultSettings().maxContextSize,
                                maxTokens: getDefaultSettings().maxTokens,
                                showModelName: getDefaultSettings().showModelName,
                                temperature: getDefaultSettings().temperature,
                            })}>{t('reset')}</Button>
                            {t('to default values.')}
                        </Alert>

                        <FormControl fullWidth variant="outlined" margin="dense">
                            <InputLabel htmlFor="model-select">{t('model')}</InputLabel>
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

                        <Box sx={{ marginTop: 3, marginBottom: 1 }}>
                            <Typography id="discrete-slider" gutterBottom>
                                {t('temperature')}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                            <Box sx={{ width: '100%' }}>
                                <Slider
                                    value={settingsEdit.temperature}
                                    onChange={handleTemperatureChange}
                                    aria-labelledby="discrete-slider"
                                    valueLabelDisplay="auto"
                                    defaultValue={settingsEdit.temperature}
                                    step={0.1}
                                    min={0}
                                    max={1}
                                    marks={[
                                        {
                                            value: 0.2,
                                            label: <Chip size='small' icon={<PlaylistAddCheckCircleIcon />} label={t('meticulous')} />
                                        },
                                        {
                                            value: 0.8,
                                            label: <Chip size='small' icon={<LightbulbCircleIcon />} label={t('creative')} />
                                        },
                                    ]}
                                />
                            </Box>
                        </Box>

                        <Box sx={{ marginTop: 3, marginBottom: -1 }}>
                            <Typography id="discrete-slider" gutterBottom>
                                {t('max tokens in context')}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
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
                                {t('max tokens per reply')}
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
                                label={t('show model name')}
                                checked={settingsEdit.showModelName}
                                onChange={(e, checked) => setSettingsEdit({ ...settingsEdit, showModelName: checked })}
                            />
                        </FormGroup>

                    </AccordionDetails>
                </Accordion>
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel}>{t('cancel')}</Button>
                <Button onClick={() => props.save(settingsEdit)}>{t('save')}</Button>
            </DialogActions>
        </Dialog>
    );
}

const Accordion = styled((props: AccordionProps) => (
    <MuiAccordion disableGutters elevation={0} square {...props} />
))(({ theme }) => ({
    border: `1px solid ${theme.palette.divider}`,
    '&:not(:last-child)': {
        borderBottom: 0,
    },
    '&:before': {
        display: 'none',
    },
}));

const AccordionSummary = styled((props: AccordionSummaryProps) => (
    <MuiAccordionSummary
        expandIcon={<ArrowForwardIosSharpIcon sx={{ fontSize: '0.9rem' }} />}
        {...props}
    />
))(({ theme }) => ({
    backgroundColor:
        theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, .05)'
            : 'rgba(0, 0, 0, .03)',
    flexDirection: 'row-reverse',
    '& .MuiAccordionSummary-expandIconWrapper.Mui-expanded': {
        transform: 'rotate(90deg)',
    },
    '& .MuiAccordionSummary-content': {
        marginLeft: theme.spacing(1),
    },
}));

const AccordionDetails = styled(MuiAccordionDetails)(({ theme }) => ({
    padding: theme.spacing(2),
    borderTop: '1px solid rgba(0, 0, 0, .125)',
}));
