
var pdfexport = require('@tutor/pdfexport');
var fs = require('fs');

module.exports = function(config){
  var db = require("./db")(config);
  Slave = {
    processExercises: function(){
      db.Manage.lockUnprocessedSolutions().then(function(lock){

        if(lock){
          console.log("lock");
          pdfexport(fs.readFileSync("./template-instance.html","utf8"), function(converter) {
            console.log(lock)
            var markdown = lock.solution[0];
            console.log("markdown conversion", markdown);
            converter(markdown, function(err, pdf){
              console.log("converted");
              console.log(err);
              var ws = fs.createWriteStream('./example.pdf');
              pdf.stream.pipe(ws);
              setTimeout(Slave.processExercises(),1000);
            });
          });
        }
      });
      return true;
    }
  };

  return Slave;
}
