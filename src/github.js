const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { exec, execSync } = require('child_process')

const { Octokit } = require("@octokit/core");

const debug = false

ipcMain.on('create-pr', async (event, arg) => {

    if (debug) {
        setTimeout(() => {
            event.sender.send('pr-created', {
                status:201,
                prLink: "https://google.com",
                prNumer: 1,
                owner: 'lincolnh0',
                repo: 'zendit',
            })
        }, 1000)
        return;
    }

    // Force an upstream push in case there isn't a remote branch.
    execSync ('cd ' + arg.directory + ' && git push --set-upstream origin ' + arg.head + ' 2> /dev/null', (err, stdout, stderr) => {
        if (err) {
            console.log(err)
            throw err;
        }
        
    });

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
        event.sender.send('pr-created', response);
    }
})

ipcMain.on('get-github-users', async (event, arg) => {

    if (debug) {
        event.sender.send('github-users-got', {
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
            event.sender.send('github-users-got', githubResponse);
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
            event.sender.send('review-requested', {
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
        event.sender.send('review-requested', response);
    }

})