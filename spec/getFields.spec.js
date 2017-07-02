'use strict';
const specUtil = require('./util');


describe('tepez-pdf-tools, generating PDF fields report', () => {
  let spec;

  afterEach(() => spec = null);

  beforeEach(function () {
    spec = this;
  });

  specUtil.prepareSpecsAssets();
  specUtil.setJasmineTimeout(30000);

  beforeEach(() => {
    spec.pdfTools = require('..');
    spec.expectedFields = [
      {
        "name": "field1",
        "occurrences": "2",
        "type": "Text",
        "page": "1.0",
        "left": "90.72",
        "bottom": "742.56",
        "width": "136.92",
        "height": "12.840027",
        "font name": "Helvetica",
        "font size": "auto",
        "max length": "",
        "comb": "",
        "multi line": "",
        "alignemnt": "Left",
        "border color": "",
        "checkbox style": ""
      },
      {
        "name": "field1",
        "occurrences": "2",
        "type": "Text",
        "page": "1.0",
        "left": "367.2",
        "bottom": "742.56",
        "width": "137.03998",
        "height": "12.840027",
        "font name": "Helvetica",
        "font size": "auto",
        "max length": "",
        "comb": "",
        "multi line": "",
        "alignemnt": "Left",
        "border color": "",
        "checkbox style": ""
      },
      {
        "name": "field2",
        "occurrences": "2",
        "type": "Text",
        "page": "1.0",
        "left": "90.72",
        "bottom": "714.72",
        "width": "136.92",
        "height": "12.840027",
        "font name": "Helvetica",
        "font size": "auto",
        "max length": "",
        "comb": "",
        "multi line": "",
        "alignemnt": "Left",
        "border color": "",
        "checkbox style": ""
      },
      {
        "name": "field2",
        "occurrences": "2",
        "type": "Text",
        "page": "1.0",
        "left": "367.2",
        "bottom": "714.72",
        "width": "137.03998",
        "height": "12.840027",
        "font name": "Helvetica",
        "font size": "auto",
        "max length": "",
        "comb": "",
        "multi line": "",
        "alignemnt": "Left",
        "border color": "",
        "checkbox style": ""
      }
    ];
  });

  it('should resolve empty array when there are no fields', (done) => {
    spec.pdfTools({
      sourceContent: spec.sourceFiles.blank,
      getFields: true,
      nailgun: false,
      logFile: spec.logFilePath
    }).then((fields) => {
      expect(fields).toEqual([]);
    }).then(done, done.fail);
  });

  it('should work with sourceContent / without nailgun', (done) => {
    spec.pdfTools({
      sourceContent: spec.sourceFiles.text,
      getFields: true,
      nailgun: false,
      logFile: spec.logFilePath
    }).then((fields) => {
      expect(fields).toEqual(spec.expectedFields)
    }).then(done, done.fail);
  });

  it('should work with sourceContent / with nailgun', (done) => {
    spec.pdfTools({
      sourceContent: spec.sourceFiles.text,
      getFields: true,
      nailgun: true,
      logFile: spec.logFilePath
    }).then((fields) => {
      expect(fields).toEqual(spec.expectedFields)
    }).then(done, done.fail);
  });

  it('should work with sourcePath / without nailgun', (done) => {
    spec.pdfTools({
      sourcePath: specUtil.getAssetPath('src/text.pdf'),
      getFields: true,
      nailgun: false,
      logFile: spec.logFilePath
    }).then((fields) => {
      expect(fields).toEqual(spec.expectedFields)
    }).then(done, done.fail);
  });

  it('should work with sourcePath / with nailgun', (done) => {
    spec.pdfTools({
      sourcePath: specUtil.getAssetPath('src/text.pdf'),
      getFields: true,
      nailgun: true,
      logFile: spec.logFilePath
    }).then((fields) => {
      expect(fields).toEqual(spec.expectedFields)
    }).then(done, done.fail);
  });
});