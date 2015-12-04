var schedule = require('node-schedule');

module.exports = function(slave, db, config) {
  return {
    printJob: function() {
      console.log("Hello!");
    }
  }
}
