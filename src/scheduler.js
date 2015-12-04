jobControl = require('./job_control');
_ = require('lodash');

var startJob = function(job) {
  control.scheduleJob(job.name, job.data, jobs[job.name]);
}

module.exports = function(slave, db, config) {
  jobs = require('./jobs')(slave, db, config);

  return {
    startAll: function() {
      var dbJobs = db.Jobs.getAllJobs();
      _.forEach(dbJobs, function(job) {
        startJob(job);
      });
    },
    isValidJob: function(name, data) {
      return jobs[name] !== undefined &&
             jobs[name] !== null &&
             jobControl.validateJobSpec(data);
    },
    addJob: function(name, type, data, cb) {
      if (type === undefined)
        type = "";
      db.Jobs.addJob(name, type, data).then(cb);
    },
    runJob: function(id, cb) {
      db.Jobs.getJob(id).then(function(job) {
        jobControl.scheduleJob(id, job.name, job.data, jobs[job.name]);
        cb(null, job);
      }).catch(function(err) {
        cb(err);
      });
    }
  }
}
