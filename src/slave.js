
var pdfexport = require('@tutor/pdfexport');
var fs = require('fs');
var _ = require('lodash');
var moreMarkdown = require('more-markdown');

var cnt = 0;
module.exports = function(db, config){
  var inStoreLock = false;
  var inProcessingLock = false;

  // merges markdown for a task
  mergeMarkdown = function(tests, solutionTests, userCode) {
    var merged = (tests || "") + "\n\n";
    merged += (solutionTests || "") + "\n\n";
    merged += (userCode || "");
    return merged
  }

  processMd = function(md) {
    processors = [];

    var testProcessor  = require('more-markdown/test-processor');
    var graphTestSuite = require('@tutor/graph-test-suite');
    var testSuite      = require('@tutor/test-suite');

    processors.push(testProcessor(["test", "tests"], {
      tests: [
        testSuite.itTests({
          registerTest: config.testProcessor.register,
          testResult: config.testProcessor.testResult,
          allResults: config.testProcessor.testsFinished
        }), testSuite.jsTests, graphTestSuite.collectGraphs, graphTestSuite.graphApi, testSuite.debugLog
      ],
      runner: {
        run: function() {
          var jailedSandbox  = require('@tutor/jailed-sandbox');
          return _.partial(jailedSandbox.run, _, _, {
            timeout: config.runTimeout
          }).apply(undefined, arguments)
        },
        debug: function() {
          var jailedSandbox  = require('@tutor/jailed-sandbox');
          return _.partial(jailedSandbox.debug, _, _, {
            timeout: config.debugTimeout
          }).apply(undefined, arguments);
        }
      },
      templates: {
        tests: config.testProcessor.template
      }
    }));

    moreMarkdown.process(md, {
      processors: processors,
      html: false,

    })
  }

  runTaskTest = function(processedMd) {

  };

  processSpecificSolutionImpl = function(solution, onFinish) {
    pdfexport("./template/template.html", function(converter) {
      var markdown = solution.tasks.reduce(function(acc, current){ return acc + "\n" + current},"");
      converter(markdown, function(err, pdf){
        cnt++;
        require('stream-to-array')(pdf.stream).then(function (parts) {
          var buffers = [];
          for (var i = 0, l = parts.length; i < l ; ++i) {
            var part = parts[i]
            buffers.push((part instanceof Buffer) ? part : new Buffer(part))
          }
          db.Manage.insertFinishedPdf(solution.id, Buffer.concat(buffers));
        });

        onFinish(true);
      });
    });
  };

  Slave = {
    resetPdf: function(solutionId, callback) {
      db.Manage.resetPdfForSolution(solutionId).then(function() {
        callback();
      })
      .catch(function(err) {
        callback(err);
      });
    },
    storeSolution: function(){
      if(inStoreLock) return false;
      var interval = setInterval(function(){
        inStoreLock = true;
        db.Manage.updateOldestSolution().catch(function(err){
          clearInterval(interval);
          inStoreLock = false;
        });
      }, 1000);
      return true;
    },
    processSpecificSolution: function(solutionId, onFinish) {
      db.Manage.lockSpecificSolutionForPdfProcessor(solutionId).then(function(rdbChange) {
        if (rdbChange.replaced === 1) {
          return processSpecificSolutionImpl(rdbChange.changes[0].new_val, onFinish);
        }
        else {
          Slave.resetPdf(solutionId, function(err) {
            if (err) {
              onFinish(false, err);
            } else {
              db.Manage.lockSpecificSolutionForPdfProcessor(solutionId).then(function(rdbChange) {
                if (rdbChange.replaced !== 1)
                  onFinish(false, "could not update already processed solution after reset.");
                else
                  return processSpecificSolutionImpl(rdbChange.changes[0].new_val, onFinish);
              }).catch(function(err) {
                onFinish(false, "could not reset and update already processed solution.");
              })
            }
          })
        }
      }).catch(function(err) {
        onFinish(false, err);
      });
    },
    processSolution: function(onFinish) {
      db.Manage.lockSolutionForPdfProcessor().then(function(solution) {
        processSpecificSolutionImpl(solution, onFinish);
      }).catch(function(err) {
        onFinish(false, err);
      });
    },
    processSolutions: function() {
      if(inProcessingLock) return false;

      var interval = setInterval(function(){
        if(inProcessingLock) return;
        inProcessingLock = true;
        Slave.processSolution(function(moreData, err) {
          // allow further processing. NO recursion here and no
          // setTimeout here to avoid huge stacks!
          if (!moreData)
          {
            clearInterval(interval);
            console.log("finished!", err);
          }
          inProcessingLock = false;
        });
      }, 1000);
      return true;
    },
    // runs test of exercise
    runTest: function(solutionId, callback) {
      db.Manage.pluckSolution(solutionId, ["exercise", "tasks"]).then(function (solution) {
        db.Manage.getTestsFromExercise(solution.exercise).then(function (exerciseTasks) {

          for (var i = 0; i != exerciseTasks.length; ++i) {
            var merged = mergeMarkdown(exerciseTasks[i].tests, exerciseTasks[i].solutionTests, solution.tasks[i]);
            processMd(merged);
          }

          callback(null, exerciseTasks);
        }).catch(function(err) {
          callback(err);
        });
      }).catch(function(err) {
        callback("No such solution");
      });
    }
  };

  return Slave;
}
