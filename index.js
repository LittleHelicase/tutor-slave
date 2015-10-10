
var config;
if(process.argv.length == 2){
  config = require("cson").load("config.cson");
} else {
  config = require("cson").load(process.argv[2]);
}
var express = require('express');
var schedule = require('node-schedule');
var slave = require("./src/slave")(config);

var app = express();

app.get("/status", function(req, res){
  res.json({status: "up"});
});

app.get("/process", function(req, res){
  debugger;
  var processing = slave.processExercises();
  res.json({processing: processing});
});

app.get("/storeSolutions", function(req, res){
  slave.storeSolutions();
  res.end("starting sharejs store operation");
});

//schedule.scheduleJob(config.cron, function(){
//  console.log("cron at ", config.cron);
//});

app.listen(8088);
