
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
    processExercise: function(onFinish) {
      db.Manage.lockSolutionForPdfProcessor().then(function(solution) {
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

            // for testing purpose only for now
            var ws = fs.createWriteStream('./pdfs/example'+cnt+'.pdf');
            pdf.stream.pipe(ws);

            onFinish(true);
          });
        });
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
