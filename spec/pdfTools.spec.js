'use strict';
const specUtil = require('./util');
const Path = require('path');
const _ = require('lodash');
const Bluebird = require('bluebird');
const Fs = require('fs');
const Tmp = require('tmp');
const Joi = require('joi');
const Mockery = require('mockery');
const MockSpawn = require('mock-spawn');


Bluebird.promisifyAll(Tmp,{multiArgs: true});

const logFilePath = Path.join(__dirname, '../tepez-pdf-tools.log');

describe('tepez-pdf-tools', () => {
  let spec;

  afterEach(() => spec = null);

  beforeEach(function () {
    spec = this;
  });

  let sourceFiles, expectedFiles, imageFiles;

  beforeAll((done) => {
    jasmine.getEnv().imageDiffTester.initDirectories().jasmineDone(done);
  });

  afterAll(() => {
    sourceFiles = expectedFiles = imageFiles = null;
  });

  beforeAll((done) => {
    specUtil.clearResultDirectory().jasmineDone(done);
  });

  // read source files
  beforeAll((done) => {
    specUtil.readDirectory('src').then((files) => {
      sourceFiles = files;
    }).jasmineDone(done);
  });

  // read expected files
  beforeAll((done) => {
    specUtil.readDirectory('expected').then((files) => {
      expectedFiles = files;
    }).jasmineDone(done);
  });

  // read image files
  beforeAll((done) => {
    specUtil.readDirectory('img').then((files) => {
      // encode each image as base64
      _.forEach(files, (contet, key) => {
        files[key] = new Buffer(contet).toString('base64');
      });
      imageFiles = files;
    }).jasmineDone(done);
  });

  describe('options', () => {
    beforeEach(() => {
      spec.spawn = MockSpawn(true);
      Mockery.enable({ useCleanCache: true });
      Mockery.warnOnUnregistered(false);
      Mockery.registerMock('child_process', { spawn: spec.spawn });
      spec.pdfTools = require('..');
    });

    afterEach(() => {
      Mockery.resetCache();
      Mockery.disable();
    });

    describe('when sourcePath and sourceContent are given', () => {
      it('should throw an error', () => {
        expect(() => {
          spec.pdfTools({
            sourcePath: specUtil.getAssetPath('src.pdf'),
            sourceContent: sourceFiles.blank
          });
        }).toThrowError(Error, /"value" contains a conflict between exclusive peers \[sourcePath, sourceContent]/);
      });
    });

    describe('when certpass is given without cert', () => {
      it('should throw an error', () => {
        expect(() => {
          spec.pdfTools({
            sourceContent: sourceFiles.blank,
            certpass: 'password'
          });
        }).toThrowError(Error);
      });
    });

    describe('when certformat is given without cert', () => {
      it('should throw an error', () => {
        expect(() => {
          spec.pdfTools({
            sourceContent: sourceFiles.blank,
            certformat: 'pkcs12'
          });
        }).toThrowError(Error);
      });
    });

    describe('language', () => {
      it('should pass the language option when given', () => {
        spec.pdfTools({
          sourceContent: sourceFiles.blank,
          language: 'en-US'
        });
        expect(spec.spawn.calls.length).toBe(1);
        expect(spec.spawn.calls[0].args.indexOf('--language')).toBeGreaterThan(0);
        expect(spec.spawn.calls[0].args.indexOf('en-US')).toBe(spec.spawn.calls[0].args.indexOf('--language') + 1);
      });

      it('should NOT pass the language option NOT when given', () => {
        spec.pdfTools({
          sourceContent: sourceFiles.blank
        });
        expect(spec.spawn.calls.length).toBe(1);
        expect(spec.spawn.calls[0].args.indexOf('--language')).toBe(-1);
        expect(spec.spawn.calls[0].args.indexOf('en-US')).toBe(-1);
      });
    });
  });

  describe('created files', () => {
    beforeEach(() => {
      spec.origDefaultTimeoutInterval = jasmine.DEFAULT_TIMEOUT_INTERVAL;
      jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;
    });

    afterEach(() => {
      jasmine.DEFAULT_TIMEOUT_INTERVAL = spec.origDefaultTimeoutInterval;
    });

    beforeEach(() => {
      spec.pdfTools = require('..');
    });

    [
      {
        name: 'sourcePath',
        expected: 'textValid',
        desc: 'when source is given using sourcePath',
        data: [
          { type: 'text', key:'field1', value: 'value 1' },
          { type: 'text', key:'field2', value: 'value 2' }
        ],
        options: () => { return {
          sourcePath: specUtil.getAssetPath('src/text.pdf')
        }; }
      },
      {
        name: 'textValid',
        expected: 'textValid',
        desc: 'text - type is omitted',
        data: [
          { type: 'text', key:'field1', value: 'value 1' },
          { type: 'text', key:'field2', value: 'value 2' }
        ],
        options: () => { return {
          sourceContent: sourceFiles.text
        }; }
      },
      {
        name: 'textOmittedType',
        expected: 'textValid',
        desc: 'text - type is omitted (text is default type)',
        data: [
          { key:'field1', value: 'value 1' },
          { key:'field2', value: 'value 2' }
        ],
        options: () => { return {
          sourceContent: sourceFiles.text
        }; }
      },
      {
        name: 'textWrongType',
        expected: 'textNoValue',
        desc: 'text - wrong type (checkbox instead of text)',
        data: [
          { type: 'checkbox', key:'field1', value: true },
          { type: 'checkbox', key:'field2', value: 'xxx' }
        ],
        options: () => { return {
          sourceContent: sourceFiles.text
        }; }
      },
      {
        name: 'textNoValue',
        expected: 'textNoValue',
        desc: 'text - no value',
        data: [],
        options: () => { return {
          sourceContent: sourceFiles.text
        }; }
      },
      {
        name: 'checkboxChecked',
        expected: 'checkboxChecked',
        desc: 'checkbox - checked',
        data: [ { type: 'checkbox', key:'checkbox', value: true } ],
        options: () => { return {
          sourceContent: sourceFiles.checkbox
        }; }
      },
      {
        name: 'checkboxNotChecked',
        expected: 'checkboxNotChecked',
        desc: 'checkbox - not checked',
        data: [ { type: 'checkbox', key:'checkbox', value: false } ],
        options: () => { return {
          sourceContent: sourceFiles.checkbox
        }; }
      },
      {
        name: 'checkboxWrongType',
        expected: 'checkboxNotChecked',
        desc: 'checkbox - wrong type (text instead of checkbox)',
        data: [ { type: 'text', key:'checkbox', value: 'xxx' } ],
        options: () => { return {
          sourceContent: sourceFiles.checkbox
        }; }
      },
      {
        name: 'checkboxInvalidValue',
        expected: 'checkboxNotChecked',
        desc: 'checkbox - invalid value (string instead of true/false)',
        data: [ { type: 'checkbox', key:'checkbox', value: 'xxx' } ],
        options: () => { return {
          sourceContent: sourceFiles.checkbox
        }; }
      },
      {
        name: 'checkboxNoValue',
        expected: 'checkboxNotChecked',
        desc: 'checkbox - no value',
        data: [],
        options: () => { return {
          sourceContent: sourceFiles.checkbox
        }; }
      },
      {
        name: 'imagePath',
        expected: 'imagePath',
        desc: 'image by path',
        options: () => { return {
          sourceContent: sourceFiles.image
        }; },
        data: [
          { type: 'img',  key: 'image', path: specUtil.getAssetPath('img/image.png') }
        ]
      },
      {
        name: 'imageContent',
        expected: 'imageContent',
        desc: 'image by content',
        options: () => { return {
          sourceContent: sourceFiles.image
        }; },
        data: () => { return [
          { type: 'img',  key: 'image', content: imageFiles.image2 }
        ]; }
      },
      {
        name: 'imageNewPagePath',
        expected: 'imageNewPagePath',
        desc: 'image by path on a new page',
        expectedPagesNum: 4,
        options: () => { return {
          sourceContent: sourceFiles.blank
        }; },
        data: [
          {
            type: 'img',
            path: specUtil.getAssetPath('img/image.png'),
            placement: 'new-page',
            'max-width': 75
          },
          {
            type: 'img',
            path: specUtil.getAssetPath('img/image2.jpg'),
            placement: 'new-page'
            // max-width should default to 0.5
          },
          {
            type: 'img',
            path: specUtil.getAssetPath('img/image3.gif'),
            placement: 'new-page',
            'max-width': 25
          }
        ]
      },
      {
        name: 'imageNewPageContent',
        expected: 'imageNewPageContent',
        desc: 'image by content on a new page',
        expectedPagesNum: 4,
        options: () => { return {
          sourceContent: sourceFiles.blank
        }; },
        data: () => { return [
          {
            type: 'img',
            content: imageFiles.image,
            placement: 'new-page',
            'max-width': 75
          },
          {
            type: 'img',
            content: imageFiles.image2,
            placement: 'new-page'
            // max-width should default to 0.5
          },
          {
            type: 'img',
            content: imageFiles.image3,
            placement: 'new-page',
            'max-width': 25
          }
        ]; }
      },
      {
        name: 'attachmentPath',
        expected: 'attachmentPath',
        desc: 'attachment by path (no desc and no fileDisplay)',
        compareBytes: true,
        expectedByesMatchRate: 0.997,
        options: () => { return {
          sourceContent: sourceFiles.blank
        }; },
        data: [
          { type: 'attachment',  path: specUtil.getAssetPath('img/image.png') },
          { type: 'attachment',  path: specUtil.getAssetPath('img/image2.jpg') }
        ]
      },
      {
        name: 'attachmentPathDesc',
        expected: 'attachmentPathDesc',
        compareBytes: true,
        expectedByesMatchRate: 0.98,
        desc: 'attachment by path, with desc (no fileDisplay)',
        options: () => { return {
          sourceContent: sourceFiles.blank
        }; },
        data: [
          {
            type: 'attachment',
            path: specUtil.getAssetPath('img/image.png'),
            desc: 'mock file description'
          },
          {
            type: 'attachment',
            path: specUtil.getAssetPath('img/image2.jpg'),
            desc: 'mock file description 2'
          }
        ]
      },
      {
        name: 'attachmentPathFileDisplay',
        expected: 'attachmentPathFileDisplay',
        compareBytes: true,
        expectedByesMatchRate: 0.98,
        desc: 'attachment by path, with fileDisplay (no desc)',
        options: () => { return {
          sourceContent: sourceFiles.blank
        }; },
        data: [
          {
            type: 'attachment',
            path: specUtil.getAssetPath('img/image.png'),
            fileDisplay: 'mockFileDisplay.png'
          },
          {
            type: 'attachment',
            path: specUtil.getAssetPath('img/image2.jpg'),
            fileDisplay: 'mockFileDisplay.jpg'
          }
        ]
      },
      {
        name: 'attachmentPathDescFileDisplay',
        expected: 'attachmentPathDescFileDisplay',
        compareBytes: true,
        expectedByesMatchRate: 0.98,
        desc: 'attachment by path, with fileDisplay and desc',
        options: () => { return {
          sourceContent: sourceFiles.blank
        }; },
        data: [
          {
            type: 'attachment',
            path: specUtil.getAssetPath('img/image.png'),
            fileDisplay: 'mockFileDisplay.png',
            desc: 'mock file description'
          },
          {
            type: 'attachment',
            path: specUtil.getAssetPath('img/image2.jpg'),
            fileDisplay: 'mockFileDisplay.jpg',
            desc: 'mock file description 2'
          }
        ]
      },
      {
        name: 'attachmentContent',
        expected: 'attachmentContent',
        compareBytes: true,
        expectedByesMatchRate: 0.996,
        desc: 'attachment by content (no desc and no fileDisplay) - should skip field since we cannot determine a displayName',
        options: () => { return {
          sourceContent: sourceFiles.blank
        }; },
        data: () => { return [ {
          type: 'attachment',
          content: imageFiles.image
        } ]; }
      },
      {
        name: 'attachmentContentDesc',
        expected: 'attachmentContentDesc',
        compareBytes: true,
        expectedByesMatchRate: 0.996,
        desc: 'attachment by content, with desc (no fileDisplay) - should skip field since we cannot determine a displayName',
        options: () => { return {
          sourceContent: sourceFiles.blank
        }; },
        data: () => { return [ {
          type: 'attachment',
          content: imageFiles.image,
          desc: 'mock file description'
        } ]; }
      },
      {
        name: 'attachmentContentFileDisplay',
        expected: 'attachmentContentFileDisplay',
        compareBytes: true,
        expectedByesMatchRate: 0.98,
        desc: 'attachment by content, with fileDisplay (no desc)',
        options: () => { return {
          sourceContent: sourceFiles.blank
        }; },
        data: () => { return [ {
          type: 'attachment',
          content: imageFiles.image,
          fileDisplay: 'mockFileDisplay.png'
        } ]; }
      },
      {
        name: 'attachmentContentDescFileDisplay',
        expected: 'attachmentContentDescFileDisplay',
        compareBytes: true,
        expectedByesMatchRate: 0.98,
        desc: 'attachment by content, with fileDisplay and desc',
        options: () => { return {
          sourceContent: sourceFiles.blank
        }; },
        data: () => { return [ {
          type: 'attachment',
          content: imageFiles.image,
          fileDisplay: 'mockFileDisplay.png',
          desc: 'mock file description'
        } ]; }
      },
      {
        name: 'signed',
        expected: 'signed',
        compareBytes: true,
        expectedByesMatchRate: 0.98,
        desc: 'should digitally sign file with certificate at cert',
        options: () => { return {
          sourceContent: sourceFiles.text,
          cert: specUtil.getAssetPath('certificate.pfx'),
          certpass: 'password',
          certformat: 'pkcs12'
        }; },
        data: [
          { type: 'text', key:'field1', value: 'value 1' },
          { type: 'text', key:'field2', value: 'value 2' }
        ]
      },
      {
        name: 'signedNoCertFormat',
        expected: 'signed',
        compareBytes: true,
        expectedByesMatchRate: 0.98,
        desc: 'certformat should default to pkcs12',
        options: () => { return {
          sourceContent: sourceFiles.text,
          cert: specUtil.getAssetPath('certificate.pfx'),
          certpass: 'password'
        }; },
        data: [
          { type: 'text', key:'field1', value: 'value 1' },
          { type: 'text', key:'field2', value: 'value 2' }
        ]
      },
      {
        name: 'fontPath',
        expected: 'fontPath',
        desc: 'should use font as path for substitution font',
        options: () => { return {
          sourceContent: sourceFiles.text,
          // font downloaded from http://www.cunliffethompson.com/font/download.html
          font: specUtil.getAssetPath('shuneet_03_book_v21.OTF')
        }; },
        data: [
          { type: 'text', key:'field1', value: 'בלה בלה בלה' },
          { type: 'text', key:'field2', value: 'ידה ידה ידה' }
        ]
      },
      {
        name: 'fontEmbedded',
        expected: 'fontEmbedded',
        desc: 'when font is arialuni.ttf, should use arialuni.ttf embedded in jar',
        options: () => { return {
          sourceContent: sourceFiles.text,
          font: 'arialuni.ttf'
        }; },
        data: [
          { type: 'text', key:'field1', value: 'בלה בלה בלה' },
          { type: 'text', key:'field2', value: 'ידה ידה ידה' }
        ]
      }
    ].forEach((specOpts, specIdx) => {
      Joi.assert(specOpts, Joi.object().keys({
        name: Joi.string().required(),
        expected: Joi.string().required(),
        desc: Joi.string().required(),
        compareBytes: Joi.boolean(),
        expectedByesMatchRate: Joi.number().min(0.98).max(1),
        expectedPagesNum: Joi.number().integer().min(1),
        options: Joi.func().required(),
        data: Joi.alternatives().try(
            Joi.array(),
            Joi.func()
        ).required()
      }));

      function runTest(useNailgun, done) {
        const resBuffers = [];

        const pdfToolsOptions = {
          data: spec.dataFilePath,
          nailgun: useNailgun,
          logLevel: 'INFO',
          logFile: logFilePath
        };

        if (specOpts.options) {
          _.assign(pdfToolsOptions, specOpts.options.call(this));
        }

        const stdout = spec.pdfTools(pdfToolsOptions, (err) => {
          const res = Buffer.concat(resBuffers);
          expect(err).toBe(null);

          const resPath = Path.join(__dirname, 'results', specOpts.name + (useNailgun ? '-nailgun' : '') + '.pdf');

          let imageDiffTester = jasmine.getEnv().imageDiffTester;

          const expectedPagesNum = specOpts.expectedPagesNum || 1;

          // Take each page of the PDF as a separate image
          Bluebird.map(_.range(0, expectedPagesNum), (pageNum) => {

            const pngStream = specUtil.pdfToPng(res, pageNum);
            return imageDiffTester.imageTaken(`${specOpts.name}-${pageNum}`, pngStream)

          }).then(() => {
            Fs.writeFileSync(resPath, res);

            if (specOpts.compareBytes) {

              const expected = expectedFiles[specOpts.expected];
              const expectedByesMatchRate = specOpts.expectedByesMatchRate || 0.98;

              // check how much the expected and the result files are common
              const matchRate = specUtil.getMatchRate(res, expected);

              //console.log(matchRate);

              // if not almost identical (except for dates that change every time we generate)
              // write the file that we got so we can inspect it
              if (matchRate <= expectedByesMatchRate) {
                console.log(`Check out ${resPath} to figure out what is wrong with it`);
              }

              // it's important not to do the expectations before, because that would raise an
              // error and we won't have the pdf file in the result dir to inspect
              expect(res.length).toBe(expected ? expected.length : -1);
              expect(matchRate).toBeGreaterThan(expectedByesMatchRate);
            }
          }).jasmineDone(done);
        });

        stdout.on('data',(buffer) => {
          resBuffers.push(buffer);
        });
      }

      const describeFn = specOpts.fit ? fdescribe : describe;
      describeFn(`${specOpts.desc} (spec ${specIdx} )`, () => {
        // Create a temporary file with the field data
        beforeEach((done) => {
          let data = specOpts.data;
          if (_.isFunction(specOpts.data)) {
            data = specOpts.data.call(this);
          }

          Tmp.fileAsync('tepez-pdf-tools-test').spread((path, fd) => {
            spec.dataFilePath = path;
            Fs.writeSync(fd, JSON.stringify(data));
            Fs.closeSync(fd);
          }).delay(1000).jasmineDone(done);
        });

        it('normal execution', (done) => {
          runTest(false, done);
        });

        it('using nailgun', (done) => {
          runTest(true, done);
        });
      });
    });
  });

  it('should have created only a single log file and release it', () => {
    expect(Fs.lstatSync(logFilePath).isFile()).toBe(true);
    expect(() => { Fs.lstatSync(`${logFilePath}.lck`); }).toThrow();
    expect(() => { Fs.lstatSync(`${logFilePath}.1`); }).toThrow();
    expect(() => { Fs.lstatSync(`${logFilePath}.1.lck`); }).toThrow();
  });
});