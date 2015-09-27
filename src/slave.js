
var pdfexport = require('@tutor/pdfexport');
var fs = require('fs');

module.exports = function(config){
  var db = require("./db")(config);
  Slave = {
    processExercises: function(){
      db.Manage.lockUnprocessedSolutions().then(function(lock){

        if(lock){
          pdfexport("./template-instance.html", function(converter) {
            var markdown = lock.solution[0];
            converter(markdown, function(err, pdf){
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
