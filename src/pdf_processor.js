var pdfexport = require('@tutor/pdfexport');
var _ = require('lodash');

module.exports = function(exercise, solution) {
  var converter = pdfexport("./template/template.html");
  //TODO add points for each task to markdown, add task description
  var markdown = _.reduce(solution.tasks, function(acc, current){ return acc + "\n" + current.solution},"");
  //TODO to add corrections to the PDF, set the second parameter to `_.map(solution.result.pages, 'shapes')`
  return converter(markdown, []);
};
