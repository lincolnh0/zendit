const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { Document } = require('adf-builder');
const fetch = require('node-fetch');

const debug = true;

function token_replace(content, tokens, component) {
  for (const token in tokens) {
    const needle = '[' + token + ']';
    
    if (content.indexOf(needle) !== -1) {
      const strBefore = content.substr(0, content.indexOf(needle));
      if (strBefore != '') {
        component.text(strBefore);
      }
      switch (tokens[token].type) {
        case 'link':
          component.link(...tokens[token].arg);
          break;
        case 'mention':
          component.mention(...tokens[token].arg);
          break;
      }
      const strAfter = content.substr(content.indexOf(needle) + needle.length) 
      if (strAfter != '') {
        component.text(strAfter);
      }
        
      return;
    }
  }
  
  // Render text as is if it doesn't match any tokens.
  component.text(content);
  
}


function recursive_build_document(content, tokens=null, doc=null) {
  switch (content.type) {
    case 'BODY':
      doc = new Document();
      content.children.map(child => recursive_build_document(child, tokens, doc));
      break;
    case 'P':
      let paragraph = doc.paragraph()
      content.children.forEach(child => {
        if (typeof(child) === 'object') {
          recursive_build_document(child, tokens, paragraph)
        }
        else {
          if (child == 'BR') {
            paragraph.hardBreak()
          }
          else {
            token_replace(child, tokens, paragraph)
          }
        }
      })

      break;
    case 'STRONG':
      content.children.map(child => doc.strong(child))
      break;
    case 'EM':
      content.children.map(child => doc.em(child))
      break;

  }

  return doc.toString();
}

ipcMain.on('create-jira-comment', async (event, arg) => {

  const comment = recursive_build_document(arg.body, arg.tokens);
  const requestObject = {
    requestURL: 'https://' + arg.jiraDomain + '/rest/api/3/issue/' + arg.ticketNo + '/comment',
    jiraEmail: arg.jiraEmail,
    jiraToken: arg.jiraToken,
    requestMethod: 'POST',
    // jsdPublic is the boolean for support desk tickets.
    requestBody: `{ "visibility": {"type": "group", "value": "${ arg.visibility }" }, "body": ${ comment }}`,
  }

  call_jira_api(requestObject)
  .then((response) => {

    if (response.status == 201) {
      const responseObj = {
        text: response.statusText,
        status: response.status,
        ticketNo: arg.ticketNo,
      }
  
      if ('assignee' in arg.tokens) {
        responseObj.assignee = arg.tokens.assignee;
      }
  
      win.webContents.send('jira-comment-created', responseObj);
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

ipcMain.on('assign-jira-ticket', async (event, arg) => {
  const requestObject = {
    requestURL: 'https://' + arg.jiraDomain + '/rest/api/3/issue/' + arg.ticketNo + '/assignee',
    requestMethod: 'PUT',
    jiraEmail: arg.jiraEmail,
    jiraToken: arg.jiraToken,
    requestBody: `{ "accountId": "${arg.accountId}" }`, 
  }

  const apiResonse  =  await call_jira_api(requestObject)
  const responseOBject = await apiResonse.text();
  if (responseOBject.status == 204) {
    win.webContents.send('jira-ticket-assigned', responseOBject);
  }
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