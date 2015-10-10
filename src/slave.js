
var pdfexport = require('@tutor/pdfexport');
var fs = require('fs');

var cnt = 0;
module.exports = function(db, config){
  Slave = {
    storeSolution: function(){
      db.Manage.updateOldestSolution();
    },
    processExercises: function(){
      var inLock = false;
      pdfexport("./template/template.html", function(converter) {
        var interval = setInterval(function(){
          if(inLock) return;
          db.Manage.lockUnprocessedSolutions().then(function(lock){
            inLock = true;
            var markdown = lock.tasks.reduce(function(acc, t){ return acc + "\n" + t.solution},"");
            converter(markdown, function(err, pdf){
              cnt++;
              var ws = fs.createWriteStream('./pdfs/example'+cnt+'.pdf');
              pdf.stream.pipe(ws);
              
              // allow further processing. NO recursion here and no
              // setTimeout here to avoid huge stacks!
              inLock = false;
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
