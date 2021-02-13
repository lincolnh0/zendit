const {
    contextBridge,
    ipcRenderer,
    dialog
} = require("electron");


// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
    "zendit", {
        send: (channel, data) => {
            // whitelist channels
            let validChannels = ['select-directory', 'get-settings', 'save-settings', 'get-branches', 'create-pr'];
            if (validChannels.includes(channel)) {
                ipcRenderer.send(channel, data);
            }
        },
        receive: (channel, func) => {
            let validChannels = ['directory-selected', 'settings-got', 'settings-saved', 'branches-got'];
            if (validChannels.includes(channel)) {
                // Deliberately strip event as it includes `sender` 
                ipcRenderer.on(channel, (event, ...args) => func(...args));
            }
        },
    }
);
