const { app, BrowserWindow, ipcMain, dialog } = require('electron');

const { Octokit } = require("@octokit/core");



ipcMain.on('create-pr', async (event, arg) => {

    // local network simulation
    setTimeout(() => {
        const response = {
            status: 201,
            prLink: 'https://google.com',
        }
        win.webContents.send('pr-created', response);
    }, 2000)
    return;
    const octokit = new Octokit({ auth: arg.githubToken });
    const githubResponse = await octokit.request('POST /repos/{owner}/{repo}/pulls', {
        owner: arg.owner,
        repo: arg.repo,
        head: arg.head,
        base: arg.source,
        title: arg.title,
        body: arg.body,
    })

    console.log(githubResponse);

    if (githubResponse.status == 201) {
        const response = {
            status: githubResponse.status,
            prLink: response.data.html_url,
        }
        win.webContents.send('pr-created', response);
    }
})