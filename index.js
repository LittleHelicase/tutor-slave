var bodyParser = require('body-parser');

var config;
if(process.argv.length == 2){
  config = require("cson").load("config.cson");
} else {
  config = require("cson").load(process.argv[2]);
}

(require("./src/db")(config)).then(function(db){
  var express = require('express');
  var slave = require("./src/slave")(db,config);
  var scheduler = require('./src/scheduler')(slave, db, config);

  var app = express();

  app.use(bodyParser.json());

  app.get("/status", function(req, res){
    res.json({status: "up"});
  });

  app.get("/process/all", function(req, res){
    var processing = slave.processSolutions();
    res.json({processing: processing});
  });

  app.get("/process/:id", function(req, res){
    slave.processSpecificSolution(req.params.id, function(result, err) {
      res.json({result: result, error: err});
    });
  });

  app.get("/reset/:id", function(req, res) {
    slave.resetPdf(req.params.id, function(error) {
      res.json({reset: error === undefined, error: error});
    });
  });

  app.get("/test/:id", function (req, res) {
    slave.runTest(req.params.id, function(err, testResults) {
      var o = {testResults: testResults};
      if (err) {
        o.error = err;
      }
      res.json(o);
    });
  });

  app.get("/storeSolutions", function(req, res){
    var started = slave.storeSolutions();
    if(started){
      res.status(400).send("starting sharejs store operation").end();
    } else {
      res.status(400).send("sharejs store operation still in progress").end();
    }
  });

  app.get("/storeSolution/:id", function(req, res) {
    var cb = function(err, result) {
      if (err)
        res.json({error: err});
      else
        res.json({result: result});
    };
    if (!slave.storeSolution(req.params.id, cb))
      res.status(400).send("cannot store solution while a bulk store operation is in progress");
  });

  app.post("/job/add", function(req, res) {
      info = req.body;

      if (info.name === undefined || info.data === undefined) {
        res.status(400).send("you must specify name and data for the job").end();
        return;
      }

      if (info.type !== undefined && type != "recurring" && type != "cron" && type != "date") {
        res.status(400).send("the specified type is unknown / not valid").end();
        return;
      }

      if (!scheduler.isValidJob(info.name, info.data)) {
        res.status(400).send("job is not known, or data is not a valid cron string or was not accepted by node-schedule").end();
        return;
      }

      // ok everything good now!
      scheduler.addJob(info.name, info.type, info.data, function(changes){
        res.json({id: changes.generated_keys[0]});
      });
  });

  app.get("/job/run/:id", function(req, res) {
    info = req.body;

    // FIXME
    scheduler.runJob(req.params.id, function(err, job) {
      if (err !== null && err !== undefined)
        res.json(job);
      else
        res.status(400).send("could not start a job with id: " + req.params.id + "<br>is the id valid?");
    });
  });

  //schedule.scheduleJob(config.cron, function(){
  //  console.log("cron at ", config.cron);
  //});

  console.log("starting slave server on " + config.developmentPort);
  app.listen(config.developmentPort);
});
