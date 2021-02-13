const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { Document } = require('adf-builder');
const fetch = require('node-fetch');


function returnTestComment() {
    const comment = `{
        "body": {
          "type": "doc",
          "version": 1,
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "text": "Sent from Zendit",
                  "type": "text"
                }
              ]
            }
          ]
        }
      }`;
    return comment;
}

ipcMain.on('create-jira-comment', async (event, arg) => {

  // local network simulation
  setTimeout(() => {
    win.webContents.send('jira-comment-created', {
      url: 'https://google.com',
      status: 201,
    });
    
  }, 2000)
  
  return;

  const testcomment = returnTestComment();

  const requestObject = {
    requestURL: 'https://' + arg.jiraDomain + '/rest/api/3/issue/' + arg.ticketNo + '/comment',
    jiraEmail: arg.jiraEmail,
    jiraToken: arg.jiraToken,
    requestMethod: 'POST',
    requestBody: testcomment,
  }

  call_jira_api(requestObject)
  .then((response) => {
    if (response.status == 201) {
      win.webContents.send('jira-comment-created', {
        text: response.statusText,
        status: response.status,
      });
    }
  })

})

ipcMain.on('get-jira-users', async (event, arg) => {
  win = BrowserWindow.getFocusedWindow()
  const requestObject = {
    requestURL: 'https://' + arg.jiraDomain + '/rest/api/3/users/search?maxResults=2000',
    jiraEmail: arg.jiraEmail,
    jiraToken: arg.jiraToken,
    requestMethod: 'GET',
  }

  const apiResonse  =  await call_jira_api(requestObject)
  const respoonseBody = await apiResonse.text()
  await win.webContents.send('jira-users-got', {
        users: JSON.parse(respoonseBody)
          .filter((element) => {
            if (element.active) {
              return element;
            }
          })
          .map((element) => {
            return {
              id: element.accountId,
              name: element.displayName,
            }
          })
      });
})

async function call_jira_api(data) {
  let apiResponse = await fetch(data.requestURL, {
    method: data.requestMethod,
    headers: {
        'Authorization': `Basic ${Buffer.from(data.jiraEmail + ':' + data.jiraToken).toString('base64')}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    },
    body: data.requestBody,
  })
  return apiResponse

}