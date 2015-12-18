var schedule = require('node-schedule');

module.exports = function(slave, db, config) {
  return {
    printJob: function() {
      console.log("This is a test job");
    },
    storeAllSolutions: function() {
      slave.storeAllSolutions();
    },
    processSolutions: function() {
      slave.processSolutions();
    },
    storeSolutionsForever: function() {
      slave.storeSolutionsForever();
    }
  }
}
