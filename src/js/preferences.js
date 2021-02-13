// Helper function to load methods once document is loaded.
function ready(fn) {
    if (document.readyState != 'loading') {
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', fn);
    }
}


function add_event_listeners_to_form() {
    // Add event listeners.
    btnSaveAccount.addEventListener('click', (e) => save_accounts(e))
    btnSaveTemplate.addEventListener('click', (e) => save_templates(e))
    btnResetTemplate.addEventListener('click', (e) => reset_templates(e))
    btnAddRepo.addEventListener('click', (e) => add_repo(e))

    btnShowGithub.addEventListener('click', (e) => toggle_token_fields(e, btnShowGithub.dataset.target))
    btnShowJira.addEventListener('click', (e) => toggle_token_fields(e, btnShowJira.dataset.target))

    btnSelectDirectory.addEventListener('click', () => {window.zendit.send('select-directory')})


    selectRepository.addEventListener('change', (e) => update_templates())

    window.zendit.send('get-settings', { repo: 'globals', init: true });
}

ready(add_event_listeners_to_form)

let loadedConfigs = {}

function save_accounts(e) {
    let buttonNode = e.target;
    if (e.target.nodeName == 'I' || e.target.nodeName == 'SPAN') {
        buttonNode = e.target.parentNode;
    }

    buttonNode.disabled = true;
    const configObject = {
        repo: 'globals',
        config: {
            githubToken: document.getElementById('github-api-token').value,
            jiraDomain: document.getElementById('jira-domain').value,
            jiraToken: document.getElementById('jira-api-token').value,
            jiraEmail: document.getElementById('jira-email').value,
        },
        trigger: buttonNode.id,
        force_overwrite: false,
    }

    window.zendit.send('save-settings', configObject);
}

function save_templates(e) {
    let buttonNode = e.target;
    if (e.target.nodeName == 'I' || e.target.nodeName == 'SPAN') {
        buttonNode = e.target.parentNode;
    }
    buttonNode.disabled = true;
    const configObject = {
        repo: selectRepository.value,
        config: {
            prTemplate: document.getElementById('pr-template').value,
            commentTemplate: CKEDITOR.instances['jira-comment-template'].getData(),
            branchRegex: tbxBranchRegex.value
        },
        trigger: buttonNode.id,
        force_overwrite: false,
    }

    
    window.zendit.send('save-settings', configObject);

}

function reset_templates(e) {
    let buttonNode = e.target;
    if (e.target.nodeName == 'I' || e.target.nodeName == 'SPAN') {
        buttonNode = e.target.parentNode;
    }

    if (selectRepository.value == 'globals') {
        return;
    }
    delete loadedConfigs[selectRepository.value].prTemplate
    delete loadedConfigs[selectRepository.value].commentTemplate
    delete loadedConfigs[selectRepository.value].tbxBranchRegex
    buttonNode.disabled = true;
    const configObject = {
        repo: selectRepository.value,
        config: loadedConfigs[selectRepository.value],
        trigger: buttonNode.id,
        force_overwrite: true,
    }

    
    window.zendit.send('save-settings', configObject);
}

function add_repo(e) {
    let buttonNode = e.target;
    if (e.target.nodeName == 'I' || e.target.nodeName == 'SPAN') {
        buttonNode = e.target.parentNode;
    }
    buttonNode.disabled = true;
    buttonNode.classList.replace('btn-success', 'btn-light')

    const repoUrl = tbxRepoUrl.value.split('/');
    const repoName = repoUrl.pop()
    const repoOwner = repoUrl.pop()

    const configObject = {
        repo: repoOwner + '-' + repoName,
        config: {
            directory: tbxDirectory.value,
            owner: repoOwner,
            repo: repoName,
            alias: tbxRepoAlias.value,
        },
        trigger: buttonNode.id,
    }
    tbxRepoAlias.value = '';
    tbxDirectory.value = '';
    tbxRepoUrl.value = '';
    window.zendit.send('save-settings', configObject);

}

// Toggle visibility of api token fields.
function toggle_token_fields(e, id) {
    const targetTextField = document.getElementById(id);
    const faIcon = document.createElement('i')
    faIcon.classList.add('fas')

    let buttonNode = e.target;
    if (e.target.nodeName == 'I') {
        buttonNode = e.target.parentNode;
    }
    if (targetTextField.type == 'password') {
        targetTextField.type = 'text';
        faIcon.classList.add('fa-eye-slash');
    }
    else {
        targetTextField.type = 'password';
        faIcon.classList.add('fa-eye');
    }
    while (buttonNode.lastChild) { buttonNode.removeChild(buttonNode.firstChild) }
    buttonNode.appendChild(faIcon);

}

// Show selected repo's template
function update_templates() {
    if ('branchRegex' in loadedConfigs[selectRepository.value]) {
        // tbxBranchRegex.value = loadedConfigs[selectRepository.value].branchRegex;
    }
    else {
        // tbxBranchRegex.value = loadedConfigs.globals.branchRegex;
    }
    if ('prTemplate' in loadedConfigs[selectRepository.value]) {
        document.getElementById('pr-template').value = loadedConfigs[selectRepository.value].prTemplate;
    }
    else {
        document.getElementById('pr-template').value = loadedConfigs.globals.prTemplate;
    }
    if ('commentTemplate' in loadedConfigs[selectRepository.value]) {
        CKEDITOR.instances['jira-comment-template'].setData(loadedConfigs[selectRepository.value].commentTemplate);
    }
    else {
        CKEDITOR.instances['jira-comment-template'].setData(loadedConfigs.globals.commentTemplate);

    }  
}

// Populate fields with retrieved settings
window.zendit.receive('settings-got', (data) => {
    if (data.repo == 'globals') {
        document.getElementById('github-api-token').value = data.config.githubToken;
        document.getElementById('jira-domain').value = data.config.jiraDomain;
        document.getElementById('jira-api-token').value = data.config.jiraToken;
        document.getElementById('jira-email').value = data.config.jiraEmail;
        data.config.alias = 'Global'
    }

    if (data.repo in loadedConfigs == false) {
        const newRepoOption = document.createElement('option')
        newRepoOption.value = data.repo
        newRepoOption.innerText = data.config.alias
        selectRepository.appendChild(newRepoOption)

    }
    loadedConfigs[data.repo] = data.config
    update_templates()

})

// Re-enable buttons
window.zendit.receive('settings-saved', (data) => {
    const submitBtn = document.getElementById(data.trigger);
    let originalText = submitBtn.innerHTML;
    submitBtn.innerText = 'Done';
    setTimeout(() => {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }, 1500)
    window.zendit.send('get-settings', { repo: data.repo });


})

// Display if current directory is a git repo.
window.zendit.receive('directory-selected', (data) => {

    if (data.filepath.length == 0) {
        tbxDirectory.value = '';
        btnSelectDirectory.classList.replace('btn-primary', 'btn-danger')
    }
    else {
        tbxDirectory.value = data.filepath;
    }

    if (!data.eligible) {
        btnSelectDirectory.classList.replace('btn-primary', 'btn-danger')
    }
    else {
        
        btnSelectDirectory.classList.replace('btn-danger', 'btn-primary')
        tbxDirectory.dataset.filepath = data.filepath[data.filepath.length - 1];
        tbxDirectory.innerText = data.filepath[data.filepath.length - 1].split('/').pop();
    }
    btnAddRepo.disabled = !data.eligible;
    
})