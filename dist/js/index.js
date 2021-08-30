function ready(e){"loading"!=document.readyState?e():document.addEventListener("DOMContentLoaded",e)}function add_event_listeners_to_form(){btnRefreshRepos.addEventListener("click",(()=>populate_repositories())),selectRepository.addEventListener("change",(e=>populate_branches())),selectJiraGroup.addEventListener("change",(e=>change_comment_template())),tbxHeadBranch.addEventListener("input",(()=>autofill_title())),btnSubmit.addEventListener("click",(()=>submit_pr())),populate_repositories()}ready(add_event_listeners_to_form);let loadedConfigs={};function populate_repositories(){window.zendit.send("get-settings",{repo:"globals",init:!0})}function populate_branches(){tbxSourceBranch.value="",tbxHeadBranch.value="",btnSubmit.disabled=0==selectRepository.value,"prTemplate"in loadedConfigs[selectRepository.value]?tbxPR.value=loadedConfigs[selectRepository.value].prTemplate:tbxPR.value=loadedConfigs.globals.prTemplate,"commentTemplate"in loadedConfigs[selectRepository.value]?CKEDITOR.instances.tbxJiraComment.setData(loadedConfigs[selectRepository.value].commentTemplate):CKEDITOR.instances.tbxJiraComment.setData(loadedConfigs.globals.commentTemplate),populate_github_users(),window.zendit.send("get-branches",loadedConfigs[selectRepository.value].directory)}function change_comment_template(){selectJiraGroup.value in loadedConfigs.globals.fields?CKEDITOR.instances.tbxJiraComment.setData(loadedConfigs.globals.fields[selectJiraGroup.value].content):"commentTemplate"in loadedConfigs[selectRepository.value]?CKEDITOR.instances.tbxJiraComment.setData(loadedConfigs[selectRepository.value].commentTemplate):CKEDITOR.instances.tbxJiraComment.setData(loadedConfigs.globals.commentTemplate)}function populate_jira_users(){window.zendit.send("get-jira-users",{jiraDomain:loadedConfigs.globals.jiraDomain,jiraToken:loadedConfigs.globals.jiraToken,jiraEmail:loadedConfigs.globals.jiraEmail})}function populate_jira_groups(){window.zendit.send("get-jira-groups",{jiraDomain:loadedConfigs.globals.jiraDomain,jiraToken:loadedConfigs.globals.jiraToken,jiraEmail:loadedConfigs.globals.jiraEmail})}function populate_github_users(){githubUsers.dataset.owner!=loadedConfigs[selectRepository.value].owner&&(githubUsers.dataset.owner=loadedConfigs[selectRepository.value].owner,window.zendit.send("get-github-users",{owner:loadedConfigs[selectRepository.value].owner,githubToken:loadedConfigs.globals.githubToken}))}function autofill_title(){branchList.childNodes.forEach((e=>{if(tbxHeadBranch.value==e.value){const e=tbxHeadBranch.value.split("/")[0],t=tbxHeadBranch.value.split("/")[1];tbxPRTitle.value=e+": "+t.replaceAll("-"," ")}})),window.zendit.send("get-jira-transitions",{jiraDomain:loadedConfigs.globals.jiraDomain,jiraToken:loadedConfigs.globals.jiraToken,jiraEmail:loadedConfigs.globals.jiraEmail,ticketNo:regex_branch_to_ticket(tbxHeadBranch.value)})}function return_token_object(){return{ticketNo:regex_branch_to_ticket(tbxHeadBranch.value),jiraDomain:loadedConfigs.globals.jiraDomain}}function submit_pr(){if(tbxHeadBranch.value!=tbxSourceBranch.value){btnSubmit.disabled=!0,btnSubmit.dataset.originalText=btnSubmit.innerHTML,btnSubmit.innerText="Loading",tokenObj=return_token_object();const e=tbxPR.value.replace("[ticketNo]",tokenObj.ticketNo).replace("[jiraDomain]",tokenObj.jiraDomain);let t={githubToken:loadedConfigs.globals.githubToken,owner:loadedConfigs[selectRepository.value].owner,repo:loadedConfigs[selectRepository.value].repo,head:tbxHeadBranch.value,source:tbxSourceBranch.value,title:tbxPRTitle.value,body:e,directory:loadedConfigs[selectRepository.value].directory};window.zendit.send("create-pr",t)}loadedConfigs.globals.lastRepo=selectRepository.value,window.zendit.send("save-settings",{repo:"globals",config:loadedConfigs.globals,force_overwrite:!1})}function child_nodes_recursive(e){return e.childNodes.length>0?{type:e.nodeName,children:Array.from(e.childNodes).map((e=>child_nodes_recursive(e)))}:null!=e.nodeValue?e.nodeValue:e.nodeName}function submit_jira_comment(e){const t=child_nodes_recursive((new DOMParser).parseFromString(CKEDITOR.instances.tbxJiraComment.getData(),"text/html").body);let i={ticketNo:regex_branch_to_ticket(tbxHeadBranch.value),jiraDomain:loadedConfigs.globals.jiraDomain,jiraToken:loadedConfigs.globals.jiraToken,jiraEmail:loadedConfigs.globals.jiraEmail,visibility:selectJiraGroup.value,type:selectJiraGroup.options[selectJiraGroup.selectedIndex].dataset.type,option:selectJiraGroup.options[selectJiraGroup.selectedIndex].dataset.option,transition:selectTransition.value,timeSpent:tbxTimelog.value,body:t,tokens:{prLink:{type:"link",arg:[e.prLink,e.prLink]}}};""!=tbxJiraUser.value&&jiraUsers.childNodes.forEach((e=>{tbxJiraUser.value==e.value&&(i.tokens.assignee={type:"mention",arg:[e.dataset.accountId,tbxJiraUser.value]})})),window.zendit.send("create-jira-comment",i)}function regex_branch_to_ticket(e){return e.split("/")[0]}function free_submit_buttons(){setTimeout((()=>{btnSubmit.disabled=!1,btnSubmit.innerHTML=btnSubmit.dataset.originalText,cbxPRCreated.checked=!1,cbxCommentCreated.checked=!1}),1500)}window.zendit.receive("branches-got",(e=>{branchList.innerHTML="",e.branches.filter((e=>{if(""!=e)return e})).forEach((e=>{branchName=e.split(" ").pop(),branchOption=document.createElement("option"),branchOption.value=branchName,branchOption.innerText=branchName,branchList.appendChild(branchOption),"master"!=branchName&&"main"!=branchName||(tbxSourceBranch.value=branchName)})),tbxHeadBranch.value=e.currentBranch})),window.zendit.receive("settings-got",(e=>{if("globals"==e.repo)e.config.alias="Global",loadedConfigs[e.repo]=e.config,populate_jira_users(),populate_jira_groups();else{if(e.repo in loadedConfigs==0){const t=document.createElement("option");t.value=e.repo,t.innerText=e.config.alias,selectRepository.appendChild(t),loadedConfigs.globals.lastRepo==e.repo&&(t.selected=!0)}loadedConfigs[e.repo]=e.config}selectRepository.childNodes.length>0&&populate_branches()})),window.zendit.receive("pr-created",(e=>{201==e.status&&(cbxPRCreated.checked=!0,""!=tbxReviewer.value&&githubUsers.childNodes.forEach((t=>{tbxReviewer.value==t.value&&(e=Object.assign(e,{githubToken:loadedConfigs.globals.githubToken,reviewers:[tbxReviewer.value]}),window.zendit.send("request-review",e))})),""!=CKEDITOR.instances.tbxJiraComment.getData()?submit_jira_comment(e):free_submit_buttons())})),window.zendit.receive("jira-comment-created",(e=>{if(201==e.status||204==e.status){cbxCommentCreated.checked=!0,free_submit_buttons();const t={ticketNo:e.ticketNo,transition:e.transition,timeSpent:e.timeSpent,jiraDomain:loadedConfigs.globals.jiraDomain,jiraToken:loadedConfigs.globals.jiraToken,jiraEmail:loadedConfigs.globals.jiraEmail,accountId:e.assignee.arg[0]};window.zendit.send("assign-jira-ticket",t)}})),window.zendit.receive("jira-users-got",(e=>{for(;jiraUsers.firstChild;)jiraUsers.removeChild(githubUsers.lastChild);for(const t in e.users)jiraUserOption=document.createElement("option"),jiraUserOption.value=e.users[t].name,jiraUserOption.dataset.accountId=e.users[t].id,jiraUsers.appendChild(jiraUserOption)})),window.zendit.receive("github-users-got",(e=>{for(;githubUsers.firstChild;)githubUsers.removeChild(githubUsers.lastChild);e.data.forEach((e=>{githubUserOption=document.createElement("option"),githubUserOption.value=e.login,githubUsers.appendChild(githubUserOption)}))})),window.zendit.receive("review-requested",(e=>{201!=e.status&&alert("PR review request failed.")})),window.zendit.receive("jira-ticket-assigned",(e=>{204!=e.status&&alert("Failed to reassign ticket.")})),window.zendit.receive("jira-transitions-got",(e=>{for(;selectTransition.firstChild;)selectTransition.removeChild(selectTransition.lastChild);e.transitions.forEach((e=>{transitionOption=document.createElement("option"),transitionOption.value=e.id,transitionOption.innerText=e.name,selectTransition.appendChild(transitionOption)}))})),window.zendit.receive("jira-groups-got",(e=>{for(;selectJiraGroup.firstChild;)selectJiraGroup.removeChild(selectJiraGroup.lastChild);groupOption=document.createElement("option"),groupOption.innerText="Public",groupOption.value="_none",selectJiraGroup.appendChild(groupOption),groupOption=document.createElement("option"),groupOption.value="support",groupOption.innerText="Internal note",groupOption.dataset.type="comment",selectJiraGroup.appendChild(groupOption),e.groups.forEach((e=>{groupOption=document.createElement("option"),groupOption.innerText=e.name,groupOption.value=e.name,groupOption.dataset.type="comment",selectJiraGroup.appendChild(groupOption)})),Object.keys(loadedConfigs.globals.fields).forEach((e=>{customField=document.createElement("option"),customField.innerText=loadedConfigs.globals.fields[e].name+` (${loadedConfigs.globals.fields[e].option})`,customField.value=e,customField.dataset.type="field",customField.dataset.option=loadedConfigs.globals.fields[e].option,selectJiraGroup.appendChild(customField)}))})),window.zendit.receive("jira-ticket-transitioned",(e=>{201!=e.status&&alert("Failed to transition ticket.")})),window.zendit.receive("jira-time-logged",(e=>{201!=e.status&&alert("Failed to transition ticket.")}));