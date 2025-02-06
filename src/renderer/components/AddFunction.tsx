import React, { useState, useEffect } from 'react'
import {
  Button,
  TextField,
  Typography,
  Box,
  List,
  ListItem,
  IconButton,
  Switch,
  FormControlLabel
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import SaveIcon from '@mui/icons-material/Save'
import CancelIcon from '@mui/icons-material/Cancel'
import { useTranslation } from 'react-i18next'

export interface AddFunctionType {
  // "name" can be used to label or group these definitions.
  name: string
  // "description" contains the entire JSON schema that the user wants to define.
  description: string
}

export interface Props {
  functions: AddFunctionType[]
  onFunctionsChange: (functions: AddFunctionType[]) => void
}

export default function AddFunction(props: Props) {
  const { t } = useTranslation()

  // Load the saved enable/disable state from localStorage
  const [functionsEnabled, setFunctionsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('functionsEnabled')
    return saved ? JSON.parse(saved) : false
  })

  // States for creating a new function
  const [newFunctionName, setNewFunctionName] = useState('')
  const [newFunctionDescription, setNewFunctionDescription] = useState('')

  // States for editing an existing function
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingDescription, setEditingDescription] = useState('')

  // If functions are enabled on mount, save to localStorage
  useEffect(() => {
    if (functionsEnabled) {
      localStorage.setItem('functions', JSON.stringify(props.functions))
    }
  }, [])

  // Save the enable/disable flag whenever it changes
  useEffect(() => {
    localStorage.setItem('functionsEnabled', JSON.stringify(functionsEnabled))
  }, [functionsEnabled])

  // Save entire function objects whenever they change
  useEffect(() => {
    if (functionsEnabled) {
      localStorage.setItem('functions', JSON.stringify(props.functions))
    }
  }, [props.functions, functionsEnabled])

  // We can keep a basic naming rule, or remove if you prefer
  const isValidFunctionName = (name: string): boolean => {
    return /^[a-zA-Z0-9_]+$/.test(name)
  }

  const handleToggleFunctions = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFunctionsEnabled(event.target.checked)
    if (!event.target.checked) {
      // Clear saved functions if user toggles off
      localStorage.removeItem('functions')
    } else {
      // Restore or re-save if toggled on
      localStorage.setItem('functions', JSON.stringify(props.functions))
    }
  }

  const handleAddFunction = () => {
    if (newFunctionName && newFunctionDescription && isValidFunctionName(newFunctionName)) {
      try {
        const parsedDescription = JSON.parse(newFunctionDescription);
        
        // Ensure the parsed description has the correct structure
        if (!parsedDescription.type || parsedDescription.type !== 'function' || !parsedDescription.function) {
          throw new Error("Invalid function structure");
        }
  
        const newFunction = {
          type: "function",
          function: {
            name: parsedDescription.function.name,
            description: parsedDescription.function.description,
            parameters: parsedDescription.function.parameters
          }
        };
  
        const updatedFunctions = [...props.functions, newFunction];
        props.onFunctionsChange(updatedFunctions);
        localStorage.setItem('functions', JSON.stringify(updatedFunctions));
        setNewFunctionName('');
        setNewFunctionDescription('');
      } catch (error) {
        console.error("Error parsing function JSON:", error);
        // Show an error message to the user
      }
    }
  };
  
  
  

  const handleRemoveFunction = (index: number) => {
    const updatedFunctions = props.functions.filter((_, i) => i !== index)
    props.onFunctionsChange(updatedFunctions)
    localStorage.setItem('functions', JSON.stringify(updatedFunctions))
  }

  const handleEditFunction = (index: number) => {
    const func = props.functions[index]
    setEditingIndex(index)
    setEditingName(func.name)
    setEditingDescription(func.description)
  }

  const handleSaveEdit = (index: number) => {
    if (isValidFunctionName(editingName)) {
      const updatedFunctions = [...props.functions]
      updatedFunctions[index] = {
        name: editingName,
        description: editingDescription
      }
      props.onFunctionsChange(updatedFunctions)
      localStorage.setItem('functions', JSON.stringify(updatedFunctions))

      setEditingIndex(null)
      setEditingName('')
      setEditingDescription('')
    }
  }

  const handleCancelEdit = () => {
    setEditingIndex(null)
    setEditingName('')
    setEditingDescription('')
  }

  return (
    <Box sx={{ mt: 2 }}>
      <FormControlLabel
        control={
          <Switch
            checked={functionsEnabled}
            onChange={handleToggleFunctions}
            color="primary"
          />
        }
        label={t('Enable Functions')}
      />
      {functionsEnabled && (
        <>
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
              error={
                !isValidFunctionName(newFunctionName) &&
                newFunctionName !== ''
              }
              helperText={
                !isValidFunctionName(newFunctionName) &&
                newFunctionName !== ''
                  ? 'Invalid function name. Use only letters, numbers, and underscores.'
                  : ''
              }
            />
            <TextField
              label={t('Function JSON Schema')}
              value={newFunctionDescription}
              onChange={(e) => setNewFunctionDescription(e.target.value)}
              fullWidth
              size="small"
              multiline
              minRows={4}
              helperText="Paste your entire JSON function schema here."
            />
            <Button
              variant="contained"
              onClick={handleAddFunction}
              disabled={
                !newFunctionName ||
                !newFunctionDescription ||
                !isValidFunctionName(newFunctionName)
              }
            >
              {t('Add Function')}
            </Button>
          </Box>
          <List>
            {props.functions.map((func, index) => (
              <ListItem
                key={index}
                secondaryAction={
                  editingIndex === index ? (
                    <>
                      <IconButton
                        edge="end"
                        aria-label="save"
                        onClick={() => handleSaveEdit(index)}
                      >
                        <SaveIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        aria-label="cancel"
                        onClick={handleCancelEdit}
                      >
                        <CancelIcon />
                      </IconButton>
                    </>
                  ) : (
                    <>
                      <IconButton
                        edge="end"
                        aria-label="edit"
                        onClick={() => handleEditFunction(index)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => handleRemoveFunction(index)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </>
                  )
                }
              >
                {editingIndex === index ? (
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1,
                      width: '100%'
                    }}
                  >
                    <TextField
                      label={t('Function Name')}
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      fullWidth
                      size="small"
                      error={!isValidFunctionName(editingName)}
                      helperText={
                        !isValidFunctionName(editingName)
                          ? 'Invalid function name. Use only letters, numbers, and underscores.'
                          : ''
                      }
                    />
                    <TextField
                      label={t('Function JSON Schema')}
                      value={editingDescription}
                      onChange={(e) => setEditingDescription(e.target.value)}
                      fullWidth
                      size="small"
                      multiline
                      minRows={4}
                    />
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {func.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ whiteSpace: 'pre-wrap', mt: 1 }}
                    >
                      {func.description}
                    </Typography>
                  </Box>
                )}
              </ListItem>
            ))}
          </List>
        </>
      )}
    </Box>
  )
}
