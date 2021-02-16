const { app, BrowserWindow, ipcMain, dialog } = require('electron');

const { Octokit } = require("@octokit/core");

const debug = true

ipcMain.on('create-pr', async (event, arg) => {

    if (debug) {
        setTimeout(() => {
            win.webContents.send('pr-created', {
                status:201,
                prLink: "https://google.com",
                prNumer: 1,
                owner: 'lincolnh0',
                repo: 'zendit',
            })
        }, 1000)
        return;
    }


    const octokit = new Octokit({ auth: arg.githubToken });
    const githubResponse = await octokit.request('POST /repos/{owner}/{repo}/pulls', {
        owner: arg.owner,
        repo: arg.repo,
        head: arg.head,
        base: arg.source,
        title: arg.title,
        body: arg.body,
    })

    if (githubResponse.status == 201) {
        const response = {
            status: githubResponse.status,
            prLink: githubResponse.data.html_url,
            prNumber: githubResponse.data.number,
            owner: arg.owner,
            repo: arg.repo,
        }
        win.webContents.send('pr-created', response);
    }
})

ipcMain.on('get-github-users', async (event, arg) => {

    if (debug) {
        win.webContents.send('github-users-got', {
            data: [{ login: 'linconh0' }]
        });
        return;
    }

    const octokit = new Octokit({ auth: arg.githubToken });
    try {
        const githubResponse = await octokit.request('GET /orgs/{org}/members?per_page=100', {
            org: arg.owner,
        })

        if (githubResponse.status == 200) {
            win.webContents.send('github-users-got', githubResponse);
        }
    }
    catch (err) {
        // err... usually a 404 is thrown when the owner is a user and not an org, only throw other error types
        if (err.status != 404) {
            throw err
        }
    }

})

ipcMain.on('request-review', async (event, arg) => {

    if (debug) {
        setTimeout(() => {
            win.webContents.send('review-requested', {
                status:201,
                prLink: "https://google.com",
                prNumer: 1,
                owner: 'lincolnh0',
                repo: 'zendit',
            })
        }, 1500)
        return;
    }

    const octokit = new Octokit({ auth: arg.githubToken });
    const githubResponse = await octokit.request('POST /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers', {
        owner: arg.owner,
        repo: arg.repo,
        pull_number: arg.prNumber,
        reviewers: arg.reviewers,
    })

    if (githubResponse.status == 201) {
        const response = {
            status: githubResponse.status,
            prLink: githubResponse.data.html_url,
            prNumber: githubResponse.data.number,
        }
        win.webContents.send('review-requested', response);
    }

})