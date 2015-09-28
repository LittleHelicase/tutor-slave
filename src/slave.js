
var pdfexport = require('@tutor/pdfexport');
var fs = require('fs');

module.exports = function(config){
  var db = require("./db")(config);
  Slave = {
    processExercises: function(){
      var inLock = false;
      pdfexport("./template/template.html", function(converter) {
        var interval = setInterval(function(){
          if(inLock) return;
          db.Manage.lockUnprocessedSolutions().then(function(lock){
            inLock = true;
            var markdown = lock.solution[0];
            converter(markdown, function(err, pdf){
              
              var ws = fs.createWriteStream('./example.pdf');
              pdf.stream.pipe(ws);
              ws.close();
              
              
              // allow further processing. NO recursion here and no
              // setTimeout here to avoid huge stacks!
              inLock = false;
            });
          }).catch(function(){
            console.log("finished!");
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
