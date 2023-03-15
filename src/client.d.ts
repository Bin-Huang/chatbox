interface ExposeInMainWindowAPI {
    onSystemThemeChange: (callback: () => void) => () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    invoke: (channel: string, ...args: any[]) => Promise<any>;
}

declare const api: ExposeInMainWindowAPI;
