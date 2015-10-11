
var pdfexport = require('@tutor/pdfexport');
var fs = require('fs');

var cnt = 0;
module.exports = function(db, config){
  var inStoreLock = false;
  var inProcessingLock = false;

  Slave = {
    storeSolution: function(){
      if(inStoreLock) return false;
      var interval = setInterval(function(){
        inStoreLock = true;
        db.Manage.updateOldestSolution().catch(function(err){
          console.log("updated all solutions!", err);
          clearInterval(interval);
          inStoreLock = false;
        });
      }, 1000);
      return true;
    },
    processExercises: function(){
      if(inProcessingLock) return false;
      pdfexport("./template/template.html", function(converter) {
        var interval = setInterval(function(){
          if(inProcessingLock) return;
          db.Manage.lockUnprocessedSolutions().then(function(lock){
            inProcessingLock = true;
            var markdown = lock.tasks.reduce(function(acc, t){ return acc + "\n" + t.solution},"");
            converter(markdown, function(err, pdf){
              cnt++;
              var ws = fs.createWriteStream('./pdfs/example'+cnt+'.pdf');
              pdf.stream.pipe(ws);

              // allow further processing. NO recursion here and no
              // setTimeout here to avoid huge stacks!
              inProcessingLock = false;
            });
          }).catch(function(err){
            console.log("finished!", err);
            clearInterval(interval);
            inLock = false;
          });
        }, 1000);
      });
      return true;
    }
  };

  return Slave;
}
