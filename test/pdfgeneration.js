'use strict'
const chai = require('chai');
chai.should();

const streamToArray = require('stream-to-array');

let isReadableStream = (s) =>
  typeof s.pipe === 'function' && typeof s.resume === 'function'

describe("pdf processor", function() {
  const generatePdf = require('../src/pdf_processor');

  it("should generate a pdf", function() {
    this.timeout(30000);

    let exercise = {

    };

    let solution = {
      tasks: [{
        solution: 'a',
        description: '',
      }]
    };

    generatePdf(exercise, solution)
    .then(function(pdf) {
      isReadableStream(pdf.stream).should.be.true;

      streamToArray(pdf.stream).then(function(parts) {
        const PdfParser = require('pdf2json');
        let pdf = new PdfParser();
        pdf.on('pdfParser_dataReady', (data) => {
          data.PDFJS.pages.length.should.equal(1);
          done();
        });
        pdf.parseBuffer(Buffer.concat(parts));
      });
    });
  });
});
