
var config = require("cson").load("config.cson");
var express = require('express');
var schedule = require('node-schedule');
var slave = require("./src/slave")(config);

var app = express();

app.get("/status", function(req, res){
  res.json({status: "up"});
});

app.get("/process", function(req, res){
  var processing = slave.processExercises();
  res.json({processing: processing});
});

//schedule.scheduleJob(config.cron, function(){
//  console.log("cron at ", config.cron);
//});

app.listen(8088);
