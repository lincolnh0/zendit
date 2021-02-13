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

    btnSubmit.addEventListener('click', () => submit_pr_and_comment())
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
    window.zendit.send('get-branches', loadedConfigs[selectRepository.value].directory)
}


function autofill_title() {
    branchList.childNodes.forEach((element) => {
        if (tbxHeadBranch.value == element.value) {
            tbxPRTitle.value = tbxHeadBranch.value;
        }
    })
}

function submit_pr_and_comment() {
    window.zendit.send('create-pr', {
        githubToken: loadedConfigs['globals'].githubToken,
        owner: loadedConfigs[selectRepository.value].owner,
        repo: loadedConfigs[selectRepository.value].repo,
        head: tbxHeadBranch.value,
        source: tbxSourceBranch.value,
        title: tbxPRTitle.value,
        body: tbxPR.value,
    });
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

    });
})

// Populate fields with retrieved settings
window.zendit.receive('settings-got', (data) => {
    if (data.repo == 'globals') {
        data.config.alias = 'Global'
    }
    else {

        if (data.repo in loadedConfigs == false) {
            const newRepoOption = document.createElement('option')
            newRepoOption.value = data.repo
            newRepoOption.innerText = data.config.alias
            selectRepository.appendChild(newRepoOption)
        }
    }
    loadedConfigs[data.repo] = data.config;
    if (selectRepository.childNodes.length > 0) {
        populate_branches()
    }

})
