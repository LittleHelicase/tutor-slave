var pdfexport = require('@tutor/pdfexport');
var _ = require('lodash');

var exerciseToMarkdown = (exercise, tasks) => {
  return `
# ${exercise.title}

${tasks}
  `;
}

var taskToMarkdown = (task, solution, points) => {
  var md = `## ${task.number} ${task.title}
${task.text}` + '   \n';

  if (points) {
    md += `*${points} of ${task.maxPoints} points*`;
  } else {
    md += `*${task.maxPoints} points*`;
  }

  md += `\n\n${solution}`;

  return md;
}

module.exports = function(exercise, solution) {
  var converter = pdfexport("./template/template.html");
  var points = solution.results ? solution.results.points : null;
  var tasksMarkdown = _.zip(exercise.tasks, solution.tasks.map(t => t.solution), points)
                      .map(args => taskToMarkdown(args[0], args[1], args[2]));
  var markdown = exerciseToMarkdown(exercise, _.reduce(tasksMarkdown, (acc, current) => `${acc}\n\n${current}`, ''));
  if (solution.results) {
    console.log('results', _.map(solution.results.pages, 'shapes'))
    return converter(markdown, _.map(solution.results.pages, 'shapes'));
  } else {
    return converter(markdown, []);
  }
};
