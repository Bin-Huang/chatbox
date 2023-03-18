
interface ExposeInMainWindowAPI {
    onSystemThemeChange: (callback: () => void) => () => void;
    invoke: (channel: string, ...args: any[]) => Promise<any>;
}

declare const api: ExposeInMainWindowAPI;
