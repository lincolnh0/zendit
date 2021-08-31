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


    selectRepository.addEventListener('change', (e) => update_repo_information())
    btnRemoveRepository.addEventListener('click', (e) => remove_repository())

    btnAddCustomField.addEventListener('click', (e) => add_custom_field(e))
    btnRemoveCustomField.addEventListener('click', (e) => remove_custom_field(e))
    selectCustomField.addEventListener('change', (e) => update_custom_field(e))
    btnSaveCustomFields.addEventListener('click', (e) => save_custom_field(e))

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
            directory: document.getElementById('tbxEditDirectory').value,
            reviewer: document.getElementById('tbxRepoReviewer').value,
            prTemplate: document.getElementById('pr-template').value,
            commentTemplate: CKEDITOR.instances['jira-comment-template'].getData(),
        },
        trigger: buttonNode.id,
        force_overwrite: false,
    }

    if (loadedConfigs[selectRepository.value].alias !== tbxEditRepoAlias.value) {        
        configObject.config.alias = tbxEditRepoAlias.value;
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
    delete loadedConfigs[selectRepository.value].reviewer
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
function update_repo_information() {

    // Disables delete button is global is selected.
    btnRemoveRepository.disabled = selectRepository.value === 'globals';

    if (selectRepository.value !== 'globals') {
        if ('alias' in loadedConfigs[selectRepository.value]) {
            document.getElementById('tbxEditRepoAlias').value = loadedConfigs[selectRepository.value].alias;
        }
    
        if ('directory' in loadedConfigs[selectRepository.value]) {
            document.getElementById('tbxEditDirectory').value = loadedConfigs[selectRepository.value].directory;
        }

        while (githubUsers.firstChild) {
            githubUsers.removeChild(githubUsers.lastChild)
            tbxRepoReviewer.value = ''
        }
    
        window.zendit.send("get-github-users", {
            githubToken: loadedConfigs.globals.githubToken,
            owner: loadedConfigs[selectRepository.value].owner,
        })
    }
    else {
        tbxEditDirectory.value = '';
        
    }

    tbxRepoReviewer.disabled = selectRepository.value === 'globals';
    tbxEditRepoAlias.disabled = selectRepository.value === 'globals';
    tbxEditDirectory.disabled = selectRepository.value === 'globals';

    if ('reviewer' in loadedConfigs[selectRepository.value]) {
        document.getElementById('tbxRepoReviewer').value = loadedConfigs[selectRepository.value].reviewer;
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

// Allows user to remove existing repository.
function remove_repository() {
    window.zendit.send('remove-repository', selectRepository.value);
}

function add_custom_field(e) {
    const fieldLabel = tbxCustomField.value;
    const customField = document.querySelector('option[value="' + fieldLabel + '"]');
    customField.parentNode.removeChild(customField);
    selectCustomField.appendChild(customField);
    tbxCustomField.value = '';
    if (selectCustomField.childNodes.length == 1) {
        update_custom_field();
    }
}

function remove_custom_field(e) {
    const selectedCustomField = selectCustomField.options[selectCustomField.selectedIndex];
    delete loadedConfigs.globals.fields[selectedCustomField.dataset.id];
    selectedCustomField.parentNode.removeChild(selectedCustomField);
    fieldList.appendChild(selectedCustomField);

}

function save_custom_field(e) {
    if (selectCustomField.children.length < 1) {
        return;
    }
    let buttonNode = e.target;
    if (e.target.nodeName == 'I' || e.target.nodeName == 'SPAN') {
        buttonNode = e.target.parentNode;
    }
    buttonNode.disabled = true;

    const selectedCustomField = selectCustomField.options[selectCustomField.selectedIndex];
    const combinedFieldsConfig = Object.assign(loadedConfigs.globals.fields, { 
        [selectedCustomField.dataset.id]: {
            name: selectedCustomField.value,
            content:  CKEDITOR.instances['custom-field-template'].getData(),
            option: selectCustomFieldOptions.value,
        }
    })
    const configObject = {
        repo: 'globals',
        config: {
            fields: combinedFieldsConfig
            
        },
        force_overwrite: false,
        trigger: buttonNode.id,
    }

    window.zendit.send('save-settings', configObject);
}

// Load template for current custom field
function update_custom_field(e) {
    const selectedCustomField = selectCustomField.options[selectCustomField.selectedIndex];
    if (selectedCustomField.dataset.id in loadedConfigs.globals.fields) {
        CKEDITOR.instances['custom-field-template'].setData(loadedConfigs.globals.fields[selectedCustomField.dataset.id].content);
        selectCustomFieldOptions.value = loadedConfigs.globals.fields[selectedCustomField.dataset.id].option;
    } else {
        CKEDITOR.instances['custom-field-template'].setData('')
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

        // Get custom fields from Jira org using retrieved credntials.
        window.zendit.send('get-fields', {
            jiraDomain: data.config.jiraDomain,
            jiraToken: data.config.jiraToken,
            jiraEmail: data.config.jiraEmail,
        });
    }

    if (data.repo in loadedConfigs == false) {
        const newRepoOption = document.createElement('option')
        newRepoOption.value = data.repo
        newRepoOption.innerText = data.config.alias
        selectRepository.appendChild(newRepoOption)

    }
    loadedConfigs[data.repo] = data.config
    update_repo_information()

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

window.zendit.receive('reload', () => {
    delete loadedConfigs[selectRepository.value];
    location.reload();
})

window.zendit.receive('fields-got', (fields) => {
    if (selectCustomField.childNodes.length === 0 || fieldList.childNodes.length === 0) {
        fields.forEach(field => {
            if (field.custom === true && field.schema.type == 'string') {
                const newFieldOption = document.createElement('option');
                newFieldOption.value = field.name;
                newFieldOption.innerHTML = field.name
                newFieldOption.dataset.id = field.id;
                if (fields in loadedConfigs.globals && field.id in loadedConfigs.globals.fields) {
                    selectCustomField.appendChild(newFieldOption);
                    update_custom_field()
                } else {
                    fieldList.appendChild(newFieldOption);
                }
            }
        })
    }
})

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