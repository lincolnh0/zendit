const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require("fs");
const yaml = require('js-yaml');
const { exec } = require('child_process')

ipcMain.on('select-directory', async (event, arg) => {
    
    const result = await dialog.showOpenDialog(win, {
        properties: ['openDirectory'],
        defaultPath: app.getPath('home'),
    })

    const responseObj = {
        filepath: result.filePaths,
        eligible: fs.existsSync(result.filePaths + '/.git'),
    }

    event.sender.send('directory-selected', responseObj);
        
    
})

ipcMain.on('get-branches', async (event, path) => {

    exec ('cd ' + path + ' && git branch', (err, stdout, stderr) => {
        if (err) {
            throw err;
        }
        else {
            const responseObj = {
                branches: stdout.split('\n'),
            }
            event.sender.send('branches-got', responseObj)
        }
        
    });
})

// Get settings from user data path.
ipcMain.on('get-settings', async (event, arg) => {

    let configFile = app.getPath('userData');
    const repoFolder  = app.getPath('userData') + '/repos/';
    let defaultConfig = {}
    switch (arg.repo) {
        case 'globals':
            configFile += '/globals.yml';
            defaultConfig = {
                jiraDomain: '',
                jiraToken: '',
                githubToken: '',
                prTemplate: '',
                commentTemplate: '',
                branchRegex: '',
              }
            break;
        default:
            configFile += '/repos/' + arg.repo + '.yml'
            defaultConfig = {
                directory: '',
                owner: '',
                repo: '',
                alias: '',
              }
            break;
    }

    // Create repos folder if doesn't exist
    if (!fs.existsSync(repoFolder)) {
        fs.mkdir(repoFolder, (err) => {
            if (err) {
                throw err;
            }
        })
    }

    // Writes default config if config file does not exist.
    if (!fs.existsSync(configFile)) {

        fs.writeFileSync(configFile, yaml.dump(defaultConfig), (err) => {
          if (err) {
            throw err;
          }
        })
        event.sender.send('settings-got', {
            repo: arg.repo,
            config: defaultConfig,
        });
    }
    else {
        try {
            const doc = yaml.load(fs.readFileSync(configFile, 'utf8'));
            event.sender.send('settings-got', {
                repo: arg.repo,
                config: doc,
            });
        } 
        catch (err) {
            throw err
        }
    }

    if ('init' in arg) {
        fs.readdir(repoFolder, (err, files) => {
            if (err) {
                throw err;
            }
            files.forEach(file => {
                fs.readFile(repoFolder + file, 'utf8', (err, data) => {
                    const doc = yaml.load(data);
                    event.sender.send('settings-got', {
                        repo: file.split('.')[0],
                        config: doc,
                    });
                });
            })
            
        })
    }
})

// Save settings to user data path.
ipcMain.on('save-settings', saveSettings);

async function saveSettings (event, arg) {
    let configFile = app.getPath('userData');
    switch (arg.repo) {
        case 'globals':
            configFile += '/globals.yml';
            break;
        default:
            configFile += '/repos/' + arg.repo + '.yml'
            break;
    }

    let combinedConfig = arg.config;
    // Merge new settings to unchanged previous settings.
    if (fs.existsSync(configFile) && arg.force_overwrite == false) {
        const existingConfig = yaml.load(fs.readFileSync(configFile, 'utf8'));
        combinedConfig = Object.assign(existingConfig, arg.config);   
    }

    fs.writeFileSync(configFile, yaml.dump(combinedConfig), (err) => {
        if (err) {
            console.log(err);
        }
    })


    if ('alias' in arg.config) {
        event.sender.send('reload');
    } else {   
        event.sender.send('settings-saved', { repo: arg.repo, trigger: arg.trigger });
    }
}


ipcMain.on('remove-repository', async (event, arg) => {

    fs.unlinkSync(app.getPath('userData') + '/repos/' + arg + '.yml');
    event.sender.send('reload');
})