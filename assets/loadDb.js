// TODO - remove this file?
loadDb = function() {
  var sqlite3 = require('sqlite3').verbose();
  var db = new sqlite3.Database('criteria_with_level.db');
  var check;
  require('/home/cameron/workspace/mrafrontend/assets/criteriaQuestions');
  require('/home/cameron/workspace/mrafrontend/assets/acronyms');
  require('/home/cameron/workspace/mrafrontend/assets/definitions');
  // Load Acronyms
  db.serialize(function(){
    db.run("CREATE TABLE if not exists acronyms(acronym TEXT, value TEXT)");
    var stmt = db.prepare("INSERT INTO acronyms VALUES (?, ?)");
    for (var i = 0; i < acronyms.length; i++) {
        stmt.run(acronyms[i].acronym, acronyms[i].value);
//        console.log(acronyms[i]);
    }
    stmt.finalize();

    db.each("SELECT acronym, value FROM acronyms", function(err, row) {
//        console.log(row.acronym + ": "+row.value);
    });
  });

  // Load Definitions
  db.serialize(function(){
    db.run("CREATE TABLE if not exists definitions(term TEXT, definition TEXT)");
    var stmt = db.prepare("INSERT INTO definitions VALUES (?, ?)");
    for (var i = 0; i < definitions.length; i++) {
        stmt.run(definitions[i].term, definitions[i].definition);
      //  console.log(definitions[i]);
    }
    stmt.finalize();

    db.each("SELECT term, definition FROM definitions", function(err, row) {
    //    console.log(row.term + ": "+row.definition);
    });
  });

  // Load Criteria
  db.serialize(function(){

    db.run("CREATE TABLE if not exists version(version_id INTEGER, date TEXT, version_name TEXT)");
    db.run("CREATE TABLE if not exists thread(thread_id INTEGER, version_id INTEGER, name TEXT, help_text TEXT, thread_order INTEGER)");
    db.run("CREATE TABLE if not exists sub_thread(sub_thread_id INTEGER, thread_id INTEGER, name TEXT)");
    db.run("CREATE TABLE if not exists sub_thread_level(sub_thread_level_id INTEGER, sub_thread_id INTEGER, help_text TEXT, criteria_text TEXT, mrl_level INTEGER)");
    db.run("CREATE TABLE if not exists question(question_id INTEGER, sub_thread_level_id INTEGER, question_text TEXT, question_order INTEGER)");

    var versionStmt = db.prepare("INSERT INTO version VALUES (?, ?, ?)");
    var threadStmt = db.prepare("INSERT INTO thread VALUES (?, ?, ?, ?, ?)");
    var subThreadStmt = db.prepare("INSERT INTO sub_thread VALUES (?, ?, ?)");
    var subThreadLevelStmt = db.prepare("INSERT INTO sub_thread_level VALUES (?, ?, ?, ?, ?)");
    var questionStmt = db.prepare("INSERT INTO question VALUES (?, ?, ?, ?)");

    for (var i = 0; i < criteria.length; i++) {
        var version = criteria[i].versions[0];
        //console.log(version);
        versionStmt.run(version.versionId, version.date, version.versionNumber);
        versionStmt.finalize();
        var threads = version.threads;
        for(var j = 0; j<threads.length; j++){
          var thread = threads[j];
          //console.log(thread);
          threadStmt.run(thread.threadId, version.versionId, thread.name, thread.helpText, thread.threadOrder);
          var subThreads = thread.subThreads;
          for(var k = 0; k<subThreads.length; k++){
          //  console.log(subThreads);
            var subThread = subThreads[k];
            subThreadStmt.run(subThread.subThreadId, thread.threadId, subThread.name);
            var subThreadLevels = subThread.subThreadLevels;
            for(var l = 0; l<subThreadLevels.length; l++){
              var subThreadLevel = subThreadLevels[l];
        //      console.log(subThreadLevel);
              var mrlLevel = l+1;
              subThreadLevelStmt.run(subThreadLevel.subThreadLevelId, subThread.subThreadId, subThreadLevel.helpText, subThreadLevel.criteriaText, mrlLevel);
              var questions = subThreadLevel.questions;
              for(var m = 0; m<questions.length; m++){
                var question = questions[m];
                console.log(question);
                questionStmt.run(question.questionId, subThreadLevel.subThreadLevelId, question.questionText, question.order);
              }
            }
          }
        }
        questionStmt.finalize();
        subThreadLevelStmt.finalize();
        subThreadStmt.finalize();
        threadStmt.finalize();
        db.each("SELECT question_id, sub_thread_level_id, question_text, question_order FROM question", function(err, row) {
            console.log(row.question_id + ": "+row.sub_thread_level_id +":"+row.question_text + ":"+row.question_order);
        });

//        db.each("SELECT sub_thread_level_id, sub_thread_id, help_text, criteria_text FROM sub_thread_level", function(err, row) {
//            console.log(row.sub_thread_level_id + ": "+row.sub_thread_id +":"+row.help_text + ":"+row.criteria_text);
//        });

//        db.each("SELECT sub_thread_id, thread_id, name FROM sub_thread", function(err, row) {
//            console.log(row.sub_thread_id + ": "+row.thread_id +":"+row.name);
//        });
        //db.each("SELECT thread_id, version_id, name, help_text, thread_order FROM thread", function(err, row) {
//            console.log(row.thread_id + ": "+row.version_id +":"+row.name +":"+ row.help_text +":" + row.thread_order);
//        });
    }
//    db.each("SELECT version_id, date, version_name FROM version", function(err, row) {
      //  console.log(row.version_id + ": "+row.version_name +":"+row.date);
//    });
  });
  db.close();
}

loadDb();
