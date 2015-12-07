var schedule = require('node-schedule');

module.exports = function(slave, db, config) {
  return {
    printJob: function() {
      console.log("This is a test job");
    },
    storeSolutions: function() {
      slave.storeSolutions();
    },
    processSolutions: function() {
      slave.processSolutions();
    }
  }
}
