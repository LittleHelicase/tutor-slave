'use strict'
const PdfParser = require('pdf2json');
const streamToArray = require('stream-to-array');

module.exports = function(pdf) {
  return streamToArray(pdf.stream)
  .then(function(parts) {
    return new Promise(function(resolve, reject) {
      let pdf = new PdfParser();
      pdf.on('pdfParser_dataReady', resolve);
      pdf.on('pdfParser_dataError', reject);
      pdf.parseBuffer(Buffer.concat(parts));
    });
  });
}
