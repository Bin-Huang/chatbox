import { IconButton, ListItemIcon, MenuItem, MenuList, Tooltip } from '@mui/material';
import { ThemeMode } from '.';
import { useThemeSwicher } from './ThemeSwitcher';
import BrightnessMediumIcon from '@mui/icons-material/BrightnessMedium';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import WbSunnyIcon from '@mui/icons-material/WbSunny';

const ThemeModeMapIcon: Record<ThemeMode, React.ReactNode> = {
    [ThemeMode.Dark]: <DarkModeIcon />,
    [ThemeMode.Light]: <WbSunnyIcon />,
    [ThemeMode.System]: <BrightnessMediumIcon />,
};

const menuItems = [ThemeMode.System, ThemeMode.Dark, ThemeMode.Light];

export default function ThemeChangeIcon() {
    const [mode, { setMode }] = useThemeSwicher();

    return (
        <Tooltip
            title={
                <MenuList sx={{ width: 60 }}>
                    {menuItems.map(item => (
                        <MenuItem onClick={() => setMode(item)} key={item}>
                            <ListItemIcon sx={{ color: '#fff' }}>{ThemeModeMapIcon[item]}</ListItemIcon>
                        </MenuItem>
                    ))}
                </MenuList>
            }
            arrow>
            <IconButton>{ThemeModeMapIcon[mode]}</IconButton>
        </Tooltip>
    );
}
