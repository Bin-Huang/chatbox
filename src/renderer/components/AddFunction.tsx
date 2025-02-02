// AddFunction.tsx
import React, { useState } from 'react'
import { Button, TextField, Typography, Box, List, ListItem, IconButton } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import { useTranslation } from 'react-i18next'

export interface AddFunctionType {
    name: string;
    description: string;
  }
  
  export interface Props {
    functions: AddFunctionType[]
    onFunctionsChange: (functions: AddFunctionType[]) => void
  }


  export default function AddFunction(props: Props) {
    const { t } = useTranslation()
    const [newFunctionName, setNewFunctionName] = useState('')
    const [newFunctionDescription, setNewFunctionDescription] = useState('')
  
    const handleAddFunction = () => {
      if (newFunctionName && newFunctionDescription) {
        const newFunction: AddFunctionType = {
          name: newFunctionName,
          description: newFunctionDescription,
        }
        props.onFunctionsChange([...props.functions, newFunction])
        setNewFunctionName('')
        setNewFunctionDescription('')
      }
    }
  
  const handleRemoveFunction = (index: number) => {
    const updatedFunctions = props.functions.filter((_, i) => i !== index)
    props.onFunctionsChange(updatedFunctions)
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        {t('Functions')}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label={t('Function Name')}
          value={newFunctionName}
          onChange={(e) => setNewFunctionName(e.target.value)}
          fullWidth
          size="small"
        />
        <TextField
          label={t('Function Description')}
          value={newFunctionDescription}
          onChange={(e) => setNewFunctionDescription(e.target.value)}
          fullWidth
          size="small"
          multiline
          rows={2}
        />
        <Button variant="contained" onClick={handleAddFunction} disabled={!newFunctionName || !newFunctionDescription}>
          {t('Add Function')}
        </Button>
      </Box>
      <List>
        {props.functions.map((func, index) => (
          <ListItem key={index} secondaryAction={
            <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveFunction(index)}>
              <DeleteIcon />
            </IconButton>
          }>
            <Typography>
              <strong>{func.name}</strong>: {func.description}
            </Typography>
          </ListItem>
        ))}
      </List>
    </Box>
  )
}
