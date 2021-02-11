const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require("fs");

const { exec } = require('child_process');
const { report } = require('process');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

let win;

async function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({
    width: 800,
    height: 900,
    webPreferences: {
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // and load the index.html of the app.
  win.loadFile(path.join(__dirname, '../dist/views/index.html'));

};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

ipcMain.on('select-directory', async (event, arg) => {
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory'],
    defaultPath: app.getPath('home'),
  })

  responseObj = {
    filepath: result.filePaths,
    eligible: fs.existsSync(result.filePaths + '/.git'),
  }

  if (!responseObj.eligible) {
    win.webContents.send('selected-directory', responseObj);
    return;
  }

  exec ('cd ' + responseObj.filepath + ' && git branch', (err, stdout, stderr) => {
    if (err) {
      responseObj.eligible = false;
      win.webContents.send('selected-directory', responseObj)
      return;
    }
    responseObj.branches = stdout.split('\n');
    win.webContents.send('selected-directory', responseObj)
    
  });
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
