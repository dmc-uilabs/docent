app.controller('templateCtrl', function($scope, $compile){
	$scope.initializeTemplate = function() {
		updateTemplate();
	};

	updateTemplate = function(){
		var compiledTemplate = "";
		var handleBarHtml = "";
		var compiledHtml = "";

		coreContext['isRunningInElectron'] = true;
		var standaloneOutputs = {mraOutputs:
			 								{definitions: coreContext['definitions'],
	                    acronyms: coreContext['acronyms'],
	                    threads: coreContext['threads'],
	                    navigation: coreContext['navigation'],
	                    assessment: coreContext['assessment'],
	                    question: coreContext['question'],
	                    answerInfo: coreContext['answerInfo'],
	                    reviewInfo: coreContext['reviewInfo'],
	                    actionPlan: coreContext['actionPlan'],
	                    threadStatus: coreContext['threadStatus'],
	                    assessmentNames: coreContext['assessmentNames'],
	                    answersCSV: coreContext['answersCSV'],
	                    isRunningInElectron: coreContext['isRunningInElectron'],
	                    outputPage: coreContext['outputPage'],
	                    outAssessmentPath: coreContext['outAssessmentPath'],
	                    mraCss: coreContext['mraCss'],
											helpMenuItems: coreContext['helpMenuItems']
	            }};

		compiledTemplate = Handlebars.compile(headerTemplate+outputTemplate+footerTemplate);
		handleBarHtml = compiledTemplate(standaloneOutputs);
		compiledHtml = $compile(handleBarHtml)($scope);

		$('.template-holder').html(compiledHtml);
	}

	createAssessmentFromStartPage = function(path) {
		var assessmentValues = {};
		assessmentValues.scope = document.getElementById('scope').value;
		assessmentValues.targetLevel = document.getElementById('targetLevel').value;
		assessmentValues.location = document.getElementById('location').value;
		assessmentValues.targetDate = document.getElementById('targetDate').value;

		var teamMemberNamesJson = document.getElementById('teamMemberNames').value;
		var teamMemberNames = [];
		if(teamMemberNamesJson.length > 0){
			teamMemberNames = JSON.parse(teamMemberNamesJson);
		}

		var teamMemberRolesJson = document.getElementById('teamMemberRoles').value;
		var teamMemberRoles = [];
		if(teamMemberRolesJson.length > 0){
			teamMemberRoles = JSON.parse(teamMemberRolesJson);
		}

		var teamMembers = [];

		for(var i=0; i<teamMemberNames.length; i++){
			teamMembers.push({name:teamMemberNames[i], role:teamMemberRoles[i]});
		}
		assessmentValues.teamMembers = teamMembers;

		assessmentValues['path'] = path;
		createAssessment(assessmentValues);
	}

	callFunction = function(functionToCall, inputPage){
		// Call the next page
		if(functionToCall == 'getStartPage'){
			getStartPage();
			updateTemplate();
		}

		if(functionToCall == 'getNextQuestionnairePage'){
			var questionId;
			if(document.getElementById('questionId') !== null){
				questionId = document.getElementById('questionId').value;
			}

			getNextQuestionnairePage(questionId);
			updateTemplate();
		}

		if(functionToCall == 'getPreviousQuestionnairePage'){
			var questionId;
			if(document.getElementById('questionId') !== null){
				questionId = document.getElementById('questionId').value;
			}

			getPreviousQuestionnairePage(questionId);
			updateTemplate();
		}

		if(functionToCall == 'getQuestionnairePageFromNavigation'){
			var threadId;
			var subThreadId;
			var subThreadLevelId;
			var questionId;

			if(document.getElementById('navThreadId') !== null){
				threadId = document.getElementById('navThreadId').value;
			}

			if(document.getElementById('navSubThreadId') !== null){
				subThreadId = document.getElementById('navSubThreadId').value;
			}

			if(document.getElementById('navSubThreadLevelId') !== null){
				subThreadLevelId = document.getElementById('navSubThreadLevelId').value;
			}

			if(document.getElementById('navQuestionId') !== null){
				questionId = document.getElementById('navQuestionId').value;
			}

			var navigationInput = {
				threadId:threadId,
				subThreadId:subThreadId,
				subThreadLevelId:subThreadLevelId,
				questionId:questionId
			};

			getQuestionnairePageFromNavigation(navigationInput);
			updateTemplate();
		}
		if(functionToCall == 'saveStartGetQuestionnairePage'){
			if(!assessmentPath){
				var remote = require('electron').remote;
				var dialog = remote.dialog; // OS file dialog
				dialog.showSaveDialog(function (fileName) {
					if (fileName === undefined){
							console.log("File not saved");
							return;
					}else{
						assessmentPath=fileName+".mra";
						createAssessmentFromStartPage(assessmentPath);
						callFunction(functionToCall, inputPage);
					}
				});
			}else{
				createAssessmentFromStartPage(assessmentPath);
			}

			getNextQuestionnairePage();
			updateTemplate();
		}
		if(functionToCall == 'updateStartGetQuestionnairePage'){
			var assessmentValues = {};

			assessmentValues.scope = document.getElementById('scope').value;
			assessmentValues.targetLevel = document.getElementById('targetLevel').value;
			assessmentValues.location = document.getElementById('location').value;
			assessmentValues.targetDate = document.getElementById('targetDate').value;

			var teamMemberNamesJson = document.getElementById('teamMemberNames').value;
			var teamMemberNames = [];
			if(teamMemberNamesJson.length > 0){
				teamMemberNames = JSON.parse(teamMemberNamesJson);
			}

			var teamMemberRolesJson = document.getElementById('teamMemberRoles').value;
			var teamMemberRoles = [];
			if(teamMemberRolesJson.length > 0){
				teamMemberRoles = JSON.parse(teamMemberRolesJson);
			}

			var teamMembers = [];

			for(var i=0; i<teamMemberNames.length; i++){
				teamMembers.push({name:teamMemberNames[i], role:teamMemberRoles[i]});
			}
			assessmentValues.teamMembers = teamMembers;

      updateAssessment(assessmentValues);
			getNextQuestionnairePage();
			updateTemplate();
		}
		if(functionToCall == 'getMmpPage'){
			getMmpPage();
			updateTemplate();
		}
		if(functionToCall == 'getCriteriaPage'){
			getCriteriaPage();
			updateTemplate();
		}
		if(functionToCall == 'getDashboardPage'){
			getDashboardPage();
			updateTemplate();
		}
		if(functionToCall == 'getReviewPage'){
			getReviewPage();
			updateTemplate();
		}
		if(functionToCall == 'getAcronymsPage'){
			getAcronymsPage();
			updateTemplate();
		}
		if(functionToCall == 'getDefinitionsPage'){
			getDefinitionsPage();
			updateTemplate();
		}
		if(functionToCall == 'getNavigationPage'){
			getNavigationPage();
			updateTemplate();
		}
		if(functionToCall == 'getNotApplicablePage'){
			getNotApplicablePage();
			updateTemplate();
		}
		if(functionToCall == 'getSkippedPage'){
			getSkippedPage();
			updateTemplate();
		}
		if(functionToCall == 'getHelpPage'){
			getHelpPage();
			updateTemplate();
		}

		if(functionToCall == 'saveAssessment'){

			if(inputPage != 'startPage'){
				if(!assessmentPath){
					var remote = require('electron').remote;
					var dialog = remote.dialog; // OS file dialog
					dialog.showSaveDialog(function (fileName) {
						if (fileName === undefined){
								console.log("File not saved");
								return;
						}else{
							assessmentPath = fileName+".mra";
							saveAssessmentLocal(assessmentPath);
						}
					});
				}else{
					if(saveAssessmentLocal(assessmentPath)){
						alert("File saved to "+assessmentPath);
					}else{
						alert("Failed to save assessment");
					}
				}
			}else{
				if(!assessmentPath){
					var remote = require('electron').remote;
					var dialog = remote.dialog; // OS file dialog
					dialog.showSaveDialog(function (fileName) {
						if (fileName === undefined){
								console.log("File not saved");
								return;
						}else{
							fileName = fileName +".mra";
							createAssessmentFromStartPage(fileName);
						}
					});
				}else{
					createAssessmentFromStartPage(assessmentPath);
					alert("File saved to "+assessmentPath);
				}
			}
		}
		if(functionToCall == 'startPageImportAssessment'){
			if(isRunningInElectron){
				var remote = require('electron').remote;
				var dialog = remote.dialog; // OS file dialog
				dialog.showOpenDialog(function (fileNames) {
					if(fileNames === undefined){
						console.log("No file selected");
					}else{
						assessmentPath = fileNames[0];

						//  Need to do the update to the UI inside callback
						importAssessment(assessmentPath);
						getStartPage();
						updateTemplate();
					}
				});
			}
		}
		if(functionToCall == 'addAttachment'){
			var questionId;
			if(document.getElementById('questionId') !== null){
				questionId = document.getElementById('questionId').value;
			}
			var remote = require('electron').remote;
			var dialog = remote.dialog; // OS file dialog
			dialog.showOpenDialog(function (fileNames) {
				if(fileNames === undefined){
					console.log("No file selected");
				}else{
					var attachActionPath = fileNames[0];
					attachFileLocal(questionId, attachActionPath);

					// Re-using the logic used when
					// retrieving a page from navigation
					// in order to update the page with the attachment
					var navigationInput = {
						questionId:questionId
					};

					getQuestionnairePageFromNavigation(navigationInput);
					updateTemplate();
				}
			});
		}
		if(functionToCall == 'downloadAttachment'){
			var attachmentId;
			if(document.getElementById('attachmentId') !== null){
				attachmentId = document.getElementById('attachmentId').value;
			}
			downloadAttachmentLocal(attachmentId);
		}
		if(functionToCall == 'deleteAttachment'){
			var questionId;
			var attachmentId;
			if(document.getElementById('questionId') !== null){
				questionId = document.getElementById('questionId').value;
			}
			if(document.getElementById('attachmentId') !== null){
				attachmentId = document.getElementById('attachmentId').value;
			}

			deleteAttachmentLocal(questionId, attachmentId);
			// Re-using the logic used when
			// retrieving a page from navigation
			// in order to update the page with the attachment
			var navigationInput = {
				questionId:questionId
			};

			getQuestionnairePageFromNavigation(navigationInput);
			updateTemplate();
		}
	}

	saveAssessmentLocal = function(fileName){
	  if(assessmentDb === undefined){
	    console.log("No assessment to save");
	    return false;
	  }

	  if(fileName === undefined || fileName.length == 0){
	    console.log("Unable to save assessment, invalid path");
	    return false;
	  }

		assessmentPath = fileName;
		var exportData = assessmentDb.export();
		var buffer = new Buffer(exportData);
		fs.writeFileSync(assessmentPath, buffer);

		return true;
	}

	attachFileLocal = function(questionId, path){
		var attachmentId = 0;
		var buffer = fs.readFileSync(path);
		// If file is larger than 25 MB
		if(buffer.length > 26214400){
			console.log("Attachment is too big");
			alert('Attachment is larger than 25 MB');
			return;
		}
		var base64Data = new Buffer(buffer, 'binary').toString('base64');
		var fileName = path.replace(/^.*[\\\/]/, '');

		var maxId = assessmentDb.exec("SELECT MAX(id) FROM attachment");
		if(maxId[0].values.length == 0
			|| maxId[0].values[0][0] == null){
			attachmentId = 0;
		}else{
			attachmentId = maxId[0].values[0][0] + 1;
		}

		assessmentDb.run("INSERT INTO attachment(question_id, attachment_name, id, data) VALUES(?, ?, ?, ?)",
											[questionId, fileName, attachmentId, base64Data]);
		saveAssessmentLocal(assessmentPath);
	}

	deleteAttachmentLocal = function(questionId, attachmentId){

			assessmentDb.run("DELETE FROM attachment  \
												WHERE question_id=\""+questionId+"\"\
												AND id=\""+attachmentId+"\"");
			saveAssessmentLocal(assessmentPath);
	}

	downloadAttachmentLocal = function(attachmentId){
		var remote = require('electron').remote;
		var dialog = remote.dialog; // OS file dialog
		var attachmentName = "";
		var base64String = "";

		attachmentResults = assessmentDb.exec("SELECT attachment_name, data \
																				FROM attachment \
																				WHERE id = \""+attachmentId+"\" \
																				LIMIT 1");
		attachmentValues = attachmentResults[0].values;
		if(attachmentValues.length > 0){
			attachmentName = attachmentValues[0][0];
			base64String = attachmentValues[0][1];
		}

		dialog.showSaveDialog(
			{defaultPath: attachmentName},
			function (fileName) {
				if (fileName === undefined){
						console.log("File not saved");
						return;
					}else{
						attachmentValues = attachmentResults[0].values;
						var buffer = new Buffer(base64String, 'base64');
						fs.writeFileSync(fileName, buffer);
					}
				});
	}

	$scope.run = function(){
		var inputPage = document.getElementById('inputPage').value;
		var functionToCall = document.getElementById('functionToCall').value;

		// Clear out old data from coreContext
		if(coreContext) {
			coreContext = {}
		}

		// Retrieve information from the current page
		if(inputPage == 'questionnairePage'){
			var questionId;
			var answerValue;
			var assumptions;
			var notes;
			var evidence;
			var technicalRisk;
			var costRisk;
			var scheduleRisk;
			var completionDate;
			var reason;
			var whatAction;
			var documentation;
			var questionVisitList;
			var actionPerson;

			if(document.getElementById('questionId') !== null){
				questionId = document.getElementById('questionId').value;
			}

			if(document.getElementById('answerValue') !== null){
				answerValue = document.getElementById('answerValue').value;
			}

			if(document.getElementById('assumptions') !== null){
				assumptions = document.getElementById('assumptions').value;
			}

			if(document.getElementById('notes') !== null){
				notes = document.getElementById('notes').value;
			}

			if(document.getElementById('evidence') !== null){
				evidence = document.getElementById('evidence').value;
			}

			if(document.getElementById('technicalRisk') !== null){
				technicalRisk = document.getElementById('technicalRisk').value;
			}

			if(document.getElementById('costRisk') !== null){
				costRisk = document.getElementById('costRisk').value;
			}

			if(document.getElementById('scheduleRisk') !== null){
				scheduleRisk = document.getElementById('scheduleRisk').value;
			}

			if(document.getElementById('completionDate') !== null){
				completionDate = document.getElementById('completionDate').value;
			}

			if(document.getElementById('reason') !== null){
				reason = document.getElementById('reason').value;
			}

			if(document.getElementById('whatAction') !== null){
				whatAction = document.getElementById('whatAction').value;
			}

			if(document.getElementById('documentation') !== null){
				documentation = document.getElementById('documentation').value;
			}

			if(document.getElementById('questionVisitList') !== null){
				var rawQuestionVisitList = document.getElementById('questionVisitList').value;
				if (rawQuestionVisitList.length > 0) {
					questionVisitList = rawQuestionVisitList.split('/');
				}
			}

			if(document.getElementById('actionPerson') !== null){
				var actionPersonString = document.getElementById('actionPerson').value;
				if(actionPersonString.length > 0){
					actionPerson = JSON.parse(document.getElementById('actionPerson').value);

					// removing blank records
					actionPerson = actionPerson.filter(function(x){ if(x.length > 0){return x}});
				}
			}

			var answer = {questionId:questionId,
										answerValue:answerValue,
										assumptions:assumptions,
										notes:notes,
										evidence:evidence,
										technicalRisk:technicalRisk,
										costRisk:costRisk,
										scheduleRisk:scheduleRisk,
										completionDate:completionDate,
										reason:reason,
										whatAction:whatAction,
										documentation:documentation,
										actionPerson:actionPerson
									};
			saveAnswer(answer);
		}

		callFunction(functionToCall, inputPage);

	}

	$scope.initializeTemplate();
});
