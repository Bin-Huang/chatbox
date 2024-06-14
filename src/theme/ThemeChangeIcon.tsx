import { Button, ButtonGroup } from '@mui/material'
import { ThemeMode } from '.'
import BrightnessMediumIcon from '@mui/icons-material/BrightnessMedium'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import WbSunnyIcon from '@mui/icons-material/WbSunny'

const ThemeModeMapIcon: Record<ThemeMode, React.ReactNode> = {
    [ThemeMode.Dark]: <DarkModeIcon />,
    [ThemeMode.Light]: <WbSunnyIcon />,
    [ThemeMode.System]: <BrightnessMediumIcon />,
}

const menuItems = [ThemeMode.System, ThemeMode.Dark, ThemeMode.Light]

interface ThemeChangeIconProps {
    onChange: (value: ThemeMode) => void
    value: ThemeMode
}

export default function ThemeChangeButton(props: ThemeChangeIconProps) {
    return (
        <ButtonGroup>
            {menuItems.map((item) => (
                <Button
                    key={item}
                    color={item === props.value ? 'primary' : 'inherit'}
                    onClick={() => props.onChange(item)}
                >
                    {ThemeModeMapIcon[item]}
                </Button>
            ))}
        </ButtonGroup>
    )
}
