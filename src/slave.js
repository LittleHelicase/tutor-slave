
var pdfexport = require('@tutor/pdfexport');
var fs = require('fs');
var _ = require('lodash');
var moreMarkdown = require('more-markdown');
var async = require('async');
jailed = require('jailed');

var cnt = 0;
module.exports = function(db, config){
  var perpetualStoreOnceFlag = false;
  var storeLock = false;
  var inProcessingLock = false;

  // merges markdown for a task
  mergeMarkdown = function(tests, solutionTests, userCode) {
    var merged = (tests || "") + "\n\n";
    merged += (solutionTests || "") + "\n\n";
    merged += (userCode || "");
    return merged
  }

  reduceTestResult = function(testResult) {
    delete testResult.test;
    return testResult;
  }

  /**
   *  taskIdx = index of the task in the solution array
   *  md = markdown including all tests and code.
   *  results = [DEP]
   *  cb = async callback (err, results)
   **/
  processMd = function(taskIdx, md, cb) {
    processors = [];

    var testProcessor  = require('@more-markdown/test-processor');
    var graphTestSuite = require('@tutor/graph-test-suite');
    var testSuite      = require('@tutor/test-suite');
    var testConfig     = require('./test_config.js');
    var curTests = {};
    var results;

    processors.push(testProcessor(["test", "tests"], {
      tests: [
        testSuite.itTests({
          registerTest: function(test) {
            curTests[test.name] = {
              name: test.name,
              status: "running",
              test: test.code,
              passes: undefined
            };
          },
          testResult: function(err, name) {
            curTests[name].passes = (err == null);
            curTests[name].status = "finished"
            curTests[name].error = err;
          },
          allResults: function(err) {
            results = _.map(curTests, function(t){
              if (t.status == "running") {
                t.status = err
              }
              if (!t.passes /* undefined or false */) {
                t.passes = false
              }
              return t
            });
          }
        }), testSuite.jsTests, graphTestSuite.collectGraphs, graphTestSuite.graphApi
      ],
      runner: {
        run: function() {
          var jailedSandbox  = require('@tutor/jailed-sandbox');
          return _.partial(jailedSandbox.run, _, _, {
            timeout: testConfig.runTimeout
          }).apply(undefined, arguments);
        },
        debug: function() {
          var jailedSandbox  = require('@tutor/jailed-sandbox');
          return _.partial(jailedSandbox.debug, _, _, {
            timeout: testConfig.debugTimeout
          }).apply(undefined, arguments);
        }
      },
      templates: {
        tests: testConfig.testProcessor.template
      }
    }));

    moreMarkdown.process(md, {
      processors: processors,
      html: false,
    }, function(err) {
      cb(err, results);
    });

  }

  var processSpecificSolutionImpl = function(solution, onFinish) {
    var converter = pdfexport("./template/template.html");
    var markdown = _.reduce(solution.tasks, function(acc, current){ return acc + "\n" + current.solution},"");
    converter(markdown, []).then(function(pdf) {
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
    resetAllPdf: function(callback) {
      db.Manage.resetPdfForAllSolutions().then(function() {
        callback();
      })
      .catch(function(err) {
        callback(err);
      });
    },
    storeAllSolutions: function() {
      db.Manage.storeAllSolutions().then(function() {
        console.log("finished");
      });

      return true;
    },
    storeAllFinalSolutions: function(sid) {
      db.Manage.storeAllFinalSolutions().then(function() {
        console.log("finished");
      });

      return true;
    },
    storeSolutionsForever: function() {
      if(perpetualStoreOnceFlag) return false;
      var interval = setInterval(function(){
        perpetualStoreOnceFlag = true;
        db.Manage.updateOldestSolution().catch(function(err){
          clearInterval(interval);
          perpetualStoreOnceFlag = false;
        });
      }, 1000);
      return true;
    },
    storeSolution: function(sid, cb) {
      db.Manage.storeSolution(sid).then(function(res) {
        cb(null, res);
      });
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
        if (solution === null)
          onFinish(false, null)
        else
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
            console.log("pdf processor finished");
            if (err)
              console.log("But an error occured :( ", err);
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

          var index = 0;
          async.map(
            exerciseTasks,
            function(item, cb) {
              var merged = mergeMarkdown(item.tests, item.solutionTests, solution.tasks[index].solution);
              processMd(++index, merged, cb);
            },
            function(err, results) {
              // fix format for database for easy merge.
              /* --- FORMAT ---
              [
                tests: [...], ...
              ]
              */
              results = _.map(results, function(result) {
                if (result === null || result === undefined)
                  result = [];
                return {
                  "tests": result
                }
              });

              db.Manage.storeTestResults(solutionId, results).then(function() {
                if (err)
                  callback(err, results);
                else
                  callback(null, results);
              });
            }
          );
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
