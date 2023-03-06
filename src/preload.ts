// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
    "api", {
        invoke: ipcRenderer.invoke,
        // receive: (channel: string, func) => {
        //     let validChannels = ["fromMain"];
        //     if (validChannels.includes(channel)) {
        //         // Deliberately strip event as it includes `sender` 
        //         ipcRenderer.on(channel, (event, ...args) => func(...args));
        //     }
        // }
    }
);
