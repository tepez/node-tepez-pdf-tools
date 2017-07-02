'use strict';
const specUtil = require('./util');


describe('tepez-pdf-tools, get attachments', () => {
  let spec;

  afterEach(() => spec = null);

  beforeEach(function () {
    spec = this;
  });

  specUtil.prepareSpecsAssets();
  specUtil.setJasmineTimeout(10000);

  beforeEach(() => {
    spec.pdfTools = require('..');
  });

  const runSpecs = () => {
    describe('when there are no attachments', () => {
      beforeEach(() => spec.expectedAttachments = []);

      it('should resolve to an empty array when using sourceContent', (done) => {
        spec.pdfToolsOpts.sourceContent = spec.sourceFiles.blank;

        spec.testGetAttachments().then(done, done.fail);
      });

      it('should resolve to an empty array when using sourcePath', (done) => {
        spec.pdfToolsOpts.sourcePath = specUtil.getAssetPath('src/blank.pdf');

        spec.testGetAttachments().then(done, done.fail);
      });
    });

    describe('when there are attachments', () => {
      beforeEach(() => spec.expectedAttachments = [
        {
          content: jasmine.any(String),
          desc: 'Cute cat 1',
          filename: 'image1.png',
          size: 59224
        },
        {
          content: jasmine.any(String),
          desc: '',
          filename: 'image2.jpg',
          size: 11428
        },
        {
          content: jasmine.any(String),
          desc: '',
          filename: 'image3.gif',
          size: 13260
        }
      ]);

      it('should resolve to attachments list when using sourceContent', (done) => {
        spec.pdfToolsOpts.sourceContent = spec.sourceFiles.attachments;

        spec.testGetAttachments().then(done, done.fail);
      });

      it('should resolve to attachments list empty array when using sourcePath', (done) => {
        spec.pdfToolsOpts.sourcePath = specUtil.getAssetPath('src/attachments.pdf');

        spec.testGetAttachments().then(done, done.fail);
      });
    });
  };

  beforeEach(() => {
    spec.pdfToolsOpts = {
      getAttachments: true,
      logFile: spec.logFilePath
    };

    spec.testGetAttachments = () => {
      return spec.pdfTools(spec.pdfToolsOpts).then((attachments) => {
        if (!spec.expectedAttachments) throw new Error('expectedAttachments was not set');
        expect(attachments).toEqual(spec.expectedAttachments);
      });
    }
  });

  describe('when NOT using nailgun', () => {
    beforeEach(() => {
      spec.pdfToolsOpts.nailgun = false;
    });

    runSpecs();
  });

  describe('when using nailgun', () => {
    beforeEach(() => {
      spec.pdfToolsOpts.nailgun = true;
    });

    runSpecs();
  });
});