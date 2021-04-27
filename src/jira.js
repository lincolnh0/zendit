const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { Document } = require('adf-builder');
const fetch = require('node-fetch');

const debug = false

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
        token_replace(strAfter, tokens, component);
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

ipcMain.on('create-jira-comment', async (event, arg) => {

  if (debug) {
    setTimeout(() => {
      win.webContents.send('jira-comment-created', {
        status:201
      })

    }, 500);
    return;
  }

  // Build adf format comments from html markup.
  const comment = recursive_build_document(arg.body, arg.tokens);

  let visibilityString = ''
  
  if (arg.visibility == 'support') {
    visibilityString = `
    "properties": [
      {
        "key": "sd.public.comment",
        "value": {
          "internal": true
        }
      }
    ],`
  }
  else if (arg.visibility != '_none') {
    visibilityString = `"visibility": {"type": "group", "value": "${ arg.visibility }" },`
  } 

  const requestObject = {
    requestURL: 'https://' + arg.jiraDomain + '/rest/api/3/issue/' + arg.ticketNo + '/comment',
    jiraEmail: arg.jiraEmail,
    jiraToken: arg.jiraToken,
    requestMethod: 'POST',
    // jsdPublic is the boolean for support desk tickets.
    requestBody: `{ ${visibilityString} "body": ${ comment }}`,
  }

  call_jira_api(requestObject)
  .then((response) => {

    if (response.status == 201) {
      const responseObject = {
        text: response.statusText,
        status: response.status,
        ticketNo: arg.ticketNo,
      }
  
      if ('assignee' in arg.tokens) {
        responseObject.assignee = arg.tokens.assignee;
      }

      if ('transition' in arg) {
        responseObject.transition = arg.transition;
      }

      if ('timeSpent' in arg) {
        responseObject.timeSpent = arg.timeSpent;
      }
  
      win.webContents.send('jira-comment-created', responseObject);
    }
  })
  

})

ipcMain.on('get-jira-users', async (event, arg) => {
  win = BrowserWindow.getFocusedWindow()

  if (debug) {
    win.webContents.send('jira-users-got', {
      users: [{
      id: 1,
      name: 'Lincoln',}]
    })
    return;
  }
  

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

  if (debug) {
    setTimeout(() => {
      win.webContents.send('jira-ticket-assigned', {
        status: 201
      } )

    }, 500);
    return;
  }

  

  // // Assign ticket.
  let requestObject = {
    requestURL: 'https://' + arg.jiraDomain + '/rest/api/3/issue/' + arg.ticketNo + '/assignee',
    requestMethod: 'PUT',
    jiraEmail: arg.jiraEmail,
    jiraToken: arg.jiraToken,
    requestBody: `{ "accountId": "${arg.accountId}" }`, 
  }

  let apiResonse  =  await call_jira_api(requestObject)
  let responseObject = await apiResonse.text();
  if (responseObject.status == 204) {
    win.webContents.send('jira-ticket-assigned', responseObject);
  }

  // // Perform transition.
  requestObject = {
    requestURL: 'https://' + arg.jiraDomain + '/rest/api/3/issue/' + arg.ticketNo + '/transitions',
    requestMethod: 'POST',
    jiraEmail: arg.jiraEmail,
    jiraToken: arg.jiraToken,
    requestBody: `{ "transition": {"id": "${arg.transition}"} }`, 
  }
  apiResonse  =  await call_jira_api(requestObject)
  responseObject = await apiResonse.text();
  if (responseObject.status == 201) {
    win.webContents.send('jira-ticket-transitioned', responseObject);
  }

  // Logs time.

  timeParts = arg.timeSpent.match(/[0-9]+([.]?[0-9]+)?[h,m,d,s]/g)
  if (timeParts !== null) {
    startDate = new Date();
      requestObject = {
      requestURL: 'https://' + arg.jiraDomain + '/rest/api/3/issue/' + arg.ticketNo + '/worklog',
      requestMethod: 'POST',
      jiraEmail: arg.jiraEmail,
      jiraToken: arg.jiraToken,
      requestBody: JSON.stringify({
        timeSpent: timeParts.join(' '),
        started: startDate.toISOString().replace('Z', '+0000')
      }), 
    }
    apiResonse  =  await call_jira_api(requestObject)
    responseObject = await apiResonse.text();
    if (responseObject.status == 201) {
      win.webContents.send('jira-time-logged', responseObject);
    }
  }
})

ipcMain.on('get-jira-transitions', async (event, arg) => {
  const requestObject = {
    requestURL: 'https://' + arg.jiraDomain + '/rest/api/3/issue/' + arg.ticketNo + '/transitions',
    requestMethod: 'GET',
    jiraEmail: arg.jiraEmail,
    jiraToken: arg.jiraToken,
  }

  const apiResonse  =  await call_jira_api(requestObject)
  const respoonseBody = await apiResonse.text()
  if (apiResonse.status == 200) {
    win.webContents.send('jira-transitions-got', {
      transitions: JSON.parse(respoonseBody).transitions,
    });

  }
      
})

// Requests all groups the user of the token API belongs in.
ipcMain.on('get-jira-groups', async (event, arg) => {
  const myselfRequestObject = {
    requestURL: 'https://' + arg.jiraDomain + '/rest/api/3/myself',
    requestMethod: 'GET',
    jiraEmail: arg.jiraEmail,
    jiraToken: arg.jiraToken,
  }

  const myselfApiResonse  =  await call_jira_api(myselfRequestObject)
  const myselfRespoonseBody = await myselfApiResonse.text()
  if (myselfApiResonse.status == 200) {
    myselfResponseObject = JSON.parse(myselfRespoonseBody)

    accountId = myselfResponseObject.accountId;

    const groupRequestObject = {
      requestURL: 'https://' + arg.jiraDomain + '/rest/api/3/user/groups?accountId=' + accountId,
      requestMethod: 'GET',
      jiraEmail: arg.jiraEmail,
      jiraToken: arg.jiraToken,
    }

    const groupApiResponse = await call_jira_api(groupRequestObject)
    const groupResponseBody = await groupApiResponse.text()

    if (groupApiResponse.status == 200) {
      win.webContents.send('jira-groups-got', {
        groups: JSON.parse(groupResponseBody)
      })
    }

  }
})