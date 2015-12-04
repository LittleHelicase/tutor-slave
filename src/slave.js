
var pdfexport = require('@tutor/pdfexport');
var fs = require('fs');
var _ = require('lodash');
var moreMarkdown = require('more-markdown');
var async = require('async');
jailed = require('jailed');

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

  processMd = function(taskIdx, md, result, cb) {
    processors = [];

    var testProcessor  = require('@more-markdown/test-processor');
    var graphTestSuite = require('@tutor/graph-test-suite');
    var testSuite      = require('@tutor/test-suite');
    var testConfig     = require('./test_config.js');

    processors.push(testProcessor(["test", "tests"], {
      tests: [
        testSuite.itTests({
          registerTest: function(name) {
            result[taskIdx].push({name: name, passes: false});
          },
          testResult: function(err, idx) {
            result[taskIdx] = {};
            result[taskIdx][idx].passes = (err == null);
          },
          allResults: function(results) {
            if (result[taskIdx] == undefined)
              result[taskIdx] = {};
            result[taskIdx].results = results;
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
    }, function(err) {cb()});

  }

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
    storeSolutions: function() {
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
    storeSolution: function(sid, cb) {
      if(inStoreLock) return false;
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

          var result = [];

          async.forEachOf(
            exerciseTasks,
            function(value, key, cb) {
              var merged = mergeMarkdown(exerciseTasks.tests, value.solutionTests, solution.tasks[key]);
              processMd(key, merged, result, cb);
            },
            function(err) {
              if (err)
                callback(err, result);
              else
                callback(null, result);
            }
          )
        })});/*).catch(function(err) {
          callback(err);
        });
      }).catch(function(err) {
        callback("No such solution");
      });
      */
    }
  };

  return Slave;
}
