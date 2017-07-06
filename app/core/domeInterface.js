var startDate = new Date().toISOString();
console.log("DOCENT START TIME******************************"+startDate+"***********************");
var core = require('./core');
var fs = require('fs');
var functionToCall;
var varName = "";
var varValue = "";
var inputPage = "";
var domeInputs = {};
var needToSaveAssessment = false;
var dmcBucketName = 'dmcmra';
var dmcIndexName = 'index.mra';

/*
* Determines whether the assessment needs to be imported
*/
needToImportAssessment = function(inputPage, functionToCall){

  if(inputPage == 'questionnairePage'){
    return true;
  }

  if( functionToCall == 'getNextQuestionnairePage' ||
      functionToCall == 'getQuestionnairePageFromNavigation' ||
      functionToCall == 'updateStartGetQuestionnairePage' ||
      functionToCall == 'getMmpPage' ||
      functionToCall == 'getDashboardPage' ||
      functionToCall == 'getReviewPage' ||
      functionToCall == 'getNotApplicablePage' ||
      functionToCall == 'getSkippedPage' ||
      functionToCall == 'getStartPage' ||
      functionToCall == 'addAttachment' ||
      functionToCall == 'deleteAttachment'){
    return true;
  }

  return false;
};

/*
* Determines whether the assessment needs to be saved
*/
needToSaveAssessment = function(inputPage, functionToCall){
  if( inputPage == 'startPage' ||
      inputPage == 'questionnairePage' ||
      functionToCall == 'saveStartGetQuestionnairePage' ||
      functionToCall == 'updateStartGetQuestionnairePage' ||
      functionToCall == 'saveAssessment' ||
      functionToCall == 'addAttachment' ||
      functionToCall == 'deleteAttachment'){
        if(functionToCall == 'startPageImportAssessment'){
          return false;
        }else{
          return true;
        }
      }
  return false;
};

writeOutDomeData = function(){
  // Build the template string to send to DOME
  // Remove any newlines or Dome will cut off
  // the template string
  var domeTemplate = headerTemplate + outputTemplate + footerTemplate;
  domeTemplate = domeTemplate.replace(/\n/g, "");

  // Write updated variables out to DOME
  coreContext['isRunningInElectron'] = 0;
  coreContext['outAssessmentPath'] = assessmentPath;
  var mraOutputs = {definitions: coreContext['definitions'],
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
                    // mraCss: coreContext['mraCss'],
                    mraCss: encodeURI(coreContext['mraCss']),
                    helpMenuItems: coreContext['helpMenuItems'],
                    pageTitle: coreContext['pageTitle']
            };

  outputData = 'mraOutputs=' + JSON.stringify(mraOutputs) + "\n";
  outputData += 'outputTemplate=' + domeTemplate + "\n";

  console.log(outputData);

  fs.writeFile('out.txt', outputData, 'utf8', function(err) {
    if(err) return console.log(err);
  });

  var endDate = new Date().toISOString();
  console.log("DOCENT STOP TIME******************************"+endDate+"***********************");
}

returnTeamMembers = function() {
  if (!domeInputs['teamMemberNames']) {
    return undefined;
  }

  var teamMemberNamesJson = domeInputs['teamMemberNames'] || "";
  var teamMemberNames = [];

  if(teamMemberNamesJson.length > 0){
    teamMemberNames = JSON.parse(teamMemberNamesJson);
  }

  var teamMemberRolesJson = domeInputs['teamMemberRoles'] || "";
  var teamMemberRoles = [];

  if(teamMemberRolesJson.length > 0){
    teamMemberRoles = JSON.parse(teamMemberRolesJson);
  }

  var teamMembers = [];
  for(var i=0; i<teamMemberNames.length; i++){
    if (teamMemberNames[i].length > 0) {
      teamMembers.push({name:teamMemberNames[i], role:teamMemberRoles[i]});
    }
  }

  return teamMembers;
}

callDomeFunction = function(inputPage, functionToCall){
  // Save input values based on the current page parameter
  if(inputPage == 'startPage'){
    if(functionToCall == 'updateStartGetQuestionnairePage'){
      var assessmentValues = {};
      assessmentValues['scope'] = domeInputs['scope'];
      // Workaround since the value is coming through with a trailing 0 after the decimal
      assessmentValues['targetLevel'] = Math.floor(domeInputs['targetLevel']);
      assessmentValues['location'] = domeInputs['location'];
      assessmentValues['targetDate'] = domeInputs['targetDate'];
      assessmentValues['levelSwitching'] = Math.floor(domeInputs['levelSwitching']);
      assessmentValues['chosenThreads'] = domeInputs['chosenThreads'];
      assessmentValues['path'] = domeInputs['inAssessmentPath'];
      assessmentValues['teamMembers'] = returnTeamMembers();
      assessmentPath = domeInputs['inAssessmentPath'];

      updateAssessment(assessmentValues);
    }
    if(!(functionToCall == 'startPageImportAssessment' ||
     functionToCall == 'updateStartGetQuestionnairePage')){
      var assessmentValues = {};
      assessmentValues['scope'] = domeInputs['scope'];
      // Workaround since the value is coming through with a trailing 0 after the decimal
      assessmentValues['targetLevel'] = Math.floor(domeInputs['targetLevel']);
      assessmentValues['location'] = domeInputs['location'];
      assessmentValues['targetDate'] = domeInputs['targetDate'];
      assessmentValues['levelSwitching'] = Math.floor(domeInputs['levelSwitching']);
      assessmentValues['chosenThreads'] = domeInputs['chosenThreads'];
      assessmentValues['path'] = domeInputs['inAssessmentPath'];
      assessmentValues['teamMembers'] = returnTeamMembers();
      assessmentPath = domeInputs['inAssessmentPath'];

      if(assessmentPath.length > 0){
        createAssessment(assessmentValues);
      }
    }
  }

  if(inputPage == 'questionnairePage'){
    var actionPerson = [];
    if(domeInputs['actionPerson'] !== null){
      var actionPersonString = domeInputs['actionPerson'];
      if(actionPersonString.length > 0){
        actionPersonString = actionPersonString.replace(/\\"/g, '"');
        actionPerson = JSON.parse(actionPersonString);
      }
    }
    var answer = {questionId:domeInputs['questionId'],
                  answerValue:domeInputs['answerValue'],
                  assumptions:domeInputs['assumptions'],
                  notes:domeInputs['notes'],
                  evidence:domeInputs['evidence'],
                  technicalRisk:domeInputs['technicalRisk'],
                  costRisk:domeInputs['costRisk'],
                  scheduleRisk:domeInputs['scheduleRisk'],
                  completionDate:domeInputs['completionDate'],
                  reason:domeInputs['reason'],
                  whatAction:domeInputs['whatAction'],
                  documentation:domeInputs['documentation'],
                  actionPerson:actionPerson
                };
    saveAnswer(answer);
  }

  // Call the next page
  // Run necessary functionality as requested by
  // the functionToCall parameter
  if(functionToCall == 'getStartPage'){
    getStartPage();
  }
  if(functionToCall == 'getNextQuestionnairePage'){
    getNextQuestionnairePage(domeInputs['questionId']);
  }
  if(functionToCall == 'getPreviousQuestionnairePage'){
    getPreviousQuestionnairePage(domeInputs['questionId']);
  }
  if(functionToCall == 'getQuestionnairePageFromNavigation'){
    var threadId;
    var subThreadId;
    var subThreadLevelId;
    var questionId;

    threadId = domeInputs['navThreadId'];
    subThreadId = domeInputs['navSubThreadId'];
    subThreadLevelId = domeInputs['navSubThreadLevelId'];
    questionId = domeInputs['navQuestionId'];

    var navigationInput = {
      threadId:threadId,
      subThreadId:subThreadId,
      subThreadLevelId:subThreadLevelId,
      questionId:questionId
    };
    getQuestionnairePageFromNavigation(navigationInput);
  }
  if(functionToCall == 'saveStartGetQuestionnairePage'){
    getNextQuestionnairePage();
  }
  if(functionToCall == 'getMmpPage'){
    getMmpPage();
  }
  if(functionToCall == 'getCriteriaPage'){
    getCriteriaPage();
  }
  if(functionToCall == 'getDashboardPage'){
    getDashboardPage();
  }
  if(functionToCall == 'getReviewPage'){
    getReviewPage();
  }
  if(functionToCall == 'getAcronymsPage'){
    getAcronymsPage();
  }
  if(functionToCall == 'getDefinitionsPage'){
    getDefinitionsPage();
  }
  if(functionToCall == 'getNavigationPage'){
    getNavigationPage();
  }
  if(functionToCall == 'getHelpPage'){
    getHelpPage();
  }
  if(functionToCall == 'getNotApplicablePage'){
    getNotApplicablePage();
  }
  if(functionToCall == 'getSkippedPage'){
    getSkippedPage();
  }
  if(functionToCall == 'updateStartGetQuestionnairePage'){
    getNextQuestionnairePage();
  }
  if(functionToCall == 'startPageImportAssessment'){
    var dmcProjectId = domeInputs['dmcProjectId'];
    getAvailableAssessmentsFromS3(dmcProjectId);
    return;
  }
  if(functionToCall == 'saveAssessment'){
    var inPath = domeInputs['inAssessmentPath'];
    needToSaveAssessment = true;
  }
  if(functionToCall == 'addAttachment'){
    var questionId = domeInputs['questionId'];
    var dmcProjectId = domeInputs['dmcProjectId'];
    // TODO: fill this in from the user
    var path = "attachment1";
    attachFileS3(questionId, dmcProjectId, path);
    var navigationInput = {
      questionId:questionId
    };

    getQuestionnairePageFromNavigation(navigationInput);
  }
  if(functionToCall == 'deleteAttachment'){
    var questionId = domeInputs['questionId'];
    var attachmentId = domeInputs['attachmentId'];
    deleteAttachmentS3 (questionId, attachmentId);
    var navigationInput = {
      questionId:questionId
    };

    getQuestionnairePageFromNavigation(navigationInput);
  }
  if(functionToCall == 'downloadAttachment'){
    // TODO: fill this out
  }
  if(functionToCall == 'deleteAssessment'){
    var dmcProjectId = domeInputs['dmcProjectId'];
    var assessmentPath = domeInputs['inAssessmentPath'];
    deleteAssessmentS3(dmcProjectId, assessmentPath);
    return;
  }
  // Need to ensure that we have saved the assessment
  // before calling this
  if(needToSaveAssessment(inputPage, functionToCall)){
      var dmcProjectId = domeInputs['dmcProjectId'];
      saveAssessmentToS3(dmcProjectId, domeInputs['inAssessmentPath']);
  }else{
    writeOutDomeData();
  }
}

getAssessmentKeyS3 = function(dmcProjectId, path){
  var dmcEnv = process.env.DMC_ENV;
  console.log("DMC ENV: "+dmcEnv);
  // TODO: pick this up from environment
  dmcEnv = "dev";
  if(dmcEnv  === undefined){
    return dmcProjectId + "/" + path + "/" + dmcIndexName;
  }
  else{
      return dmcEnv + "/" + dmcProjectId + "/" + path + "/" + dmcIndexName;
  }
}
/*
* Should be called only for DMC version
*/
getAssessmentFromS3 = function(dmcProjectId, path, inputPage, functionToCall){
  var AWS = require('aws-sdk');
  AWS.config.loadFromPath('./credentials.json');
  var s3 = new AWS.S3();
  var key = getAssessmentKeyS3(dmcProjectId, path);
  s3.getObject({Bucket:dmcBucketName,Key:key},
      function(error,data){
        if(error != null){
          console.log("Failed to download:"+error);
           callDomeFunction(inputPage, functionToCall);
        }
        else{
          assessmentDb = new sqlite.Database(data.Body);
          callDomeFunction(inputPage, functionToCall);
        }

      });
};

/*
* Should be called only for DMC version
*/
saveAssessmentToS3 = function(dmcProjectId, path){
  // Check if we have a valid path
  if(path.length == 0){
    writeOutDomeData();
    return;
  }
  var AWS = require('aws-sdk');
  AWS.config.loadFromPath('./credentials.json');
  var s3 = new AWS.S3();
  var exportData = assessmentDb.export();
  var buffer = new Buffer(exportData);
  var key = getAssessmentKeyS3(dmcProjectId, path);

  uploadObject = {Bucket:dmcBucketName,
                  Key:key,
                  Body:buffer};
  s3.putObject(uploadObject, function(error, data){
    if(error){
      console.log("Unable to save Assessment:"+error);
      writeOutDomeData();
    }else{
      writeOutDomeData();
    }
  });
};

getAvailableAssessmentsFromS3 = function(dmcProjectId){

  var AWS = require('aws-sdk');
  AWS.config.loadFromPath('./credentials.json');
  var s3 = new AWS.S3();
  var dmcEnv = process.env.DMC_ENV;
  console.log("DMC ENV: "+dmcEnv);
  // TODO: pick this up from environment
  dmcEnv = "dev";
  var params = {
    Bucket:dmcBucketName,
    Prefix:dmcEnv+"/"+dmcProjectId+"/"
  };
  s3.listObjects(params, function(error, data){
    if(error){
      console.log(error);
    }else{
      var assessmentNames = [];
      for(var i=0; i<data.Contents.length; i++){
        if(data.Contents[i].Key.endsWith(dmcIndexName)){
          var name = data.Contents[i].Key;
          var prefix = dmcEnv + "\/" + dmcProjectId;
          // Remove the prefix from the beginning of the path
          var regex = new RegExp("^"+prefix+"\/");
          name = name.replace(regex, "");
          // Remove index.mra from the end of the path
          regex = new RegExp("\/"+dmcIndexName+"$");
          name = name.replace(regex, "");
          assessmentNames.push(name);
        }
      }

      coreContext['assessmentNames']=assessmentNames;
      getImportPage();
      writeOutDomeData();
    }
  });
};

attachFileS3 = function(questionId, dmcProjectId, path){
  var attachmentId = 0;
  var fileName = path.replace(/^.*[\\\/]/, '');

  var maxId = assessmentDb.exec("SELECT MAX(id) FROM attachment");
  if(maxId[0].values.length == 0
    || maxId[0].values[0][0] == null){
    attachmentId = 0;
  }else{
    attachmentId = maxId[0].values[0][0] + 1;
  }

  assessmentDb.run("INSERT INTO attachment(question_id, attachment_name, id, data) VALUES(?, ?, ?, ?)",
                    [questionId, fileName, attachmentId, ""]);
}

deleteAttachmentS3 = function(questionId, attachmentId){
  assessmentDb.run("DELETE FROM attachment  \
                    WHERE question_id=\""+questionId+"\"\
                    AND id=\""+attachmentId+"\"");
}

deleteAssessmentS3 = function(dmcProjectId, assessmentPath){
  var AWS = require('aws-sdk');
  AWS.config.loadFromPath('./credentials.json');
  var s3 = new AWS.S3();
  var params = {
    Bucket:dmcBucketName,
    Key:getAssessmentKeyS3(dmcProjectId, assessmentPath)
  };

  // Check inputs before deleting...
  if(dmcProjectId.length == 0 || assessmentPath.length == 0){
    console.log("Invalid assessment to delete "+params.Key);
    return;
  }

  s3.deleteObject(params, function(error, data){
      if(error){
        console.log("ERROR deleting assessment: "+error);
      }
  });

  getAvailableAssessmentsFromS3(dmcProjectId);
  return;
}

downloadAttachmentS3 = function(dmcProjectId, path){

}

// Read in variables from DOME
inData = fs.readFileSync('in.txt', 'utf8');
inputs = inData.split("\n");
for(var i=0; i<inputs.length; i++){
  line = inputs[i];
  nameVal = line.split("=");

  if(nameVal.length > 1){
    varName = nameVal[0].trim();
    varValue = nameVal[1].trim();
    domeInputs[varName] = varValue;
  }

  if(varName == 'functionToCall'){
    functionToCall = varValue;
  }

  if(varName == 'inputPage'){
    inputPage = varValue;
  }
}

assessmentPath = domeInputs['inAssessmentPath'];
// Workaround: the projectID is coming in from the frontend with a trailing ".0"
// Remove it here
domeInputs['dmcProjectId'] = Math.floor(domeInputs['dmcProjectId']);
console.log("PROJECT ID: "+domeInputs['dmcProjectId']);

// Before calling this function, need to ensure that
// we have imported the assessment, and received the callback
if(needToImportAssessment(inputPage, functionToCall)){
  var dmcProjectId = domeInputs['dmcProjectId'];
  getAssessmentFromS3(dmcProjectId, assessmentPath, inputPage, functionToCall);
}else{
  callDomeFunction(inputPage, functionToCall);
}
