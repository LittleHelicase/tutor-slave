
var config;
if(process.argv.length == 2){
  config = require("cson").load("config.cson");
} else {
  config = require("cson").load(process.argv[2]);
}

(require("./src/db")(config)).then(function(db){
  var express = require('express');
  var schedule = require('node-schedule');
  var slave = require("./src/slave")(db,config);

  var app = express();

  app.get("/status", function(req, res){
    res.json({status: "up"});
  });

  app.get("/process/all", function(req, res){
    var processing = slave.processExercises();
    res.json({processing: processing});
  });

  app.get("/process/:id", function(req, res){
    slave.processSpecificExercise(req.params.id, function(result, err) {
      res.json({result: result, error: err});
    });
  });

  app.get("/reset/:id", function(req, res) {
    slave.resetPdf(req.params.id, function(error) {
      res.json({reset: error === undefined, error: error});
    });
  });

  app.get("/storeSolutions", function(req, res){
    var started = slave.storeSolution();
    if(started){
      res.end("starting sharejs store operation");
    } else {
      res.end("sharejs store operation still in progress");
    }
  });

  //schedule.scheduleJob(config.cron, function(){
  //  console.log("cron at ", config.cron);
  //});

  console.log("starting slave server on " + config.developmentPort);
  app.listen(config.developmentPort);
});
