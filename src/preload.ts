// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer, nativeTheme } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', <ExposeInMainWindowAPI>{
    invoke: ipcRenderer.invoke,
    // receive: (channel: string, func) => {
    //     let validChannels = ['fromMain'];
    //     if (validChannels.includes(channel)) {
    //         // Deliberately strip event as it includes `sender`
    //         ipcRenderer.on(channel, (event, ...args) => func(...args));
    //     }
    // },

    onSystemThemeChange: (callback) => {
        ipcRenderer.on('native-theme-updated', callback);

        return () => ipcRenderer.off('native-theme-updated', callback);
    },
});
