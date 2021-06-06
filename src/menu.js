const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

const mainProcess = require('./main');

const template = [
    {
        label: 'File',
        submenu: [
          {
            label: 'Preferences',
            accelerator: 'CommandOrControl+,',
            click(item, focusedWindow) {
                const settingsWindow = new BrowserWindow({
                    width: 1000, 
                    height: 750,
                    alwaysOnTop: true,
                    autoHideMenuBar: true,
                    skipTaskbar: true,
                    parent: focusedWindow,
                    resizable: false,
                    modal: true,
                    webPreferences: {
                        contextIsolation: true,
                        enableRemoteModule: false,
                        preload: path.join(__dirname, 'preload.js')
                    }
                });
                settingsWindow.loadFile(path.join(__dirname, '../dist/views/preferences.html'))
                settingsWindow.once('ready-to-show', () => {
                  settingsWindow.show()
                })
            }
          },
        ],
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CommandOrControl+Z',
          role: 'undo',
        },
        {
          label: 'Redo',
          accelerator: 'Shift+CommandOrControl+Z',
          role: 'redo',
        },
        { type: 'separator' },
        {
          label: 'Cut',
          accelerator: 'CommandOrControl+X',
          role: 'cut',
        },
        {
          label: 'Copy',
          accelerator: 'CommandOrControl+C',
          role: 'copy',
        },
        {
          label: 'Paste',
          accelerator: 'CommandOrControl+V',
          role: 'paste',
        },
        {
          label: 'Select All',
          accelerator: 'CommandOrControl+A',
          role: 'selectall',
        },
      ],
    },
    {
        label: 'Window',
        role: 'window',
        submenu: [
          {
            label: 'Reload',
            accelerator: 'CommandOrControl+R',
            role: 'reload'
          },
          {
            label: 'Minimize',
            accelerator: 'CommandOrControl+M',
            role: 'minimize',
          },
          {
            label: 'Close',
            accelerator: 'CommandOrControl+W',
            role: 'close',
          },
        ],
    },
    {
        label: 'Help',
        role: 'help',
        submenu: [
          {
            label: 'Visit Repository',
            click() { 
                shell.openExternal("https://github.com/lincolnh0/zendit")
             }
          },
          {
            label: 'Toggle Developer Tools',
            click(item, focusedWindow) {
              if (focusedWindow) focusedWindow.webContents.toggleDevTools();
            }
          }
        ],
      }
  ];

if (process.platform === 'darwin') {
  const name = 'Zendit';
  template.unshift({
    label: name,
    submenu: [
      {
        label: `About ${name}`,
        role: 'about',
      },
      { type: 'separator' },
      {
        label: 'Services',
        role: 'services',
        submenu: [],
      },
      { type: 'separator' },
      {
        label: `Hide ${name}`,
        accelerator: 'Command+H',
        role: 'hide',
      },
      {
        label: 'Hide Others',
        accelerator: 'Command+Alt+H',
        role: 'hideothers',
      },
      {
        label: 'Show All',
        role: 'unhide',
      },
      { type: 'separator' },
      {
        label: `Quit ${name}`,
        accelerator: 'Command+Q',
        click() { app.quit(); },
      },
    ],
  });
}



module.exports = Menu.buildFromTemplate(template);

