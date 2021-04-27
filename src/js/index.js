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

// Global config storage in memory, instead of loading files on runtime.
let loadedConfigs = {}

function populate_repositories() {
    window.zendit.send('get-settings', { repo: 'globals', init: true });
}


// Request local branch.
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

// Requests jira users.
function populate_jira_users() {
    window.zendit.send('get-jira-users', {
        jiraDomain: loadedConfigs['globals'].jiraDomain,
        jiraToken: loadedConfigs['globals'].jiraToken,
        jiraEmail: loadedConfigs['globals'].jiraEmail,
    })
}


function populate_jira_groups() {
    window.zendit.send('get-jira-groups', {
        jiraDomain: loadedConfigs['globals'].jiraDomain,
        jiraToken: loadedConfigs['globals'].jiraToken,
        jiraEmail: loadedConfigs['globals'].jiraEmail,
    })
}

// Request github users.
function populate_github_users() {
    if (githubUsers.dataset.owner != loadedConfigs[selectRepository.value].owner) {
        githubUsers.dataset.owner = loadedConfigs[selectRepository.value].owner;
        window.zendit.send('get-github-users', {
            owner: loadedConfigs[selectRepository.value].owner,
            githubToken: loadedConfigs['globals'].githubToken,
        })
    }
}

// Fill title when a head branch is selected.
function autofill_title() {
    // For branch naming format ISSUE-KEY/branch-name

    branchList.childNodes.forEach((element) => {
        if (tbxHeadBranch.value == element.value) {
            const issueKey = tbxHeadBranch.value.split('/')[0];
            const branchName = tbxHeadBranch.value.split('/')[1];
            tbxPRTitle.value = issueKey + ': ' + branchName.replaceAll('-', ' ');
        }
    })

    // Retreive ticket transitions from title.
    window.zendit.send('get-jira-transitions', {
        jiraDomain: loadedConfigs['globals'].jiraDomain,
        jiraToken: loadedConfigs['globals'].jiraToken,
        jiraEmail: loadedConfigs['globals'].jiraEmail,
        ticketNo: regex_branch_to_ticket(tbxHeadBranch.value),
    })
}

// TODO: obtains a token mapping.
function return_token_object() {
    return {
        ticketNo: regex_branch_to_ticket(tbxHeadBranch.value),

    }
}


// Submits PR via github api.
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

// Breaking down Jira comment from raw html to a { node_type: content } nested array
function child_nodes_recursive(elem) {
    if (elem.childNodes.length > 0) {
        
        return {
            type: elem.nodeName,
            children: Array.from(elem.childNodes).map(child => child_nodes_recursive(child)),
        }
    }
    else {
        if (elem.nodeValue != null) {
            return elem.nodeValue;
        }
        else {
            return elem.nodeName
        }
    }
    
}

// Creates jira comment via jira api
function submit_jira_comment(data) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(CKEDITOR.instances['tbxJiraComment'].getData(), 'text/html')
    const bodyObject = child_nodes_recursive(doc.body)
    let requestObject = {
        ticketNo: regex_branch_to_ticket(tbxHeadBranch.value),
        jiraDomain: loadedConfigs['globals'].jiraDomain,
        jiraToken: loadedConfigs['globals'].jiraToken,
        jiraEmail: loadedConfigs['globals'].jiraEmail,
        visibility: selectJiraGroup.value,
        transition: selectTransition.value,
        timeSpent: tbxTimelog.value,
        body: bodyObject,
        tokens: {
            prLink: {
                type:'link',
                arg: [data.prLink, data.prLink],
            }

        }
        }
    if (tbxJiraUser.value != '') {
        jiraUsers.childNodes.forEach((element) => {
            if (tbxJiraUser.value == element.value) {
                requestObject.tokens.assignee = {
                    type: 'mention',
                    arg: [element.dataset.accountId, tbxJiraUser.value]
                }

            }
        })
    }
    window.zendit.send('create-jira-comment', requestObject)

}

// TODO: apply stored regex to branch name to get ticket number
function regex_branch_to_ticket(branch) {
    return branch.split('/')[0];
}

// Re-enable submit buttons.
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
    // Store global config.
    if (data.repo == 'globals') {
        data.config.alias = 'Global'
        loadedConfigs[data.repo] = data.config;
        populate_jira_users()
        populate_jira_groups()
    }
    else {

        // Add config to memory if not stored already.
        if (data.repo in loadedConfigs == false) {
            const newRepoOption = document.createElement('option')
            newRepoOption.value = data.repo
            newRepoOption.innerText = data.config.alias
            selectRepository.appendChild(newRepoOption)
        }
        loadedConfigs[data.repo] = data.config;
    }
    
    // The initial setting to arrive is globals, so dropdown will still be empty.
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


// On comment creation
window.zendit.receive('jira-comment-created', (data) => {
    // UI feedback.
    if (data.status == 201) {

        cbxCommentCreated.checked = true;
        free_submit_buttons();

        const requestObject = {
            ticketNo: data.ticketNo,
            transition: data.transition,
            timeSpent: data.timeSpent,
            jiraDomain: loadedConfigs['globals'].jiraDomain,
            jiraToken: loadedConfigs['globals'].jiraToken,
            jiraEmail: loadedConfigs['globals'].jiraEmail,
            accountId: data.assignee.arg[0],
        }
        window.zendit.send('assign-jira-ticket', requestObject)
        
    }

    
})

// On jira users list fetched.
window.zendit.receive('jira-users-got', (data) => {
    while (jiraUsers.firstChild) {
        jiraUsers.removeChild(githubUsers.lastChild)
    }
    for (const index in data.users) {
        jiraUserOption = document.createElement('option');
        jiraUserOption.value = data.users[index].name;
        jiraUserOption.dataset.accountId = data.users[index].id;
        jiraUsers.appendChild(jiraUserOption)
    }
})

// On github users list fetched.
window.zendit.receive('github-users-got', (data) => {
    while (githubUsers.firstChild) {
        githubUsers.removeChild(githubUsers.lastChild)
    }
    data.data.forEach((user) => {
        githubUserOption = document.createElement('option');
        githubUserOption.value = user.login;
        githubUsers.appendChild(githubUserOption)
    })
})

// On github PR review success
window.zendit.receive('review-requested', (data) => {
    // Currently don't have any ui feedback regarding successful review request, only reports error.
    if (data.status != 201) {
        alert('PR review request failed.')
    }
})

// On ticket reassignment success
window.zendit.receive('jira-ticket-assigned', (data) => {
    // Currently don't have any ui feedback regarding successful reassignment request, only reports error.
    if (data.status != 204) {
        alert('Failed to reassign ticket.')
    }
})

// Populate available transitions.
window.zendit.receive('jira-transitions-got', (data) => {
    while (selectTransition.firstChild) {
        selectTransition.removeChild(selectTransition.lastChild)
    }
    data.transitions.forEach(transition => {
        transitionOption = document.createElement('option')
        transitionOption.value = transition.id
        transitionOption.innerText = transition.name
        selectTransition.appendChild(transitionOption)
    })
})

window.zendit.receive('jira-groups-got', (data) => {
    while (selectJiraGroup.firstChild) {
        selectJiraGroup.removeChild(selectJiraGroup.lastChild)
    }

    groupOption = document.createElement('option')
    groupOption.innerText = "None"
    groupOption.value = "_none"
    selectJiraGroup.appendChild(groupOption)

    data.groups.forEach(group => {
        groupOption = document.createElement('option')
        groupOption.innerText = group.name
        groupOption.value = group.name
        selectJiraGroup.appendChild(groupOption)
    })
})

window.zendit.receive('jira-ticket-transitioned', (data) => {
    if (data.status != 201) {
        alert('Failed to transition ticket.')
    }
})

window.zendit.receive('jira-time-logged', (data) => {
    if (data.status != 201) {
        alert('Failed to transition ticket.')
    }
})