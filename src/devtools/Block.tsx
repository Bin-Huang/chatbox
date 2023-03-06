import React, { useState } from 'react';
import { ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum } from 'openai';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import { ButtonGroup, Button, Card } from '@mui/material';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import PersonIcon from '@mui/icons-material/Person';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import SettingsIcon from '@mui/icons-material/Settings';
import { TextareaAutosize } from '@mui/base';

export type Message = ChatCompletionRequestMessage & {
    id: string
}

export interface Props {
    msg: Message
    setMsg?: (msg: Message) => void
    delMsg?: () => void
}

export default function Block(props: Props) {
    const { msg, setMsg } = props
    const [isEditing, setIsEditing] = useState(false)
    return (
        <Card
            onMouseEnter={() => {
                setIsEditing(true)
            }}
            onMouseLeave={() => {
                setIsEditing(false)
            }}
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                padding: '18px 0'
            }}
        >
            <Box sx={{
                display: 'flex',
                alignItems: 'flex-start',
                flexDirection: 'row',
                width: "80%"
            }}>
                <Box sx={{ textAlign: "center" }} >
                    <Select
                        value={msg.role}
                        onChange={(e: SelectChangeEvent) => {
                            setMsg && setMsg({ ...msg, role: e.target.value as ChatCompletionRequestMessageRoleEnum })
                        }}
                    >
                        <MenuItem value={ChatCompletionRequestMessageRoleEnum.System}>
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                                <Avatar><SettingsIcon /></Avatar>
                            </Box>
                        </MenuItem>
                        <MenuItem value={ChatCompletionRequestMessageRoleEnum.User}>
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                                <Avatar><PersonIcon /></Avatar>
                            </Box>
                        </MenuItem>
                        <MenuItem value={ChatCompletionRequestMessageRoleEnum.Assistant}>
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                                <Avatar><SmartToyIcon /></Avatar>
                            </Box>
                        </MenuItem>
                    </Select>
                </Box>

                <TextareaAutosize
                    style={{
                        fontSize: "1rem",
                        width: "100%",
                        border: "none",
                        outline: "none",
                        margin: "7px",
                        resize: "none",
                    }}
                    minRows={2}
                    placeholder="prompt"
                    value={msg.content}
                    onChange={(e) => { setMsg && setMsg({ ...msg, content: e.target.value }) }}
                />
            </Box>
            <Box sx={{width: '80px'}}>
                {
                    isEditing && <ButtonGroup
                        orientation="vertical"
                        aria-label="vertical outlined button group"
                    >
                        <Button onClick={props.delMsg}>
                            <HighlightOffIcon />
                        </Button>
                    </ButtonGroup>
                }
            </Box>

        </Card>
    );

}
