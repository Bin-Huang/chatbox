import React from 'react';
import {
    Button, Dialog, DialogContent, DialogActions, DialogTitle, DialogContentText, TextField,
    OutlinedInput,InputLabel,Chip,FormControl,Select,Box,MenuItem
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { Theme, useTheme } from '@mui/material/styles';
import useStore from './store'
import { Session, Plugin } from './types'
import { useTranslation } from "react-i18next";

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const { useEffect } = React

function getStyles(name: string, pluginIDs: readonly string[], theme: Theme) {
    return {
      fontWeight:
      pluginIDs.indexOf(name) === -1
          ? theme.typography.fontWeightRegular
          : theme.typography.fontWeightMedium,
    };
  }

interface Props {
    open: boolean
    session: Session
    save(session: Session): void
    close(): void
}

export default function ChatConfigWindow(props: Props) {
    const theme = useTheme();
    const { t } = useTranslation()
    const { plugins } = useStore()

    const [dataEdit, setDataEdit] = React.useState<Session>(props.session);

    useEffect(() => {
        setDataEdit(props.session)
    }, [props.session])

    const [pluginIDs, setPluginIDs] = React.useState<string[]>(props.session.pluginIDs?props.session.pluginIDs:[]);

    const handleChange = (event: SelectChangeEvent<typeof pluginIDs>) => {
        const {
            target: { value },
        } = event;

        setPluginIDs(
            // On autofill we get a stringified value.
            typeof value === 'string' ? value.split(',') : value,
        );
    };

    const onCancel = () => {
        props.close()
        setDataEdit(props.session)
    }

    const onSave = () => {
        if (dataEdit.name === '') {
            dataEdit.name = props.session.name
        }
        dataEdit.name = dataEdit.name.trim()
        dataEdit.pluginIDs = pluginIDs

        props.save(dataEdit)
        props.close()
    }

    return (
        <Dialog open={props.open} onClose={onCancel}>
            <DialogTitle>{t('edit session')}</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <DialogContentText>
                </DialogContentText>
                <TextField
                    autoFocus
                    margin="dense"
                    label={t('name')}
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={dataEdit.name}
                    onChange={(e) => setDataEdit({ ...dataEdit, name: e.target.value })}
                />
                <FormControl fullWidth>
                    <InputLabel id="plugins_label">Plugins</InputLabel>
                    <Select
                        labelId="plugins_checkbox_label"
                        id="plugins_checkbox"
                        multiple
                        value={pluginIDs}
                        onChange={handleChange}
                        input={<OutlinedInput label="Plugins" />}
                        renderValue={(selected:string[]) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected.map((value: string) => (
                                <Chip key={value} label={value} />
                              ))}
                            </Box>
                        )}
                        MenuProps={MenuProps}
                    >
                        {plugins.map((plugin: Plugin) => (
                            <MenuItem
                                key={plugin.id}
                                value={plugin.id}
                                style={getStyles(plugin.id, pluginIDs, theme)}
                            >
                                {plugin.name_for_human}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel}>{t('cancel')}</Button>
                <Button onClick={onSave}>{t('save')}</Button>
            </DialogActions>
        </Dialog>
    );
}
