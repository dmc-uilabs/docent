
// TODO cleanup unused variables
var outputLevel = "";
var currentVersionIndex = 0;
var currentThreadIndex = 0;
var currentSubThreadIndex = 0;
var currentSubThreadLevelIndex = 0;

var isRunningInNode;
var isRunningInElectron;

var fs;
var criteriaDb;
assessmentPath = "";
var criteriaDbBuffer;
var dmcBucketName = 'dmcmra';

var acronyms = [];
var definitions = [];

//below are for tooltips
var ttDictionary = [];
var ttTriggers = {};
var ttMultiWordMatches = [];

currentLevel = 5;
currentQuestionIndex = 0;
currentVersion = 0;
currentThread = "";
currentSubThread = 0;
currentSubThreadLevel = "";
currentQuestion = "";
currentQuestionId = 0;

mraQuestion = "";
currentThreadName = "";
currentSubThreadName = "";
outputTemplate = "";
//var mraCss = "";

coreContext = {};

initializeCore = function(){
  fs = require('fs');

  // Check if the process is running in node or not
  if(typeof window == 'undefined') {
      isRunningInNode = true;
    } else {
      isRunningInNode = false;
    }

    // Check if the process is running in electron or not
    if(typeof process == 'undefined'
    || typeof process.versions.electron == 'undefined'){
      isRunningInElectron = false;
    }else{
      isRunningInElectron = true;
    }
    if(isRunningInElectron){
      sqlite = require('sql.js');
    }else{
      sqlite = require('./sql.js');
      templates = require('./templates.js');
    }

    if(isRunningInElectron){
      criteriaDbBuffer = fs.readFileSync('./resources/app.asar/app/core/criteria.db');
      criteriaDb = new sqlite.Database(criteriaDbBuffer);

    }else{
      criteriaDbBuffer = fs.readFileSync('./criteria.db');
      criteriaDb = new sqlite.Database(criteriaDbBuffer);

    }

    // Initialize with the start page
    if(isRunningInElectron){
      getStartPage();
    }
  }

updateCriteriaLocation = function() {
  currentVersion = criteria[0].versions[currentVersionIndex];
  currentThread = currentVersion.threads[currentThreadIndex];
  currentSubThread = currentThread.subThreads[currentSubThreadIndex];
  currentSubThreadLevel = currentSubThread.subThreadLevels[currentSubThreadLevelIndex];
  currentQuestion = currentSubThreadLevel.questions[currentQuestionIndex];
  currentThreadName = currentThread.name;
  currentSubThreadName = currentSubThread.name;
  currentQuestionId = currentQuestion.questionId;
}

/*
* Determines the next question that should be displayed to the user
* utilizing the target level, etc.
*/
getNextQuestion = function(assessment) {
  var answers = {};

  // if(assessmentDb === undefined){
  if(!assessmentDbDefined()){
    createNewAssessment();
  }

  // Get all question IDs and answers for questions that have been visited
  var answerResults = assessmentDb.exec("SELECT question_id, answer FROM answer");
  if(answerResults.length > 0){
    var answerValues = answerResults[0].values;

    for(var i=0; i<answerValues.length; i++){
      var questionId = answerValues[i][0];
      answers[questionId] = answerValues[i][1];
    }
  }

  var threadResults = criteriaDb.exec("SELECT DISTINCT a.thread_id, a.thread_order, b.sub_thread_id \
      FROM thread a, sub_thread b \
      WHERE a.thread_id = b.thread_id \
      ORDER BY a.thread_order, a.thread_id, b.sub_thread_id ");

  var threadValues = threadResults[0].values;
  // Loop through all the subThreads in order to see
  // if they have been completed
  for(var i=0; i<threadValues.length; i++){
    var threadId = threadValues[i][0];
    var subThreadId = threadValues[i][2];
    var questionId = getNextQuestionIdForSubThread(subThreadId, assessment.targetLevel, answers);
    if(questionId != -1){
      // Go to next subThread;
      return getQuestionInfo(questionId);
    }
  }

  var skippedAnswerQuestionIds = "";
  for(var key in answers){
    if(answers[key] == 0){
      if(skippedAnswerQuestionIds.length > 0){
        skippedAnswerQuestionIds = skippedAnswerQuestionIds+","+key;
      }else{
        skippedAnswerQuestionIds+= key;
      }
    }
  }

  // Get any skipped questions that aren't in the question_visit_history
  var unvisitedSkippedResults = assessmentDb.exec("SELECT a.question_id \
                                                  FROM answer a \
                                                  WHERE a.answer == '0' \
                                                  AND a.question_id NOT IN(\
                                                        SELECT b.question_id \
                                                        FROM question_visit_history b)");
  if(unvisitedSkippedResults.length > 0){
    var skippedQuestionId = unvisitedSkippedResults[0].values[0][0];
    return getQuestionInfo(skippedQuestionId);
  }

  // If we get to here, loop through skipped questions in order
  var visitedResults = assessmentDb.exec("SELECT id, question_id \
                                          FROM question_visit_history \
                                          WHERE question_id IN("+skippedAnswerQuestionIds+") \
                                          ORDER BY id");
  var visitedQuestionId = [];
  if(visitedResults.length > 0){
    var skippedQuestionId = visitedResults[0].values[0][1];
    return getQuestionInfo(skippedQuestionId);
  }else{
    // If no visited questions, just grab the first
    // skipped question
    for(var key in answers){
      if(answers[key] == 0){
        return getQuestionInfo(key);
      }
    }
  }

  return getQuestionInfo(-1);
}

/*
* Returns:
*
*/
getNextQuestionIdForSubThread = function(subThreadId, targetLevel, answers){

  var mrlLevelQuestions = {};
  var questionResults = criteriaDb.exec("SELECT a.sub_thread_level_id, a.mrl_level, b.question_id, b.question_order \
      FROM sub_thread_level a, question b \
      WHERE a.sub_thread_level_id = b.sub_thread_level_id \
      AND a.sub_thread_id = \""+subThreadId+"\" \
      ORDER BY a.mrl_level, b.question_order");

  var questionValues = questionResults[0].values;
  for(var i=0; i<questionValues.length; i++){
    var mrlLevel = questionValues[i][1];
    var questionId = questionValues[i][2];
    if(mrlLevelQuestions[mrlLevel] === undefined){
      mrlLevelQuestions[mrlLevel] = [];
    }
    mrlLevelQuestions[mrlLevel].push(questionId);
  }

  // Start at the target level, check that answers exist for all questions at that level
  var subThreadReturnObject = getNextQuestionIdForSubThreadLevel(mrlLevelQuestions[targetLevel], answers);

  // If an unanswered question was found, return that question
  if(subThreadReturnObject.questionId != -1){
    return subThreadReturnObject.questionId;
  }

  // If the thread failed, drop down a level
  while(subThreadReturnObject.levelFailed && targetLevel > 1){
    targetLevel--;
    subThreadReturnObject = getNextQuestionIdForSubThreadLevel(mrlLevelQuestions[targetLevel], answers);
    if(subThreadReturnObject.questionId != -1){
      return subThreadReturnObject.questionId;
    }
  }

  if(subThreadReturnObject.levelFailed && targetLevel == 1){
    // This subthread failed miserably and can go no lower
    return -1;
  }

  // There are skipped questions, so don't go any higher
  // We are done here
  if(subThreadReturnObject.skippedQuestionId != -1){
      return -1;
  }

  // No unanswered questions exist, and no questions were skipped
  // So, either all were Yes or N/A, or there were no questions at this level
  // Regardless, try the next level up
  var questionLevel = Number(targetLevel) +1;
  if(subThreadReturnObject.questionId == -1
    && subThreadReturnObject.skippedQuestionId == -1
    && questionLevel < 10){
    subThreadReturnObject = getNextQuestionIdForSubThreadLevel(mrlLevelQuestions[questionLevel], answers);
    console.log(subThreadReturnObject);
    // Since this is a level above just
    // move to the next subThread, we don't
    // really care that we failed
    if(subThreadReturnObject.levelFailed){
      return -1;
    }
    // The user is skipping questions, don't go any higher
    if(subThreadReturnObject.skippedQuestionId != -1){
      return -1;
    }
    // Found an unanswered question, show it to the user
    if(subThreadReturnObject.questionId != -1){
      return subThreadReturnObject.questionId;
    }
  }

  if(targetLevel >= 10){
    // We can go no higher than 10, we are done
    return -1;
  }

  // If we are more than 1 level above target but still less than 10
  return -1;
}

/*
* Returns the next question ID that should be displayed for this level
*
*/
getNextQuestionIdForSubThreadLevel = function(subThreadLevelQuestions, answers){
  var levelComplete = false;
  var skippedQuestionId = -1;
  var nextQuestionId = -1;
  var levelFailed = false;
  var returnObject = {};

  var skippedQuestions = false;
  if(subThreadLevelQuestions === undefined){
    return {questionId:-1,
            skippedQuestionId:-1,
            levelFailed:false};
  }
  for(var i=0; i<subThreadLevelQuestions.length; i++){
    var questionId = subThreadLevelQuestions[i];
    if(answers[questionId] === undefined && nextQuestionId == -1){
      nextQuestionId = questionId;
    }

    // Skipped answer handling
    if(answers[questionId] == 0 && skippedQuestionId == -1){
      skippedQuestionId = questionId;
    }

    // Yes answer handling
    if(answers[questionId] == 1){
      // Not needed
    }

    // No answer handling
    if(answers[questionId] == 2){
      levelFailed = true;
    }

    // N/A answer handling
    if(answers[questionId] == 3){
      // Not needed
    }
  }

  returnObject = { questionId:nextQuestionId,
                   skippedQuestionId:skippedQuestionId,
                   levelFailed:levelFailed };
  return returnObject;

}

/*
* Returns the necessary information to display the question
* on the questionnaire page.  Returns {} if invalid
* question ID or if question ID is not found
*/
getQuestionInfo = function(questionId){

  nextQuestionResults = criteriaDb.exec("SELECT a.question_id, a.question_text, b.help_text, a.question_order, c.sub_thread_id, c.name, d.thread_id, d.name, b.mrl_level \
    FROM question a, sub_thread_level b, sub_thread c, thread d \
    WHERE question_id = \"" + questionId + "\" \
    AND a.sub_thread_level_id = b.sub_thread_level_id \
    AND b.sub_thread_id = c.sub_thread_id \
    AND c.thread_id = d.thread_id \
    LIMIT 1");

  if(nextQuestionResults.length == 0){
    return {};
  }

  var question = {questionId:nextQuestionResults[0].values[0][0],
                  questionText:addTooltips(nextQuestionResults[0].values[0][1]),
                  helpText:addTooltips(nextQuestionResults[0].values[0][2]),
                  subThreadId:nextQuestionResults[0].values[0][4],
                  subThreadName:nextQuestionResults[0].values[0][5],
                  threadId:nextQuestionResults[0].values[0][6],
                  threadName:nextQuestionResults[0].values[0][7],
                  mrlLevel:nextQuestionResults[0].values[0][8]
                };

  return question;
}
/*******************************
* Helper function that checks
* if the question id has an
* entry in the assessmentDb.
* Returns:
*  true if a row is there,
*       even if the answer is 'Skip'
*  false if no row found or invalid
*         question id
*/
isQuestionIdInAssessment = function(questionId){
  // Validate input
  if(isNaN(questionId) || questionId.length == 0){
    return false;
  }

  // Check if this question_id has an entry
  var questionResults = assessmentDb.exec("SELECT question_id FROM answer WHERE question_id = "+questionId);

  if(questionResults.length > 0){
    return true;
  }else{
    return false;
  }
}

getPreviousQuestion = function(assessment, questionToReturn) {
  var previousQuestionInfo = {};
  // if(assessmentDb === undefined){
  if(!assessmentDbDefined()){
    createNewAssessment();
  }

  return getQuestionInfo(questionToReturn)
}

/************************************
* For a given subThreadLevelId, find
* the first question (as defined by question_order)
* at that subThreadLevel.
* Returns: questionId or 0 if no results found
*/
getFirstQuestionIdForSubThreadLevel = function(subThreadLevelId){
  var results = criteriaDb.exec("SELECT question_id FROM question \
                                WHERE sub_thread_level_id="+subThreadLevelId+" \
                                ORDER BY question_order \
                                LIMIT 1");
  if(results.length == 0){
    return 0;
  }else{
    return results[0].values[0][0];
  }
}

/************************************
* For a given subThreadId, find
* the first question (as defined by question_order, starting with
* the lowest mrl_level)
* at that subThread.  Target level is not used.
* Returns: questionId or 0 if no results found
*/
getFirstQuestionIdForSubThread = function(subThreadId){
  var results = criteriaDb.exec("SELECT a.question_id FROM question a, sub_thread_level b \
                                WHERE b.sub_thread_id="+subThreadId+" \
                                AND b.sub_thread_level_id = a.sub_thread_level_id \
                                ORDER BY b.mrl_level, a.question_order \
                                LIMIT 1");
  if(results.length == 0){
    return 0;
  }else{
    return results[0].values[0][0];
  }
}

/************************************
* For a given threadId, find
* the first question (as defined by question_order, starting with the lowest mrl_level)
* at that thread.  Target level is not used.
* Returns: questionId or 0 if no results found
*/
getFirstQuestionIdForThread = function(threadId){
  var results = criteriaDb.exec("SELECT a.question_id FROM question a, sub_thread_level b, sub_thread c \
                                WHERE c.thread_id="+threadId+" \
                                AND c.sub_thread_id = b.sub_thread_id \
                                AND b.sub_thread_level_id = a.sub_thread_level_id \
                                ORDER BY b.mrl_level, a.question_order \
                                LIMIT 1");
  if(results.length == 0){
    return 0;
  }else{
    return results[0].values[0][0];
  }
}

returnQuestionData = function(questionId) {

}

getQuestionFromNavigation = function(navigationInput){

  if(navigationInput.questionId <= 0 && navigationInput.subThreadLevelId > 0){
    navigationInput.questionId = getFirstQuestionIdForSubThreadLevel(navigationInput.subThreadLevelId);
  }
  if(navigationInput.questionId <= 0 && navigationInput.subThreadId > 0){
    navigationInput.questionId = getFirstQuestionIdForSubThread(navigationInput.subThreadId);
  }
  if(navigationInput.questionId <= 0 && navigationInput.threadId > 0){
    navigationInput.questionId = getFirstQuestionIdForThread(navigationInput.threadId);
  }
  if(navigationInput.questionId <= 0){
      console.log("Can't find questionID from navigation input");
      return {};
  }

  return getQuestionInfo(navigationInput.questionId)

}

getAnswerInfo = function(questionId){
  var answerResults = {};
  var actionPerson = [];

  if(isNaN(questionId)){
    return {};
  }

  var answerResults = assessmentDb.exec("SELECT a.question_id, a.answer, a.assumptions, a.notes, a.evidence, a.technical_risk, a.cost_risk, a.schedule_risk, a.completion_date, a.reason, a.what_action, a.documentation \
                                       FROM answer a \
                                       WHERE a.question_id=\""+questionId+"\"");

  if(answerResults.length == 0){
    return {};
  }

  var actionPersonResults = assessmentDb.exec("SELECT name FROM action_person WHERE question_id =\""+questionId+"\"");
  if(actionPersonResults.length > 0){
    for(var i=0; i<actionPersonResults[0].values.length; i++){
      actionPerson.push(actionPersonResults[0].values[i][0]);
    }
  }

  var attachments = getAttachmentsForQuestion(questionId);

  var answerInfo = {questionId:answerResults[0].values[0][0],
                  answer:answerResults[0].values[0][1],
                  assumptions:answerResults[0].values[0][2],
                  notes:answerResults[0].values[0][3],
                  evidence:answerResults[0].values[0][4],
                  technicalRisk:answerResults[0].values[0][5],
                  costRisk:answerResults[0].values[0][6],
                  scheduleRisk:answerResults[0].values[0][7],
                  completionDate:answerResults[0].values[0][8],
                  reason:answerResults[0].values[0][9],
                  whatAction:answerResults[0].values[0][10],
                  documentation:answerResults[0].values[0][11],
                  actionPerson:actionPerson,
                  actionPersonFormatted:JSON.stringify(actionPerson),
                  attachments:attachments,
                };

  return answerInfo;
}

getCriteriaMatrixData = function(){
  var threadsArray = [];
  var subThreadsArray = [];
  var subThreadLevelsArray = [];

  contents = criteriaDb.exec("SELECT thread_id, name FROM thread");
  var threadValues = contents[0].values;
  for(var i = 0; i<threadValues.length; i++){
    if(i==0){
      threads = [];
    }
    contents = criteriaDb.exec("SELECT sub_thread_id, name FROM sub_thread where thread_id="+threadValues[i][0]);
    subThreadValues = contents[0].values;
    for(var j = 0; j<subThreadValues.length; j++){
      if(j==0){
        subThreadsArray = [];
      }
      contents = criteriaDb.exec("SELECT criteria_text, mrl_level FROM sub_thread_level where sub_thread_id="+subThreadValues[j][0]);
      subThreadLevelValues = contents[0].values;
      for(var k = 0; k<subThreadLevelValues.length; k++){
        if(k == 0){
          subThreadLevelsArray = [];
        }

        var criteriaTextWithTT = addTooltips(contents[0].values[k][0])
        var mrlLevel = contents[0].values[k][1]

        subThreadLevelsArray.push({criteriaText:criteriaTextWithTT, mrlLevel:mrlLevel});
      }
      subThreadsArray.push({name:subThreadValues[j][1], subThreadLevels:subThreadLevelsArray});
    }
    threadsArray.push({threadId:threadValues[i][0],name:threadValues[i][1], numSubThreads:subThreadsArray.length, subThreads:subThreadsArray});
  }

  return threadsArray;
}

getDashboardInfo = function(assessment) {
  var threadsArray = [];
  var subThreadsArray = [];
  var subThreadLevelsArray = [];

  var threadResults = criteriaDb.exec("SELECT a.thread_id, a.name, b.sub_thread_id, b.name\
    FROM thread a, sub_thread b\
    WHERE a.thread_id = b.thread_id");

  var threadValues = threadResults[0].values;
  for(var i = 0; i<threadValues.length; i++){
    var subThreadIdVal = threadValues[i][2];
    var statusObject = getSubThreadStatus(subThreadIdVal, assessment['targetLevel']);
    threadsArray.push({threadName:threadValues[i][1],
                        subThreadName:threadValues[i][3],
                        date:statusObject.date,
                        statuses:statusObject.statusArray});
  }
  return threadsArray;
}

/************************************
* Creates the reviewInfo object
* used by the review page
*/
getReviewInfo = function(){
  var reviewInfo = [];
  var reviewResults = assessmentDb.exec("SELECT question_id, answer, assumptions, notes, evidence, technical_risk, cost_risk, schedule_risk, completion_date, reason, what_action, documentation \
                                          FROM answer\
                                          ORDER BY answer");

  if(reviewResults.length > 0){
    var reviewValues = reviewResults[0].values;

    for(var i=0; i<reviewValues.length; i++){
      var reviewItem = {};
      reviewItem['questionId'] = reviewValues[i][0];
      reviewItem['answer'] = reviewValues[i][1];
      reviewItem['assumptions'] = reviewValues[i][2];
      reviewItem['notes'] = reviewValues[i][3];
      reviewItem['evidence'] = reviewValues[i][4];
      reviewItem['technicalRisk'] = reviewValues[i][5];
      reviewItem['costRisk'] = reviewValues[i][6];
      reviewItem['scheduleRisk'] = reviewValues[i][7];
      reviewItem['completionDate'] = reviewValues[i][8];
      reviewItem['reason'] = reviewValues[i][9];
      reviewItem['whatAction'] = reviewValues[i][10];
      reviewItem['documentation'] = reviewValues[i][11];

      if(reviewItem['answer'] == 2){
        personResults = assessmentDb.exec("SELECT question_id, name FROM action_person WHERE question_id =" + reviewItem['questionId']);
        var actionPerson = [];
        if(personResults.length > 0){
          var personValues = personResults[0].values;
          for(var j=0; j< personValues.length; j++){
            var person = {};
            person['name'] = personValues[j][1];
            actionPerson.push(person);
          }
        }
        reviewItem['actionPerson'] = actionPerson;
      }else{
        reviewItem['actionPerson'] = [];
      }

      reviewItem['attachments']  = getAttachmentsForQuestion(reviewItem['questionId']);

      questionResults = criteriaDb.exec("SELECT question_text FROM question where question_id =" + reviewItem['questionId']);
      if(questionResults.length > 0){
        reviewItem['questionText'] = questionResults[0].values[0][0];
      }
      reviewInfo.push(reviewItem);
    }
  }

  return reviewInfo;
}

getNavigationInfo = function(){
  var threadsArray = [];
  var subThreadsArray = [];
  var subThreadLevelsArray = [];
  var questionsArray = [];
  var prevThreadId = -1;
  var prevThreadName = "";
  var prevSubThreadId = -1;
  var prevSubThreadName = "";
  var prevSubThreadLevelId = -1;
  var prevMrlLevel = -1;

  contents = criteriaDb.exec("SELECT a.thread_id, a.name, b.sub_thread_id, b.name, c.sub_thread_level_id, c.mrl_level, d.question_id, d.question_text \
                              FROM thread a, sub_thread b, sub_thread_level c, question d \
                              WHERE a.thread_id = b.thread_id \
                              AND b.sub_thread_id = c.sub_thread_id \
                              AND c.sub_thread_level_id = d.sub_thread_level_id");
                              //ORDER BY a.thread_id, b.sub_thread_id, c.mrl_level");

  for(var i = 0; i<contents[0].values.length; i++){

    if(prevSubThreadLevelId != contents[0].values[i][4]){
      if(prevSubThreadLevelId != -1){
        subThreadLevelsArray.push({subThreadLevelId:prevSubThreadLevelId, mrlLevel:prevMrlLevel, questions:questionsArray});
        questionsArray = [];
      }
      prevSubThreadLevelId = contents[0].values[i][4];
      prevMrlLevel = contents[0].values[i][5];
    }

    if(prevSubThreadId != contents[0].values[i][2]){
        if(prevSubThreadId != -1){
          subThreadsArray.push({subThreadId:prevSubThreadId, name:prevSubThreadName, subThreadLevels:subThreadLevelsArray});
          subThreadLevelsArray = [];
        }
      prevSubThreadId = contents[0].values[i][2];
      prevSubThreadName = contents[0].values[i][3];
      subThreadLevelsArray = [];
    }

    if(prevThreadId != contents[0].values[i][0]){
      if(prevThreadId != -1){
        threadsArray.push({threadId:prevThreadId, name:prevThreadName, numSubThreads:subThreadsArray.length, subThreads:subThreadsArray});
        subThreadsArray = [];
      }
      prevThreadId = contents[0].values[i][0];
      prevThreadName = contents[0].values[i][1];
    }
    questionsArray.push({questionId:contents[0].values[i][6], questionText:contents[0].values[i][7]});
  }
  // Capture the last array of each type
  subThreadLevelsArray.push({subThreadLevelId:prevSubThreadLevelId, mrlLevel:prevMrlLevel, questions:questionsArray});
  subThreadsArray.push({subThreadId:prevSubThreadId, name:prevSubThreadName, subThreadLevels:subThreadLevelsArray});
  threadsArray.push({threadId:prevThreadId, name:prevThreadName, numSubThreads:subThreadsArray.length, subThreads:subThreadsArray});

  return threadsArray;
}


returnQuestionSubset = function(subsetType){

  var subsetQuery;

  switch(subsetType) {
    case 'skipped':
      subsetQuery = "SELECT question_id FROM answer WHERE CAST(answer as INTEGER) < 1";
      break;
    case 'notApplicable':
      subsetQuery = "SELECT question_id FROM answer WHERE CAST(answer as INTEGER) = 3"
      break;
    default:
      subsetQuery = "SELECT question_id FROM answer"
  }

  var questionSubset = assessmentDb.exec(subsetQuery)

  if (questionSubset.length>0){
    var questionSubsetArray = questionSubset[0].values.map(function(item){
      return item[0]
    })
    return questionSubsetArray
  } else {
    return []
  }
}

formatQuestionSubset = function(retrievedQuestionSubset) {

  retrievedQuestionSubset = retrievedQuestionSubset.values
  var subsetOutput = [];
  var threads = [];

  for (var i=0; i < retrievedQuestionSubset.length; i++) {
    // add thread to threads if not already present
    if (threads.indexOf(retrievedQuestionSubset[i][1])==-1) {
      threads.push(retrievedQuestionSubset[i][1])
    }
  }


  for (var i=0; i < retrievedQuestionSubset.length; i++) {

    var threadPosition = threads.indexOf(retrievedQuestionSubset[i][1]);
    var item = retrievedQuestionSubset[i]

    if (!subsetOutput[threadPosition]) {

      subsetOutput.push({
            'thread': item[1],
            'questions': [{
              'questionId': item[3],
              'mrlLevel': item[2],
              'questionText': item[4]
              }]
            });
    } else {
      subsetOutput[threadPosition]['questions'].push({
        'questionId': item[3],
        'mrlLevel': item[2],
        'questionText': item[4]})
    }

  }

  return subsetOutput;

}

getNavigationInfoSubset = function(questionSubset){
  var threadsArray = [];
  var subThreadsArray = [];
  var subThreadLevelsArray = [];
  var questionsArray = [];

  var baseQuery = "thread t \
    JOIN sub_thread st ON st.thread_id = t.thread_id \
    JOIN sub_thread_level stl ON stl.sub_thread_id = st.sub_thread_id \
    JOIN question q ON q.sub_thread_level_id = stl.sub_thread_level_id \
    WHERE question_id in ("+questionSubset+")"

  if (questionSubset.length == 0) {
    return [];
  }

  ///////////////////////////////////////////////
  ///////////////////////////////////////////////
  // pairing down the amount of hits on the DB, and how much info we're parsing
  ///////////////////////////////////////////////
  ///////////////////////////////////////////////
  var retrievedQuestionSubset;
  retrievedQuestionSubset = criteriaDb.exec("SELECT DISTINCT t.thread_id, t.name, stl.mrl_level, q.question_id, q.question_text FROM "+baseQuery);
  return formatQuestionSubset(retrievedQuestionSubset[0]);
  ///////////////////////////////////////////////

}

getSubThreadStatus = function(subThreadIdVal, targetLevel){
  var statusArray = [];
  var statusObject = {};
  var completionDate = "";
  var subThreadLevelResults = criteriaDb.exec("SELECT sub_thread_level_id, mrl_level FROM sub_thread_level WHERE sub_thread_id="+subThreadIdVal);
  var subThreadLevelValues = subThreadLevelResults[0].values;
  for(var i = 0; i<subThreadLevelValues.length; i++){
    var statusReturn = getSubThreadLevelStatus(subThreadLevelValues[i][0], subThreadLevelValues[i][1], targetLevel);
    statusArray.push(statusReturn['status']);
    if(statusReturn['completionDate'] != ""){
      completionDate = statusReturn['completionDate'];
    }
  }
  var threadIsGreen = false;
  var threadIsRed = false;
  for(var i=statusArray.length; i>=0; i--){
    if(statusArray[i] == 2){
      threadIsRed = true;
    }
    if(statusArray[i] == 1 || statusArray[i] == 3){
      threadIsGreen = true;
    }else if(threadIsGreen){
      statusArray[i]=1;
    }
  }
  if(!threadIsRed){
    completionDate = "";
  }
  statusObject={date:completionDate,
                statusArray:statusArray};
  return statusObject;
}

/*******************************************
* Status colors displayed on dashboardPage:
* 0: grey
* 1: green
* 2: red
* 3: blue
*/
getSubThreadLevelStatus = function(subThreadLevelId, mrlLevel, targetLevel){

  var questionIds = [];
  var unAnsweredQuestions = false;
  var completionDate = "";
  var statusObject = {status:0,
                      completionDate:""};

  if(Number(mrlLevel) > Number(targetLevel+1)){
    return statusObject;
  }
  // get all QuestionId's for this subThreadLevelId
  var questionResults = criteriaDb.exec("SELECT question_id FROM question where sub_thread_level_id="+subThreadLevelId);
  if(questionResults.length > 0){
    var questionValues = questionResults[0].values;
    for(var i = 0; i<questionValues.length; i++){
      questionIds.push(questionValues[i][0]);
    }
  }

  if(questionIds.length == 0){
    return statusObject;
  }

  for(var i=0; i<questionIds.length; i++){
    var questionId = questionIds[i];
    // Check for questionID in answer table
    var answerResults = assessmentDb.exec("SELECT answer, completion_date from answer where question_id="+questionId);
    if(answerResults.length == 0){
      unAnsweredQuestions = true;
    }else{
      var answerValues = answerResults[0].values;
      var answerVal = answerValues[0][0];

      // 0 -> Skipped
      if(answerVal == 0){
        unAnsweredQuestions = true;
      }
      // 1 -> Yes
      if(answerVal == 1){

      }
      // 2 -> No
      if(answerVal == 2){
        // Don't mark the subthreadlevel as red if the level is above target
        if(Number(mrlLevel) > Number(targetLevel)){
          return statusObject;
        }
        completionDate=answerValues[0][1];
        statusObject['status'] = 2;
        statusObject['completionDate'] = completionDate;
        return statusObject;
      }
      // 3 -> N/A
      if(answerVal == 3){

      }
    }
  }

  if(!unAnsweredQuestions){
    if(Number(mrlLevel) <= Number(targetLevel)){
      statusObject['status'] = 1;
      return statusObject;
    }
    if(Number(mrlLevel) > Number(targetLevel)){
      statusObject['status'] = 3;
      return statusObject;;
    }
  }else{
    return statusObject;
  }
  return statusObject;
}

getMmpInfo = function(){
  var actions = [];
  var actionResults = assessmentDb.exec("SELECT  \
                    a.question_id, \
                    a.answer, \
                    a.assumptions, \
                    a.notes, \
                    a.evidence, \
                    a.technical_risk, \
                    a.cost_risk, \
                    a.schedule_risk, \
                    a.completion_date, \
                    a.reason, \
                    a.what_action, \
                    a.documentation \
                    FROM answer a \
                    WHERE a.answer = 2");

  if(actionResults.length > 0){
    var actionValues = actionResults[0].values;
    for(var i=0; i<actionValues.length; i++){
      var action = {};
      action['questionId'] = actionValues[i][0];
      action['answer'] = actionValues[i][1];
      action['assumptions'] = actionValues[i][2];
      action['notes'] = actionValues[i][3];
      action['evidence'] = actionValues[i][4];
      action['technicalRisk'] = actionValues[i][5];
      action['costRisk'] = actionValues[i][6];
      action['scheduleRisk'] = actionValues[i][7];
      action['completionDate'] = actionValues[i][8];
      action['reason'] = actionValues[i][9];
      action['whatAction'] = actionValues[i][10];
      action['documentation'] = actionValues[i][11];

      personResults = assessmentDb.exec("SELECT question_id, name FROM action_person WHERE question_id =" + action['questionId']);
      var actionPerson = [];
      if(personResults.length > 0){
        var personValues = personResults[0].values;
        for(var j=0; j< personValues.length; j++){
          var person = {};
          person['name'] = personValues[j][1];
          actionPerson.push(person);
        }
      }

      action['attachments'] = getAttachmentsForQuestion(action['questionId']);

      questionResults = criteriaDb.exec("SELECT a.question_text, b.mrl_level, c.name, d.name \
                FROM question a, sub_thread_level b, sub_thread c, thread d \
                WHERE a.question_id ='" + action['questionId'] +"'\
                AND a.sub_thread_level_id = b.sub_thread_level_id \
                AND b.sub_thread_id = c.sub_thread_id \
                AND c.thread_id = d.thread_id");
      if(questionResults.length > 0){
        action['questionText'] = questionResults[0].values[0][0];
        action['mrlLevel'] = questionResults[0].values[0][1];
        action['subThreadName'] = questionResults[0].values[0][2];
        action['threadName'] = questionResults[0].values[0][3];
      }
      action['actionPerson'] = actionPerson;
      actions.push(action);
    }
  }

  return actions;
}


cleanStringForCSV = function(csvString){
  csvString = String(csvString)
  //escape any double quotes in the string
  return csvString.replace(/"/g,'""')
}

cleanObjectForCSV = function(csvObject){
  var valueCollection = []
  // recursively traverse object until you get to strings or numbers (no collections or objects)
  //  then simply return all the values separated by commas
  //  only being used for members at this time, may want to take a different approach as data changes
  cleanObjectForCSVRecur(csvObject, valueCollection)
  return valueCollection.join(', ')
}


cleanObjectForCSVRecur = function(csvObject, valueCollection){
  if (typeof csvObject === 'string' || csvObject instanceof String || typeof(csvObject) === 'number'){
    valueCollection.push(csvObject)
    return
  }
  for (var x in csvObject){
    // when parsing objects, dont bother with id 'columns'
    if (x != 'id') {
      cleanObjectForCSVRecur(csvObject[x], valueCollection)
    }
  }
}

objectToCSVArray = function(item, csvOutputShape){
  var objectValues = []

  for (var itemKey in csvOutputShape){
    var currentItem = item[itemKey];
    currentItem = formatCSVOutputValue(currentItem, itemKey, csvOutputShape);
    objectValues.push(currentItem)
  }
  objectValues.push("\n");

  return objectValues
}

formatCSVOutputValue = function(currentItem, itemKey, csvOutputShape){

  if (!currentItem || currentItem == "undefined") {
      currentItem = ""
    }

  if (currentItem instanceof Object) {
      currentItem = cleanObjectForCSV(currentItem);
    }

  // check if CSV output shape has any custom formatting instructions
  if (csvOutputShape[itemKey].format) {
    if (csvOutputShape[itemKey].format == 'bool' && currentItem == 1) {
      currentItem = 'true'
    }
  }

  if (csvOutputShape[itemKey].customFormat) {
    currentItem = csvOutputShape[itemKey].customFormat[currentItem]
  }

  currentItem = cleanStringForCSV(currentItem);

  return '\"'+currentItem+'\"';
};


answersToCSVString = function(review){

  //only the items in this object will be included in the final output
  var csvOutputShape = {
    questionText: {
      displayValue: "question text",
    },
    answer: {
      customFormat: {
        '1': 'Yes',
        '2': 'No',
        '3': 'Not Applicable'
      }
    },
    evidence: {},
    technicalRisk: {
      displayValue: "technical risk",
      format: 'bool'
    },
    notes: {},
    assumptions: {},
    costRisk: {
      displayValue: "cost risk",
      format: 'bool'
    },
    scheduleRisk: {
      displayValue: "schedule risk",
      format: 'bool'
    },
    completionDate: {
      displayValue: "completion date"
    },
    reason: {},
    whatAction: {
      displayValue: "actions"
    },
    documentation: {},
    actionPerson: {
      displayValue: "team members"
    },
    attachments: {}

  }

  var formattedReviewCollection = [generateCSVHeader(csvOutputShape)]

  for (var i=0; i<review.length; i++){
    var rItem = review[i];
    formattedReviewCollection.push(objectToCSVArray(rItem, csvOutputShape))
  }

  return JSON.stringify(formattedReviewCollection)
}

generateCSVHeader = function(csvOutputShape) {
  var headerValue = [];
  for (var apKey in csvOutputShape){
    headerValue.push(csvOutputShape[apKey].displayValue || apKey)
  }
  headerValue.push("\n");
  return headerValue
}

getAttachmentsForQuestion = function(questionId){
    var attachments = [];
    var attachmentResults = assessmentDb.exec("SELECT attachment_name, id FROM attachment WHERE question_id=" + questionId);
    if(attachmentResults.length > 0){
      for(var j=0; j<attachmentResults[0].values.length; j++){
        attachments.push({attachmentName:attachmentResults[0].values[j][0], id:attachmentResults[0].values[j][1]});
      }
    }
    return attachments;
}

saveAnswer = function(answer){

  if(!assessmentDbDefined()){
    importAssessment(assessmentPath);
  }

  // Basic validation before inserting/updating
  if(answer === undefined
    || isNaN(answer.questionId)
    || isNaN(answer.answerValue)
    || answer.questionId.length == 0
    || answer.answerValue.length == 0){
      console.log("Unable to save answer");
    return;
  }

  if(isQuestionIdInAssessment(answer['questionId'])){

    // Update existing answer here
    // If new answer is Skip
    if(answer['answerValue'] == 0){
      assessmentDb.run("UPDATE answer SET answer = ?, assumptions = ?, notes = ? WHERE question_id = ?",
                      [answer['answerValue'], answer['assumptions'], answer['notes'], answer['questionId']]);
    }
    // If new answer is Yes
    if(answer['answerValue'] == 1){
      assessmentDb.run("UPDATE answer SET answer = ?, evidence = ?, assumptions = ?, notes = ? WHERE question_id = ?",
                      [answer['answerValue'], answer['evidence'], answer['assumptions'], answer['notes'], answer['questionId']]);
    }
    // If new answer is No
    if(answer['answerValue'] == 2){
      assessmentDb.run("UPDATE answer SET answer = ?, technical_risk = ?, cost_risk = ?, schedule_risk = ?, completion_date = ?, reason = ?, what_action = ?, assumptions = ?, notes = ? WHERE question_id = ?",
                      [answer['answerValue'], answer['technicalRisk'], answer['costRisk'], answer['scheduleRisk'], answer['completionDate'], answer['reason'], answer['whatAction'], answer['assumptions'], answer['notes'], answer['questionId']]);

      var deleteStmt = "DELETE FROM action_person \
                        WHERE question_id="+answer['questionId'];
      assessmentDb.run(deleteStmt);

      if(!(answer.actionPerson === undefined)){
        for(var i=0; i<answer.actionPerson.length; i++){
          assessmentDb.run("INSERT INTO action_person (question_id, name) VALUES(?,?)", [answer['questionId'],answer.actionPerson[i]]);
        }
      }
    }
    // If new answer is N/A
    if(answer['answerValue'] == 3){
      assessmentDb.run("UPDATE answer SET answer = ?, documentation = ?, assumptions = ?, notes = ? WHERE question_id = ?",
                      [answer['answerValue'], answer['documentation'], answer['assumptions'], answer['notes'], answer['questionId']]);
    }
  }else{
    // Insert new answer here
    assessmentDb.run("INSERT into answer (question_id, answer, assumptions, notes, evidence, technical_risk, cost_risk, schedule_risk, completion_date, reason, what_action, documentation) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
      [answer['questionId'],
      answer['answerValue'],
      answer['assumptions'],
      answer['notes'],
      answer['evidence'],
      answer['technicalRisk'],
      answer['costRisk'],
      answer['scheduleRisk'],
      answer['completionDate'],
      answer['reason'],
      answer['whatAction'],
      answer['documentation']]);

    if(!(answer.actionPerson === undefined)){
      for(var i=0; i<answer.actionPerson.length; i++){
        assessmentDb.run("INSERT INTO action_person (question_id, name) VALUES(?,?)", [answer['questionId'],answer.actionPerson[i]]);
      }
    }
  }
  if(isRunningInElectron){
    saveAssessmentLocal(assessmentPath);
  }
}

updateAssessment = function(assessmentValues){
  assessmentDb.run("UPDATE assessment SET version_id = ?, scope = ?, target_date = ?, target_level = ?, location = ?",
    [1, assessmentValues['scope'], assessmentValues['targetDate'], assessmentValues['targetLevel'], assessmentValues['location']]);

  var teamMembers = assessmentValues['teamMembers'];

  assessmentDb.run("DELETE from team_members");

  if(!(teamMembers === undefined)){
    for(var i=0; i<teamMembers.length; i++){
      if(!(teamMembers[i].role === undefined || teamMembers[i].name === undefined)){
        if(teamMembers[i].role.length > 0 || teamMembers[i].name.length > 0){
          assessmentDb.run("INSERT INTO team_members (name, role) VALUES(?, ?)",
              [teamMembers[i].name, teamMembers[i].role]);
            }
          }
    }
  }
}

createAssessment = function(assessmentValues){
  if(!assessmentDbDefined()){
    assessmentDb = new sqlite.Database();

    // Create the schema to hold the assessment data
    assessmentDb.run("CREATE TABLE if not exists assessment(version_id INTEGER, scope TEXT, target_date TEXT, target_level TEXT, location TEXT)");
    assessmentDb.run("CREATE TABLE if not exists answer(question_id INTEGER, answer INTEGER, assumptions TEXT, notes TEXT, evidence TEXT, technical_risk INTEGER, cost_risk INTEGER, schedule_risk INTEGER, completion_date TEXT, reason TEXT, what_action TEXT, documentation TEXT)");
    assessmentDb.run("CREATE TABLE if not exists team_members(name TEXT, role TEXT)");
    assessmentDb.run("CREATE TABLE if not exists action_person(question_id INTEGER, name TEXT)");
    assessmentDb.run("CREATE TABLE if not exists attachment(question_id INTEGER, attachment_name TEXT, id INTEGER, data BLOB)");
    assessmentDb.run("CREATE TABLE if not exists question_visit_history(id INTEGER PRIMARY KEY, question_id INTEGER)");

    assessmentDb.run("INSERT INTO assessment (version_id, scope, target_date, target_level, location) VALUES (?, ?, ?, ?, ?)",
        [1, assessmentValues['scope'], assessmentValues['targetDate'], assessmentValues['targetLevel'], assessmentValues['location']]);

    var teamMembers = assessmentValues['teamMembers'];
    if(!(teamMembers === undefined)){
      for(var i=0; i<teamMembers.length; i++){
        if(!(teamMembers[i].role === undefined || teamMembers[i].name === undefined)){
          assessmentDb.run("INSERT INTO team_members (name, role) VALUES(?, ?)",
              [teamMembers[i].name, teamMembers[i].role]);
            }
      }
    }
  }else{
    updateAssessment(assessmentValues);
  }
  if(isRunningInElectron){
    saveAssessmentLocal(assessmentValues['path']);
  }
}

assessmentDbDefined = function() {
  try {
    assessmentDb.exec("SELECT version_id, scope, target_date, target_level, location FROM assessment");
    return true
  } catch(err) {
    return false
  }
}

importAssessment = function(path) {
  var assessment = {};
  var answers = [];
  var teamMembers = [];
  assessmentPath=path;
  if(isRunningInElectron && !assessmentDbDefined()){
    var assessmentDbBuffer = fs.readFileSync(assessmentPath);
    assessmentDb = new sqlite.Database(assessmentDbBuffer);
  }

  var contents = assessmentDb.exec("SELECT version_id, scope, target_date, target_level, location FROM assessment");
  var assessmentValues = contents[0].values[0];
  assessment['versionId'] = assessmentValues[0];
  assessment['scope'] = assessmentValues[1];
  assessment['targetDate'] = assessmentValues[2];
  assessment['targetLevel'] = assessmentValues[3];
  assessment['location'] = assessmentValues[4];

  contents = assessmentDb.exec("SELECT name, role FROM team_members");
  if(contents.length > 0){
    var teamValues = contents[0].values;
    for(var i=0; i<teamValues.length; i++){
      var teamMemberObject = {};
      teamMemberObject['name'] = teamValues[i][0];
      teamMemberObject['role'] = teamValues[i][1];
      teamMembers.push(teamMemberObject);
    }
    assessment['teamMembers'] = teamMembers;
  }else{
    assessment['teamMembers'] = [];
  }

  contents = assessmentDb.exec("SELECT question_id, answer, assumptions, notes, evidence, technical_risk, cost_risk, schedule_risk, completion_date, reason, what_action, documentation FROM answer");
  if(contents.length > 0){
    var answerValues = contents[0].values;
    for(var i=0; i<answerValues.length; i++){
      var answer = {};
      answer['questionId'] = answerValues[i][0];
      answer['answer'] = answerValues[i][1];
      answer['assumptions'] = answerValues[i][2];
      answer['notes'] = answerValues[i][3];
      answer['evidence'] = answerValues[i][4];
      answer['technicalRisk'] = answerValues[i][5];
      answer['costRisk'] = answerValues[i][6];
      answer['scheduleRisk'] = answerValues[i][7];
      answer['completionDate'] = answerValues[i][8];
      answer['reason'] = answerValues[i][9];
      answer['whatAction'] = answerValues[i][10];
      answer['documentation'] = answerValues[i][11];

      personResults = assessmentDb.exec("SELECT question_id, name from action_person WHERE question_id = ?", [answer['questionId']]);
      var names = [];
      if(personResults.length > 0){
        var personValues = personResults[0].values;
        for(var j=0; j< personValues.length; j++){
          names.push(personValues[j][1]);
        }
      }
      answer['names'] = names;
      answer['attachments'] = getAttachmentsForQuestion(answer['questionId']);
      answers.push(answer);


    }
  }
  assessment['answers'] = answers;
  return assessment;
}

getDefinitions = function() {
  var queryResult = criteriaDb.exec("SELECT term, definition FROM definitions");
  var queryResultValues = queryResult[0].values;
  definitions = [];
  for(var i=0; i<queryResultValues.length; i++){
    definitions.push({term:queryResultValues[i][0],definition:queryResultValues[i][1]});
  }
}

getAcronyms = function() {
    var queryResult = criteriaDb.exec("SELECT acronym, value FROM acronyms");
    var queryResultValues = queryResult[0].values;
    acronyms = [];
    for(var i=0; i<queryResultValues.length; i++){
      acronyms.push({acronym:queryResultValues[i][0],value:queryResultValues[i][1]});
    }
}

getDefinitionsPage = function() {
  outputTemplate = definitionTemplate;
  if(definitions.length == 0){
    getDefinitions();
  }
  coreContext['outputPage'] = 'definitionsPage';
  coreContext['outAssessmentPath'] = assessmentPath;
  coreContext['mraCss'] = mraCss;
  coreContext['definitions'] = definitions;
}

getAcronymsPage = function() {
  outputTemplate = acronymTemplate;
  if(acronyms.length == 0){
    getAcronyms();
  }
  coreContext['outputPage'] = 'acronymsPage';
  coreContext['outAssessmentPath'] = assessmentPath;
  coreContext['mraCss'] = mraCss;
  coreContext['acronyms'] = acronyms;
}

getImportPage = function() {
  outputTemplate = importTemplate;
  coreContext['outputPage'] = 'importPage';
  coreContext['outAssessmentPath'] = assessmentPath;
  coreContext['mraCss'] = mraCss;
}

getDashboardPage = function() {
  outputTemplate = dashboardTemplate;
  var assessment = importAssessment(assessmentPath);
  coreContext['assessment'] = assessment;
  coreContext['outputPage'] = 'dashboardPage';
  coreContext['outAssessmentPath'] = assessmentPath;
  coreContext['mraCss'] = mraCss;
  coreContext['threadStatus'] = getDashboardInfo(assessment);
}

getReviewPage = function() {
  outputTemplate = reviewTemplate;
  var assessment = importAssessment(assessmentPath);
  coreContext['assessment'] = assessment;
  coreContext['outputPage'] = 'reviewPage';
  coreContext['outAssessmentPath'] = assessmentPath;
  coreContext['mraCss'] = mraCss;
  coreContext['reviewInfo'] = getReviewInfo();
  coreContext['answersCSV'] = answersToCSVString(coreContext['reviewInfo']);
}

getCriteriaPage = function() {
  outputTemplate = criteriaTemplate;
  coreContext['threads'] = getCriteriaMatrixData();
  coreContext['outputPage'] = 'criteriaPage';
  coreContext['outAssessmentPath'] = assessmentPath;
  coreContext['mraCss'] = mraCss;
}

getStartPage = function() {
  outputTemplate = startTemplate;
  coreContext['outputPage'] = 'startPage';
  coreContext['outAssessmentPath'] = assessmentPath;
  coreContext['mraCss'] = mraCss;
  if(assessmentPath){
    coreContext['assessment'] = importAssessment(assessmentPath);
  }else{
    coreContext['assessment'] = {};
  }
}

getNextQuestionnairePage = function(questionId) {
  var assessment = importAssessment(assessmentPath);
  addQuestionToVisitList(questionId);
  var nextQuestion = getNextQuestion(assessment);

  // If no question ID is returned,
  // redirect the user to the dashboard page
  if(!('questionId' in nextQuestion)){
    return getDashboardPage();
  }
  outputTemplate = questionnaireTemplate;
  coreContext['question'] = nextQuestion;
  coreContext['answerInfo'] = getAnswerInfo(nextQuestion.questionId);
  coreContext['outputPage'] = 'questionnairePage';
  coreContext['outAssessmentPath'] = assessmentPath;
  coreContext['mraCss'] = mraCss;
  coreContext['assessment'] = assessment;
}

getPreviousQuestionnairePage = function(questionId, questionVisitList) {
  var assessment = importAssessment(assessmentPath);
  outputTemplate = questionnaireTemplate;

  var questionToReturn = lastQuestionFromVisitList(questionId);

  removeQuestionFromVisitList(questionId);
  var prevQuestion = getPreviousQuestion(assessment,questionToReturn);

  coreContext['question'] = prevQuestion;
  coreContext['answerInfo'] = getAnswerInfo(prevQuestion.questionId);
  coreContext['outputPage'] = 'questionnairePage';
  coreContext['outAssessmentPath'] = assessmentPath;
  coreContext['mraCss'] = mraCss;
  coreContext['assessment'] = assessment;
}

getQuestionnairePageFromNavigation = function(navigationInput) {
  outputTemplate = questionnaireTemplate;
  var assessment = importAssessment(assessmentPath);
  var prevQuestion = getQuestionFromNavigation(navigationInput);
  coreContext['question'] = prevQuestion;
  coreContext['answerInfo'] = getAnswerInfo(prevQuestion.questionId);
  coreContext['outputPage'] = 'questionnairePage';
  coreContext['outAssessmentPath'] = assessmentPath;
  coreContext['mraCss'] = mraCss;
  coreContext['assessment'] = assessment;
}


getMmpPage = function() {
  outputTemplate = mmpTemplate;
  coreContext['assessment'] = importAssessment(assessmentPath);
  coreContext['actionPlan'] = getMmpInfo();
  coreContext['answersCSV'] = answersToCSVString(coreContext['actionPlan']);
  coreContext['mraCss'] = mraCss;
  coreContext['outputPage'] = 'mmpPage';
  coreContext['outAssessmentPath'] = assessmentPath;
}


getSkippedPage = function(){
  outputTemplate = genericNavigationTemplate;
  // var subset = returnSkippedQuestions();
  var subset = returnQuestionSubset('skipped')

  coreContext['pageTitle'] = 'Skipped Questions';
  coreContext['navigation'] = getNavigationInfoSubset(subset);
  coreContext['outputPage'] = 'skippedPage';
  coreContext['outAssessmentPath'] = assessmentPath;
  coreContext['mraCss'] = mraCss;
}

getNotApplicablePage = function(){
  outputTemplate = genericNavigationTemplate;
  // var subset = returnNotApplicableQuestions();
  var subset = returnQuestionSubset('notApplicable')

  coreContext['pageTitle'] = 'Questions Marked Not Applicable';
  coreContext['navigation'] = getNavigationInfoSubset(subset);
  coreContext['outputPage'] = 'skippedPage';
  coreContext['outAssessmentPath'] = assessmentPath;
  coreContext['mraCss'] = mraCss;
}

getNavigationPage = function() {
  outputTemplate = navigationTemplate;
  coreContext['navigation'] = getNavigationInfo();
  coreContext['outputPage'] = 'navigationPage';
  coreContext['outAssessmentPath'] = assessmentPath;
  coreContext['mraCss'] = mraCss;
}

getHelpPage = function() {
  outputTemplate = helpTemplate;
  coreContext['assessment'] = {};
  coreContext['helpMenuItems'] = returnHelpItems();
  coreContext['outputPage'] = 'helpPage';
  coreContext['outAssessmentPath'] = assessmentPath;
  coreContext['mraCss'] = mraCss;
}

returnHelpItems = function() {

  if (isRunningInElectron) {
    return helpItems.filter(function(x) { return !x.helpType || x.helpType == "standalone" })
  } else {
    return helpItems.filter(function(x) { return !x.helpType || x.helpType == "dmc" })
  }

}

addQuestionToVisitList = function(questionId) {
  if (questionId) {
    assessmentDb.exec("DELETE FROM question_visit_history where question_id =\""+questionId+"\"");
    assessmentDb.run("INSERT INTO question_visit_history (question_id) values (?)",[questionId]);
  }
}

lastQuestionFromVisitList = function(questionId) {
  var lastVisit = assessmentDb.exec("SELECT question_id FROM question_visit_history ORDER BY id DESC LIMIT 1");
  if (lastVisit.length == 0) {
    return questionId
  } else {
    return lastVisit[0].values[0][0]
  }

}

removeQuestionFromVisitList = function(questionId) {
  var lastQuestion = lastQuestionFromVisitList(questionId)
  if (!!lastQuestion) {
    assessmentDb.exec("DELETE FROM question_visit_history WHERE question_id = "+lastQuestion);
  }

}

addTooltips = function(text) {
  if (Object.keys(ttDictionary).length === 0) {
    buildDictionary();
  }

  // var textArray = text.split(/\b/);
  var textArray = text.split(' ');
  textArray = clusterStringArray(textArray, ttTriggers, ttMultiWordMatches)

  for (i=0; i<textArray.length; i++) {
    textArray[i] = checkToolTipDictionary(textArray[i]);
  }

  text = textArray.join(' ');
  return text;
}

checkToolTipDictionary = function(text) {

  var ttAdder = new ToolTipAdder(text)
  ttAdder.separateText()

  if(typeof ttDictionary[ttAdder.text] === 'string' || ttDictionary[ttAdder.text] instanceof String){
    var tip = ttDictionary[ttAdder.text]
    tip = tip.replace(/"/g,'&quot;')

    var openTag = '<a href style="font-weight: bold;" data-toggle="tooltip" title="'+tip+'">'
    var closeTag = '</a>'

    ttAdder.text = openTag+ttAdder.text+closeTag
  }

  // return text;

  return ttAdder.updatedText()
}

buildDictionary = function() {
  //update acronyms and definitions, then combine in to dicitonary
  if(acronyms.length == 0){
    getAcronyms();
  }
  if(definitions.length == 0){
    getDefinitions();
  }

  acronyms.forEach(function(acronym){
    ttDictionary[acronym.acronym] = acronym.value
  })

  // coutner to keep the positions of the matches in sync
  var triggerCount = 0

  definitions.forEach(function(definition, index){
    definition.term  = stripAcronyms(definition.term)

    ttDictionary[definition.term] = definition.definition

    if (definition.term.split(' ').length > 1) {
      var triggerPositions = ttTriggers[definition.term.split(' ')[0]] || []
      triggerPositions.push(triggerCount)
      triggerCount++

      ttTriggers[definition.term.split(' ')[0]] = triggerPositions
      // ttMultiWordMatches.push(definition.term.split(/\b/))
      ttMultiWordMatches.push(definition.term.split(' '))
    }

  })
}

stripAcronyms = function(term) {
  var rx =  new RegExp(/ \([A-Z]+\)$/ig)
  return term.replace(rx,'')
}

clusterStringArray = function(stringAry, ttTriggers, ttMultiWordMatches){
  var i = 0;
  while(i<stringAry.length) {

    // if you hit a triggerword, start the check
    if (ttTriggers[stringAry[i]] && stringAry[i] != ' ') {
      var stringMatch = null
      // save the positions in ttMultiWordMatches that need to be checked
      //  for a match
      var positionsToCheck = ttTriggers[stringAry[i]]

      // loop over those positions and check if all the words match
      positionsToCheck.forEach(function(position, msIndex){
        var fullMatch=true;

        var matchArray = ttMultiWordMatches[position]

        matchArray.forEach(function(matchWord, mwIndex){
          if (matchWord != stringAry[i+mwIndex]) {
            fullMatch=false
          }
        })

        if(fullMatch) {
          stringMatch = matchArray
        }
      })

      if(stringMatch) {
        stringAry[i] = stringMatch.join(' ')
        stringAry.splice(i+1,stringMatch.length-1)
      }
    }
    i++
  }
  return stringAry;
}

//Create constructor to manage addign tooltips around punctuation, etc.
function ToolTipAdder(text) {
  this.textPrefix = null;
  this.text = text;
  this.textSuffix = null;

  // RegEx expressions for pulling out non-word character at beginning and end
  this.preRx = new RegExp(/^\W+/);
  this.sufRx = new RegExp(/\W+$/);
}

ToolTipAdder.prototype.separateText = function() {
  var prefix = this.preRx.exec(this.text)
  var suffix = this.sufRx.exec(this.text)

  if (prefix) {
    this.textPrefix = prefix[0]
    this.text = this.text.replace(prefix[0],'')
  }

  if (suffix && this.text.length>1) {
    this.textSuffix = suffix[0]
    this.text = this.text.replace(suffix[0],'')
  }


}

ToolTipAdder.prototype.updatedText = function() {
  //Build the updated string
  var outputString = ''
  if (this.textPrefix) { outputString+=this.textPrefix }
  outputString+=this.text
  if (this.textSuffix) { outputString+=this.textSuffix }

  return outputString
}

// Initialization
initializeCore();
