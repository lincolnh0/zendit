const {
    contextBridge,
    ipcRenderer,
    dialog
} = require("electron");


// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object

// Currently using two main channels, can break them down further into individual specific functions.
contextBridge.exposeInMainWorld(
    "zendit", {
        send: (channel, data) => {
            // whitelist channels
            let validChannels = [
                'select-directory',
                'get-settings',
                'save-settings',
                'get-branches',
                'create-pr',
                'get-github-users',
                'request-review',
                'get-jira-users',
                'create-jira-comment',
                'assign-jira-ticket',
                'get-jira-transitions',
                'get-jira-groups',
            ];
            if (validChannels.includes(channel)) {
                ipcRenderer.send(channel, data);
            }
        },
        receive: (channel, func) => {
            let validChannels = [
                'directory-selected',
                'settings-got',
                'settings-saved',
                'branches-got',
                'pr-created',
                'github-users-got',
                'review-requested',
                'jira-users-got',
                'jira-comment-created',
                'jira-ticket-assigned',
                'jira-transitions-got',
                'jira-groups-got',
            ];
            if (validChannels.includes(channel)) {
                // Deliberately strip event as it includes `sender` 
                ipcRenderer.on(channel, (event, ...args) => func(...args));
            }
        },
    }
);
