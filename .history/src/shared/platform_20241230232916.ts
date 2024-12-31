export const isElectron = () => {
    return typeof window !== 'undefined' && window.process && window.process.type === 'renderer';
};

export const isMobile = () => {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const isAndroid = () => {
    if (typeof window === 'undefined') return false;
    return /Android/i.test(navigator.userAgent);
};

export const isIOS = () => {
    if (typeof window === 'undefined') return false;
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
};

export const getPlatform = () => {
    if (isElectron()) return 'electron';
    if (isAndroid()) return 'android';
    if (isIOS()) return 'ios';
    return 'web';
}; 