var schedule = require('node-schedule');
var cronParser = require('cron-parser');

var jobs = {};

function isValidDate(date) {
  // Taken from http://stackoverflow.com/a/12372720/1562178
  // If getTime() returns NaN it'll return false anyway
  return date.getTime() === date.getTime();
}

var cancelJobImpl = function(id) {
  if (jobs[id] !== undefined && jobs[id] !== null)
    jobs[id].cancel();
}

module.exports = {
  scheduleJob: function(id, spec, fn) {
    cancelJob(id);
    return jobs[id] = schedule.scheduleJob(spec, fn);
  },
  createRecurring: function() {
    return new schedule.RecurrenceRule();
  },
  cancelJob: function(id) {
    cancelJobImpl(id);
  },
  getJob: function(id) {
    return jobs[id];
  },
  validateJobSpec: function(spec) {
    try {
      var res = cronParser.parseExpression(spec);
      return true;
    } catch (err) {
      var type = typeof spec;
      if ((type === 'string') || (type === 'number')) {
        spec = new Date(spec);
        if ((spec instanceof Date) && (isValidDate(spec))) {
          return true;
        }
      } else if (type === 'object') {
        // if (!(spec instanceof RecurrenceRule))
        var hasAny = false;
        if ('year' in spec || 'month' in spec || 'date' in spec ||
            'dayOfWeek' in spec || 'hour' in spec || 'minute' in spec ||
            'second' in spec)
          hasAny = true;
        return hasAny;
      }
      return false;
    }
    return false; // unreachable?!
  }
}
