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
    const workingDirBtn = document.getElementById('working-directory');
    workingDirBtn.addEventListener('click', () => {window.zendit.send('select-directory')})
}

ready(add_event_listeners_to_form)


// Display if current directory is a git repo.
window.zendit.receive('selected-directory', (data) => {
    const workingDirBtn = document.getElementById('working-directory');
    const submitBtn = document.getElementById('submitBtn');

    if (data.filepath.length == 0) {
        workingDirBtn.innerText = 'SELECT A FOLDER';
    }
    else {
        workingDirBtn.innerText = data.filepath;
    }

    if (!data.eligible) {
        workingDirBtn.classList.add('btn-danger')
        workingDirBtn.classList.remove('btn-primary')
    }
    else {
        workingDirBtn.classList.add('btn-primary')
        workingDirBtn.classList.remove('btn-danger')
        workingDirBtn.dataset.filepath = data.filepath[data.filepath.length - 1];
        workingDirBtn.innerText = data.filepath[data.filepath.length - 1].split('/').pop();
    }
    submitBtn.disabled = !data.eligible;

    
    const branchDataList = document.getElementById('branchList');
    
    branchDataList.innerHTML = '';
    
    let branches = data.branches.filter((elem) => { if (elem != '') return elem; })
    branches.forEach(element => {
        branchName = element.split(' ').pop();
        branchOption = document.createElement('option');
        branchOption.value = branchName;
        branchOption.innerText = branchName;
        branchDataList.appendChild(branchOption)

    });
    
})