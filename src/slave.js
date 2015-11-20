
var pdfexport = require('@tutor/pdfexport');
var fs = require('fs');

var cnt = 0;
module.exports = function(db, config){
  var inStoreLock = false;
  var inProcessingLock = false;

  processSpecificExerciseImpl = function (solution, onFinish) {
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
    processSpecificExercise: function(solutionId, onFinish) {
      db.Manage.lockSpecificSolutionForPdfProcessor(solutionId).then(function(rdbChange) {
        if (rdbChange.replaced === 1) {
          return processSpecificExerciseImpl(rdbChange.changes[0].new_val, onFinish);
        }
        else {
          return Promise.reject()
        }
      }).catch(function(err) {
        onFinish(false, "id does not exist, or nothing was updated")
      });
    },
    processExercise: function(onFinish) {
      db.Manage.lockSolutionForPdfProcessor().then(function(solution) {
        processSpecificExerciseImpl(solution, onFinish);
      }).catch(function(err) {
        onFinish(false, err);
      });
    },
    processExercises: function() {
      if(inProcessingLock) return false;

      var interval = setInterval(function(){
        if(inProcessingLock) return;
        inProcessingLock = true;
        Slave.processExercise(function(moreData, err) {
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
    }
  };

  return Slave;
}
