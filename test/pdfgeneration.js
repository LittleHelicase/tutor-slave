'use strict'
const chai = require('chai');
chai.should();

let isReadableStream = (s) =>
  typeof s.pipe === 'function' && typeof s.resume === 'function'

describe("pdf processor", function() {
  const generatePdf = require('../src/pdf_processor');

  it("should generate a pdf", function() {
    this.timeout(30000);

    let exercise = {
      title: 'Demo exercise',
      tasks: [
        {
          number: 1,
          title: 'Demo task',
          text: 'Do something!',
          maxPoints: 42
        }
      ]
    };

    let solution = {
      tasks: [{
        solution: 'a',
        description: ''
      }]
    };

    return generatePdf(exercise, solution)
    .then(function(pdf) {
      isReadableStream(pdf.stream).should.be.true;
      return pdf;
    })
    .then(require('./readPdf'))
    .then(function(pdf) {
      pdf.PDFJS.pages.length.should.equal(1);
    });
  });

  it("should generate a pdf with corrections", function() {
    this.timeout(30000);

    let exercise = {
      title: 'Demo exercise',
      tasks: [
        {
          number: 1,
          title: 'Demo task',
          text: 'Do something!',
          maxPoints: 42
        }
      ]
    };

    let solution = {
      tasks: [{
        solution: 'a',
        description: '',
        results: {
          pages: [
            {"tool":"highlighter","color":"#f00","size":20,"events":[{"x":55,"y":114},{"x":55,"y":119},{"x":54,"y":121},{"x":54,"y":122},{"x":53,"y":124},{"x":53,"y":128},{"x":52,"y":130},{"x":52,"y":145},{"x":53,"y":146},{"x":53,"y":151},{"x":54,"y":152},{"x":55,"y":155},{"x":56,"y":156},{"x":57,"y":158},{"x":57,"y":160},{"x":58,"y":161},{"x":59,"y":163},{"x":59,"y":164},{"x":60,"y":166},{"x":62,"y":168},{"x":63,"y":170},{"x":65,"y":172},{"x":65,"y":173},{"x":67,"y":176},{"x":68,"y":176},{"x":70,"y":179},{"x":71,"y":180},{"x":73,"y":181},{"x":74,"y":183},{"x":80,"y":189},{"x":82,"y":190},{"x":83,"y":191},{"x":85,"y":191},{"x":86,"y":192},{"x":88,"y":193},{"x":91,"y":196},{"x":93,"y":196},{"x":97,"y":198},{"x":98,"y":199},{"x":102,"y":201},{"x":103,"y":201},{"x":106,"y":202},{"x":107,"y":202},{"x":110,"y":204},{"x":112,"y":204},{"x":115,"y":205},{"x":116,"y":206},{"x":120,"y":208},{"x":121,"y":209},{"x":125,"y":210},{"x":126,"y":210},{"x":132,"y":213},{"x":133,"y":214},{"x":136,"y":214},{"x":137,"y":215},{"x":139,"y":215},{"x":140,"y":216},{"x":143,"y":216},{"x":144,"y":217},{"x":146,"y":217},{"x":148,"y":219},{"x":150,"y":219},{"x":151,"y":220},{"x":156,"y":220},{"x":158,"y":221},{"x":168,"y":221},{"x":170,"y":222},{"x":187,"y":222},{"x":189,"y":221},{"x":190,"y":221},{"x":192,"y":220},{"x":194,"y":220},{"x":195,"y":219},{"x":197,"y":218},{"x":198,"y":218},{"x":199,"y":217},{"x":200,"y":217},{"x":201,"y":216},{"x":203,"y":216},{"x":204,"y":215},{"x":206,"y":214},{"x":212,"y":208},{"x":213,"y":208},{"x":215,"y":204},{"x":217,"y":202},{"x":217,"y":201},{"x":219,"y":200},{"x":220,"y":198},{"x":221,"y":197},{"x":223,"y":196},{"x":224,"y":195},{"x":225,"y":193},{"x":226,"y":192},{"x":227,"y":190},{"x":228,"y":189},{"x":229,"y":186},{"x":230,"y":185},{"x":232,"y":181},{"x":233,"y":180},{"x":234,"y":178},{"x":234,"y":177},{"x":235,"y":175},{"x":236,"y":174},{"x":236,"y":171},{"x":238,"y":168},{"x":238,"y":166},{"x":239,"y":163},{"x":239,"y":161},{"x":241,"y":154},{"x":241,"y":145},{"x":240,"y":141},{"x":240,"y":134},{"x":239,"y":132},{"x":237,"y":126},{"x":237,"y":122},{"x":236,"y":120},{"x":236,"y":116},{"x":235,"y":116},{"x":235,"y":109}]},{"tool":"highlighter","color":"#f00","size":20,"events":[{"x":124,"y":66},{"x":124,"y":74},{"x":125,"y":78},{"x":125,"y":82},{"x":126,"y":84},{"x":126,"y":89},{"x":127,"y":93},{"x":127,"y":95},{"x":129,"y":102},{"x":129,"y":105},{"x":131,"y":113},{"x":131,"y":121},{"x":132,"y":123},{"x":132,"y":128}]},{"tool":"highlighter","color":"#f00","size":20,"events":[{"x":168,"y":61},{"x":168,"y":63},{"x":167,"y":64},{"x":167,"y":65},{"x":166,"y":66},{"x":166,"y":69},{"x":165,"y":71},{"x":165,"y":75},{"x":164,"y":78},{"x":164,"y":87},{"x":163,"y":91},{"x":163,"y":123},{"x":164,"y":124},{"x":164,"y":127},{"x":165,"y":128},{"x":165,"y":130},{"x":166,"y":131},{"x":166,"y":132},{"x":167,"y":135},{"x":167,"y":136},{"x":168,"y":137},{"x":168,"y":138}]},{"tool":"text","color":"#f00","size":20,"events":[{"text":"some wild red\ntext xD","x":57,"y":290}]}
          ],
          points: [
            21
          ]
        }
      }]
    };

    return generatePdf(exercise, solution)
    .then(function(pdf) {
      isReadableStream(pdf.stream).should.be.true;
      return pdf;
    })
    .then(require('./readPdf'))
    .then(function(pdf) {
      pdf.PDFJS.pages.length.should.equal(1);
    });
  });
});
