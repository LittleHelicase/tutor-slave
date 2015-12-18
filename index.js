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

  app.get("/pdfs/processAll", function(req, res){
    var processing = slave.processSolutions();
    res.json({processing: processing});
  });

  // id = solutionId
  app.get("/pdfs/process/:id", function(req, res) {
    slave.processSpecificSolution(req.params.id, function(result, err) {
      res.json({result: result, error: err});
    });
  });

  // id = solutionId
  app.get("/pdfs/reset/:id", function(req, res) {
    slave.resetPdf(req.params.id, function(error) {
      res.json({reset: error === undefined, error: error});
    });
  });

  app.get("/pdfs/resetAll", function(req, res) {
    slave.resetAllPdf(function(error) {
      res.json({reset: error === undefined, error: error});
    })
  });

  // id = solutionId
  app.get("/tests/:id", function (req, res) {
    slave.runTest(req.params.id, function(err, testResults) {
      var o = {testResults: testResults};
      if (err) {
        o.error = err;
      }
      res.json(o);
    });
  });

  app.get("/solutions/store", function(req, res){
    var started = slave.storeAllSolutions();
    if(started){
      res.send("starting sharejs store operation").end();
    } else {
      res.status(400).send("sharejs store operation still in progress").end();
    }
  });

  // Warning: Could cause heavy load.
  app.get("/solutions/storeFinal", function(req, res) {
    slave.storeAllFinalSolutions();
    res.sendStatus(204);
  });

  // id = solutionId
  app.get("/solutions/store/:id", function(req, res) {
    var cb = function(err, result) {
      if (err)
        res.json({error: err});
      else
        res.json({result: result});
    };
    if (!slave.storeSolution(req.params.id, cb))
      res.status(400).send("cannot store solution while a bulk store operation is in progress");
  });

  /**
   *  A job consists of a function name (see jobs.js) which is to be executed
   *  and a job specification (called data) which specifies when to execute the job.
   *  Data accepts all formats that node-schedule accepts.
   *
   *  A job (identified by database id) can only run once per slave.
   *  But a slave can run multiple jobs of different id.
   */
  app.post("/jobs/add", function(req, res) {
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

  // id = jobId
  app.get("/jobs/run/:id", function(req, res) {
    info = req.body;

    scheduler.runJob(req.params.id, function(err, job) {
      if (err === null || err === undefined)
        res.json({job: job});
      else
        res.status(400).json({error: undefined});
    });
  });

  // id = jobId
  app.get("/jobs/cancel/:id", function(req, res) {
    // cancel a job only if its running
    scheduler.cancelJob(req.params.id);
  });

  console.log("starting slave server on " + config.developmentPort);
  app.listen(config.developmentPort);

  if (config.jobs.startAll === true) {
    console.log("starting all jobs");
    scheduler.startAll();
  }
});
