// var fs = require('fs');
var path = require('path');
var _ = require('lodash');

var defaultConfig = {
  runTimeout: 5 * 60 * 1000,
  debugTimeout: 2 * 60 * 1000,
  /*
  codeControls: {
    template: _.template(fs.readFileSync(path.join(__dirname, 'js_controls.html'), 'utf8'))
  },
  */
  dotProcessor: {
    baseSVGTemplate: _.template("<svg data-element-id=\"<%= id %>\"><g/></svg>"),
    errorTemplate: _.template("<p style='background-color:red'><%= error %></p>")
  },
  testProcessor: {
    registerTest: _.noop,
    testResult: _.noop,
    testsFinished: _.noop,
    template: _.template("<h1>Tests</h1><ul data-element-id=\"<%= id %>\"></ul>")
  },
  treeProcessor: false
};

module.exports = defaultConfig;
