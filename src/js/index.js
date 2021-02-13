// Helper function to load methods once document is loaded.
function ready(fn) {
    if (document.readyState != 'loading') {
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', fn);
    }
}

function add_event_listeners_to_form() {
    // Add form related event listeners.
    btnRefreshRepos.addEventListener('click', () => populate_repositories())

    selectRepository.addEventListener('change', (e) => populate_branches())

    tbxHeadBranch.addEventListener('input', () => autofill_title())

    btnSubmit.addEventListener('click', () => submit_pr())
    populate_repositories()
}

ready(add_event_listeners_to_form)
let loadedConfigs = {}

function populate_repositories() {
    window.zendit.send('get-settings', { repo: 'globals', init: true });

}

function populate_branches() {
    
    tbxSourceBranch.value = '';
    tbxHeadBranch.value = '';
    btnSubmit.disabled = selectRepository.value == 0;

    if ('prTemplate' in loadedConfigs[selectRepository.value]) {
        tbxPR.value = loadedConfigs[selectRepository.value].prTemplate;
    }
    else {
        tbxPR.value = loadedConfigs['globals'].prTemplate;
    }

    if ('commentTemplate' in loadedConfigs[selectRepository.value]) {
        CKEDITOR.instances['tbxJiraComment'].setData(loadedConfigs[selectRepository.value].commentTemplate);
    }
    else {
        CKEDITOR.instances['tbxJiraComment'].setData(loadedConfigs['globals'].commentTemplate);
    }


    populate_github_users()
    window.zendit.send('get-branches', loadedConfigs[selectRepository.value].directory)
}

function populate_jira_users() {
    window.zendit.send('get-jira-users', {
        jiraDomain: loadedConfigs['globals'].jiraDomain,
        jiraToken: loadedConfigs['globals'].jiraToken,
        jiraEmail: loadedConfigs['globals'].jiraEmail,
    })
}

function populate_github_users() {
    if (githubUsers.dataset.owner != loadedConfigs[selectRepository.value].owner) {
        while (githubUsers.firstChild) {
            githubUsers.removeChild(githubUsers.lastChild)
        }
        githubUsers.dataset.owner = loadedConfigs[selectRepository.value].owner;
        window.zendit.send('get-github-users', {
            owner: loadedConfigs[selectRepository.value].owner,
            githubToken: loadedConfigs['globals'].githubToken,
        })
    }
}

function autofill_title() {
    branchList.childNodes.forEach((element) => {
        if (tbxHeadBranch.value == element.value) {
            tbxPRTitle.value = tbxHeadBranch.value;
        }
    })
}

function return_token_object() {
    return {
        ticketNo: tbxHeadBranch.value.split('/')[0],

    }
}

function submit_pr() {
    if (tbxHeadBranch.value != tbxSourceBranch.value) {
        // Prepare ui to prevent double entry + feedback
        btnSubmit.disabled = true;
        btnSubmit.dataset.originalText = btnSubmit.innerHTML;
        btnSubmit.innerText = 'Loading';
        
        // Preprocess tokens. need better implementation.
        tokenObj = return_token_object()
        const processedBody = tbxPR.value.replace('[ticketNo]', tokenObj.ticketNo)
        
        let requestObject = {
            githubToken: loadedConfigs['globals'].githubToken,
            owner: loadedConfigs[selectRepository.value].owner,
            repo: loadedConfigs[selectRepository.value].repo,
            head: tbxHeadBranch.value,
            source: tbxSourceBranch.value,
            title: tbxPRTitle.value,
            body: processedBody,
        }

        window.zendit.send('create-pr', requestObject);
    }
}

function submit_jira_comment(data) {
    window.zendit.send('create-jira-comment', {
        ticketNo: tbxHeadBranch.value.split('/')[0],
        jiraDomain: loadedConfigs['globals'].jiraDomain,
        jiraToken: loadedConfigs['globals'].jiraToken,
        jiraEmail: loadedConfigs['globals'].jiraEmail,
        prLink: data.prLink
    })

}

function free_submit_buttons() {
    setTimeout(() => {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = btnSubmit.dataset.originalText;
        cbxPRCreated.checked = false;
        cbxCommentCreated.checked = false;

    }, 1500)
}

// Populate branch data list.
window.zendit.receive('branches-got', (data) => {
    branchList.innerHTML = '';

    let branches = data.branches.filter((elem) => { if (elem != '') return elem; })
    branches.forEach(element => {
        branchName = element.split(' ').pop();
        branchOption = document.createElement('option');
        branchOption.value = branchName;
        branchOption.innerText = branchName;
        branchList.appendChild(branchOption)
        if (branchName == 'master' || branchName == 'main') {
            tbxSourceBranch.value = branchName;
        }
    });
})

// Populate fields with retrieved settings
window.zendit.receive('settings-got', (data) => {
    if (data.repo == 'globals') {
        data.config.alias = 'Global'
        loadedConfigs[data.repo] = data.config;
        populate_jira_users()
    }
    else {
        if (data.repo in loadedConfigs == false) {
            const newRepoOption = document.createElement('option')
            newRepoOption.value = data.repo
            newRepoOption.innerText = data.config.alias
            selectRepository.appendChild(newRepoOption)
        }
        loadedConfigs[data.repo] = data.config;
    }
    
    if (selectRepository.childNodes.length > 0) {
        populate_branches()
    }

})

// On PR creation
window.zendit.receive('pr-created', (data) => {
    // UI feedback.
    if (data.status == 201) {

        cbxPRCreated.checked = true;

        if (tbxReviewer.value != '') {
            githubUsers.childNodes.forEach((element) => {
                if (tbxReviewer.value == element.value) {
                    data = Object.assign(data, {
                        githubToken: loadedConfigs['globals'].githubToken,
                        reviewers: [tbxReviewer.value],
                    })
                    window.zendit.send('request-review', data)
                }
            })
        }
        
        if (CKEDITOR.instances['tbxJiraComment'].getData() != '') {
            // Initiate jira comment.
            submit_jira_comment(data)
        }
        else {
            free_submit_buttons();
        }
    }

})


// On PR creation
window.zendit.receive('jira-comment-created', (data) => {
    // UI feedback.
    if (data.status == 201) {

        cbxCommentCreated.checked = true;
        free_submit_buttons();

        
    }

    
})

window.zendit.receive('jira-users-got', (data) => {
    for (const index in data.users) {
        jiraUserOption = document.createElement('option');
        jiraUserOption.value = data.users[index].name;
        jiraUserOption.dataset.accountId = data.users[index].id;
        jiraUsers.appendChild(jiraUserOption)
    }
})

window.zendit.receive('github-users-got', (data) => {
    data.data.forEach((user) => {
        githubUserOption = document.createElement('option');
        githubUserOption.value = user.login;
        githubUsers.appendChild(githubUserOption)
    })
})

window.zendit.receive('review-requested', (data) => {
    console.log(data)
})